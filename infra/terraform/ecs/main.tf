# AI Assistance Disclosure:
# Tool: Codex (model: GPT-6), date: 2026-11-09
# Scope: Match CDC access-point groups to the Debezium image for Docker volume initialization.
# Author review: <to be completed by the author>
#
# Tool: Codex (model: GPT-6), date: 2026-11-09
# Scope: Require Terraform 1.10 for shared S3 state locking.
# Author review: <to be completed by the author>
#
# Tool: Codex (model: GPT-6), date: 2026-11-08
# Scope: Define the Singapore ECS foundation, rollout inputs and private storage.
# Author review: <to be completed by the author>

# AI-generated (edited by ngkhengyang)
terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region              = "ap-southeast-1"
  allowed_account_ids = [var.account_id]

  default_tags {
    tags = {
      Project   = "friend-on-campus"
      Stack     = local.name
      ManagedBy = "Terraform"
    }
  }
}

variable "account_id" {
  type = string
}

variable "image_tag" {
  type        = string
  description = "Tag of the ARM64 images pushed to the nine existing foc ECR repositories."
}

variable "debezium_image" {
  type        = string
  description = "ARM64 Debezium Server 2.7 image URI, mirrored or built for ARM64 if necessary."
}

variable "phase" {
  type        = string
  default     = "foundation"
  description = "Rollout phase: foundation, brokers, applications, or live (adds CDC)."

  validation {
    condition     = contains(["foundation", "brokers", "applications", "live"], var.phase)
    error_message = "Use foundation, brokers, applications, or live."
  }
}

variable "hosts_running" {
  type        = bool
  default     = true
  description = "Set false with phase=foundation to stop the fleet while retaining broker disks."
}

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_ssm_parameter" "ecs_ami" {
  name = "/aws/service/ecs/optimized-ami/amazon-linux-2023/arm64/recommended/image_id"
}

locals {
  name        = "foc-ecs"
  azs         = slice(sort(data.aws_availability_zones.available.names), 0, 2)
  brokers     = toset(["1", "2", "3"])
  run_brokers = var.phase != "foundation"
  run_apps    = contains(["applications", "live"], var.phase)
  run_cdc     = var.phase == "live"
  broker_zone = "rabbit.foc.internal"
  ecr         = "${var.account_id}.dkr.ecr.ap-southeast-1.amazonaws.com/foc"
  logs        = { awslogs-group = aws_cloudwatch_log_group.tasks.name, awslogs-region = "ap-southeast-1", awslogs-stream-prefix = "ecs" }
  log_config  = { logDriver = "awslogs", options = local.logs }
}

resource "aws_vpc" "main" {
  cidr_block           = "10.42.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  availability_zone = local.azs[count.index]
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  availability_zone = local.azs[count.index]
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 10)
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "hosts" {
  name   = "${local.name}-hosts"
  vpc_id = aws_vpc.main.id

  ingress {
    protocol  = "tcp"
    from_port = 32768
    to_port   = 65535
    self      = true
  }

  ingress {
    protocol  = "tcp"
    from_port = 4369
    to_port   = 4369
    self      = true
  }

  ingress {
    protocol  = "tcp"
    from_port = 25672
    to_port   = 25672
    self      = true
  }

  ingress {
    protocol  = "tcp"
    from_port = 5672
    to_port   = 5672
    self      = true
  }

  ingress {
    protocol        = "tcp"
    from_port       = 32768
    to_port         = 65535
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    protocol        = "tcp"
    from_port       = 5672
    to_port         = 5672
    security_groups = [aws_security_group.broker_nlb.id]
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "storage" {
  for_each = { db = 5432, efs = 2049 }
  name     = "${local.name}-${each.key}"
  vpc_id   = aws_vpc.main.id

  ingress {
    protocol        = "tcp"
    from_port       = each.value
    to_port         = each.value
    security_groups = [aws_security_group.hosts.id]
  }
}

resource "aws_db_subnet_group" "main" {
  name       = local.name
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_db_parameter_group" "main" {
  name   = "${local.name}-postgres16"
  family = "postgres16"

  parameter {
    name         = "rds.logical_replication"
    value        = "1"
    apply_method = "pending-reboot"
  }
}

resource "aws_db_instance" "main" {
  identifier                  = local.name
  engine                      = "postgres"
  engine_version              = "16"
  instance_class              = "db.t4g.small"
  allocated_storage           = 20
  storage_type                = "gp3"
  storage_encrypted           = true
  multi_az                    = true
  publicly_accessible         = false
  username                    = "foc_admin"
  manage_master_user_password = true
  db_subnet_group_name        = aws_db_subnet_group.main.name
  vpc_security_group_ids      = [aws_security_group.storage["db"].id]
  parameter_group_name        = aws_db_parameter_group.main.name
  backup_retention_period     = 1
  skip_final_snapshot         = false
  final_snapshot_identifier   = "${local.name}-final"
}

resource "aws_efs_file_system" "cdc" {
  availability_zone_name = local.azs[0]
  encrypted              = true
  throughput_mode        = "bursting"
}

resource "aws_efs_mount_target" "cdc" {
  file_system_id  = aws_efs_file_system.cdc.id
  subnet_id       = aws_subnet.private[0].id
  security_groups = [aws_security_group.storage["efs"].id]
}

resource "aws_efs_access_point" "cdc" {
  for_each       = local.cdc
  file_system_id = aws_efs_file_system.cdc.id

  posix_user {
    uid = 185
    gid = 0
  }

  root_directory {
    path = "/${each.key}"

    creation_info {
      owner_uid   = 185
      owner_gid   = 0
      permissions = "750"
    }
  }
}

resource "aws_secretsmanager_secret" "runtime" {
  for_each = toset(["auth", "runtime"])
  name     = "${local.name}/${each.key}"
}

resource "aws_cloudwatch_log_group" "tasks" {
  name              = "/ecs/${local.name}"
  retention_in_days = 7
}

output "public_url" {
  value = "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "secret_names" {
  value = { for key, secret in aws_secretsmanager_secret.runtime : key => secret.name }
}

output "rds_endpoint" {
  value = aws_db_instance.main.address
}

output "broker_endpoint" {
  value = aws_lb.broker.dns_name
}

output "cluster" {
  value = aws_ecs_cluster.main.name
}

output "task_subnet" {
  value = aws_subnet.public[0].id
}
