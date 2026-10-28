# ==============================================================================
# Dynamic AMIs & Shared Secrets
# ==============================================================================

# Latest official Canonical Ubuntu 24.04 LTS (Noble Numbat) AMI from AWS SSM
data "aws_ssm_parameter" "ubuntu_ami" {
  name = "/aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id"
}

# Auto-generate secure cluster join token if not explicitly provided
resource "random_password" "k3s_token" {
  length  = 32
  special = false
}

locals {
  k3s_token = var.k3s_token != "" ? var.k3s_token : random_password.k3s_token.result
}

# ==============================================================================
# Node 1: K3s Master / Data Node (Control Plane + Stateful Storage)
# ==============================================================================

resource "aws_instance" "k3s_master" {
  ami                  = data.aws_ssm_parameter.ubuntu_ami.value
  instance_type        = var.master_instance_type
  subnet_id            = aws_subnet.public_a.id
  iam_instance_profile = aws_iam_instance_profile.ec2_node.name

  vpc_security_group_ids = [
    aws_security_group.cluster.id
  ]

  root_block_device {
    volume_size           = 30
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
    tags = {
      Name = "foc-${var.environment}-master-root"
    }
  }

  user_data = <<-EOF
              #!/bin/bash
              set -ex

              # Update system and install utilities
              apt-get update
              apt-get install -y curl e2fsprogs nvme-cli net-tools

              # Locate attached EBS data volume (/dev/nvme1n1 or /dev/xvdf)
              DATA_DEV=""
              for dev in /dev/nvme1n1 /dev/xvdf /dev/sdf; do
                if [ -b "$dev" ]; then
                  DATA_DEV="$dev"
                  break
                fi
              done

              # Format and mount persistent EBS volume to /var/foc-data
              if [ -n "$DATA_DEV" ]; then
                if ! blkid "$DATA_DEV" | grep -q 'TYPE="ext4"'; then
                  mkfs.ext4 -F "$DATA_DEV"
                fi
                mkdir -p /var/foc-data
                echo "$DATA_DEV /var/foc-data ext4 defaults,nofail 0 2" >> /etc/fstab
                mount -a
                mkdir -p /var/foc-data/postgres /var/foc-data/rabbitmq /var/foc-data/debezium
                chmod -R 777 /var/foc-data
              fi

              # Retrieve IMDS token & local private IP
              IMDS_TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
              LOCAL_IP=$(curl -s -H "X-aws-ec2-metadata-token: $IMDS_TOKEN" http://169.254.169.254/latest/meta-data/local-ipv4)

              # Install K3s server
              curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="server \
                --token ${local.k3s_token} \
                --tls-san $LOCAL_IP \
                --disable servicelb \
                --node-label foc.role=data-node \
                --write-kubeconfig-mode 644" sh -

              echo "K3s Master Installation Complete"
              EOF

  tags = {
    Name     = "foc-${var.environment}-k3s-master"
    Role     = "k3s-master-and-database"
    NodeType = "data-plane"
  }
}

# ==============================================================================
# Tier 2 Autoscaling: K3s Stateless Worker Nodes (Launch Template & ASG)
# ==============================================================================

# Launch Template for K3s Stateless Worker Nodes
resource "aws_launch_template" "k3s_worker" {
  name_prefix   = "foc-${var.environment}-worker-lt-"
  image_id      = data.aws_ssm_parameter.ubuntu_ami.value
  instance_type = var.worker_instance_type

  iam_instance_profile {
    name = aws_iam_instance_profile.ec2_node.name
  }

  network_interfaces {
    associate_public_ip_address = true
    security_groups             = [aws_security_group.cluster.id]
  }

  block_device_mappings {
    device_name = "/dev/sda1"

    ebs {
      volume_size           = 30
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = true
    }
  }

  # Autonomous Bootstrap Script: Joins K3s cluster upon booting
  user_data = base64encode(<<-EOF
              #!/bin/bash
              set -ex

              # Update system and install utilities
              apt-get update
              apt-get install -y curl netcat-openbsd

              # Wait for Master K3s API server (port 6443) to become reachable
              while ! nc -z ${aws_instance.k3s_master.private_ip} 6443; do
                echo "Waiting for K3s Master at ${aws_instance.k3s_master.private_ip}:6443..."
                sleep 5
              done

              # Install K3s agent and join cluster
              curl -sfL https://get.k3s.io | K3S_URL="https://${aws_instance.k3s_master.private_ip}:6443" \
                K3S_TOKEN="${local.k3s_token}" \
                INSTALL_K3S_EXEC="agent --node-label foc.role=worker-node" sh -

              echo "K3s Worker Joined Cluster Successfully"
              EOF
  )

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name     = "foc-${var.environment}-k3s-worker"
      Role     = "k3s-worker"
      NodeType = "stateless-compute"
    }
  }

  tag_specifications {
    resource_type = "volume"
    tags = {
      Name = "foc-${var.environment}-worker-root"
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Auto Scaling Group managing stateless worker pool across Multi-AZ subnets
resource "aws_autoscaling_group" "k3s_workers" {
  name_prefix         = "foc-${var.environment}-worker-asg-"
  min_size            = var.worker_min_size
  max_size            = var.worker_max_size
  desired_capacity    = var.worker_desired_capacity
  vpc_zone_identifier = [aws_subnet.public_a.id, aws_subnet.public_b.id]
  target_group_arns   = [aws_lb_target_group.http.arn]

  health_check_type         = "EC2"
  health_check_grace_period = 300

  launch_template {
    id      = aws_launch_template.k3s_worker.id
    version = "$Latest"
  }

  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
    }
  }

  tag {
    key                 = "Name"
    value               = "foc-${var.environment}-k3s-worker-asg"
    propagate_at_launch = true
  }

  tag {
    key                 = "Role"
    value               = "k3s-worker"
    propagate_at_launch = true
  }

  tag {
    key                 = "NodeType"
    value               = "stateless-compute"
    propagate_at_launch = true
  }

  depends_on = [
    aws_instance.k3s_master
  ]

  lifecycle {
    create_before_destroy = true
    ignore_changes        = [desired_capacity]
  }
}

# Target Tracking Scaling Policy: Dynamically provisions EC2 workers on sustained CPU spikes
resource "aws_autoscaling_policy" "worker_cpu_policy" {
  name                   = "foc-${var.environment}-worker-cpu-target"
  autoscaling_group_name = aws_autoscaling_group.k3s_workers.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value     = var.worker_cpu_target
    disable_scale_in = false
  }
}
