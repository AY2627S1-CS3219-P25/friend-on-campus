# Dedicated gp3 Amazon EBS Persistent Volume for PostgreSQL, RabbitMQ & Debezium
resource "aws_ebs_volume" "data_volume" {
  availability_zone = data.aws_availability_zones.available.names[0]
  size              = var.ebs_volume_size
  type              = "gp3"
  iops              = 3000
  throughput        = 125
  encrypted         = true

  tags = {
    Name       = "foc-${var.environment}-data-volume"
    Role       = "StatefulDataStorage"
    MountPoint = "/var/foc-data"
  }
}

# Attach EBS Persistent Volume to K3s Master / Data Node
resource "aws_volume_attachment" "data_volume_att" {
  device_name = "/dev/sdf"
  volume_id   = aws_ebs_volume.data_volume.id
  instance_id = aws_instance.k3s_master.id
}
