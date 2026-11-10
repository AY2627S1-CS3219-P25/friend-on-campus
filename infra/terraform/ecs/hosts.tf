# AI Assistance Disclosure:
# Tool: Codex (model: GPT-6), date: 2026-11-08
# Scope: Provision the three ARM64 ECS slots with stable broker storage and names.
# Author review: I validated correctness, edited for style, and verified with automated tests.

data "aws_iam_policy_document" "assume_host" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "host" {
  name               = "${local.name}-host"
  assume_role_policy = data.aws_iam_policy_document.assume_host.json
}

resource "aws_iam_role_policy_attachment" "host" {
  for_each = toset([
    "service-role/AmazonEC2ContainerServiceforEC2Role",
    "AmazonSSMManagedInstanceCore"
  ])
  role       = aws_iam_role.host.name
  policy_arn = "arn:aws:iam::aws:policy/${each.value}"
}

resource "aws_iam_instance_profile" "host" {
  name = local.name
  role = aws_iam_role.host.name
}

resource "aws_iam_role_policy" "broker_storage" {
  name = "broker-storage"
  role = aws_iam_role.host.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow", Action = "ec2:AttachVolume", Resource = concat(
        [for volume in aws_ebs_volume.broker : volume.arn],
        ["arn:aws:ec2:ap-southeast-1:${var.account_id}:instance/*"]
      ) },
      { Effect = "Allow", Action = "ec2:DescribeVolumes", Resource = "*" },
      { Effect = "Allow", Action = "route53:ChangeResourceRecordSets", Resource = aws_route53_zone.broker.arn,
        Condition = { "ForAllValues:StringEquals" = {
          "route53:ChangeResourceRecordSetsNormalizedRecordNames" = [for slot in local.brokers : "broker-${slot}.${local.broker_zone}"]
          "route53:ChangeResourceRecordSetsRecordTypes"           = ["A"]
          "route53:ChangeResourceRecordSetsActions"               = ["UPSERT"]
      } } },
    ]
  })
}

data "aws_iam_policy_document" "assume_task" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [var.account_id]
    }
  }
}

resource "aws_iam_role" "execution" {
  name               = "${local.name}-execution"
  assume_role_policy = data.aws_iam_policy_document.assume_task.json
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "execution_secrets" {
  name = "read-runtime-secrets"
  role = aws_iam_role.execution.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "secretsmanager:GetSecretValue"
      Resource = concat([for secret in aws_secretsmanager_secret.runtime : secret.arn], [aws_db_instance.main.master_user_secret[0].secret_arn])
    }]
  })
}

resource "aws_ecs_cluster" "main" {
  name = local.name
}

resource "aws_service_discovery_http_namespace" "main" {
  name = local.name
}

resource "aws_route53_zone" "broker" {
  name          = local.broker_zone
  force_destroy = true
  vpc {
    vpc_id = aws_vpc.main.id
  }
}

resource "aws_ebs_volume" "broker" {
  for_each          = local.brokers
  availability_zone = local.azs[0]
  size              = 10
  type              = "gp3"
  encrypted         = true

  tags = { Name = "${local.name}-broker-${each.key}" }
}

resource "aws_launch_template" "slot" {
  for_each      = local.brokers
  name          = "${local.name}-slot-${each.key}"
  image_id      = data.aws_ssm_parameter.ecs_ami.value
  instance_type = "m7g.xlarge"

  iam_instance_profile {
    arn = aws_iam_instance_profile.host.arn
  }

  metadata_options {
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  network_interfaces {
    associate_public_ip_address = true
    security_groups             = [aws_security_group.hosts.id]
  }

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 30
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = true
    }
  }

  user_data = base64encode(replace(templatefile("${path.module}/host-bootstrap.sh.tftpl", {
    volume  = aws_ebs_volume.broker[each.key].id
    slot    = each.key
    cluster = aws_ecs_cluster.main.name
    zone_id = aws_route53_zone.broker.zone_id
    name    = "broker-${each.key}.${local.broker_zone}"
  }), "\r\n", "\n"))
}

resource "aws_autoscaling_group" "slot" {
  for_each            = local.brokers
  name                = "${local.name}-slot-${each.key}"
  min_size            = var.hosts_running ? 1 : 0
  desired_capacity    = var.hosts_running ? 1 : 0
  max_size            = 1
  vpc_zone_identifier = [aws_subnet.public[0].id]
  target_group_arns   = [aws_lb_target_group.broker.arn]

  launch_template {
    id      = aws_launch_template.slot[each.key].id
    version = aws_launch_template.slot[each.key].latest_version
  }

  lifecycle {
    precondition {
      condition     = var.hosts_running || !local.run_brokers
      error_message = "Set phase=foundation and drain ECS services before stopping the hosts."
    }
  }

  depends_on = [
    aws_route_table_association.public,
    aws_iam_role_policy_attachment.host,
    aws_iam_role_policy.broker_storage
  ]
}
