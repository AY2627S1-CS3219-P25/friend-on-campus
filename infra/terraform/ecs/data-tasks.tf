# AI Assistance Disclosure:
# Tool: Codex (model: GPT-6), date: 2026-11-09
# Scope: Remove obsolete per-account password injection from the demo seed task.
# Author review: <to be completed by the author>
#
# Tool: Codex (model: GPT-6), date: 2026-11-08
# Scope: Register one-off database jobs, inject private User seed credentials and run three persistent Debezium connectors.
# Author review: <to be completed by the author>

# AI-generated (edited by ngkhengyang)
locals {
  cdc = {
    order  = { file = "application.properties", table = "outbox_events" }
    user   = { file = "user.properties", table = "outbox_events" }
    credit = { file = "credit.properties", table = "credit_outbox_events" }
  }

  cdc_config = {
    for name, connector in local.cdc : name => join("\n", concat(
      [for line in split("\n", replace(file("${path.module}/../../../docker/debezium/${connector.file}"), "\r\n", "\n")) : line
      if !can(regex("^debezium\\.(source\\.(database\\.(hostname|user|password)|slot\\.name|publication\\.name)|sink\\.rabbitmq\\.connection\\.(host|password))=", line))],
      [
        "debezium.source.database.hostname=${aws_db_instance.main.address}",
        "debezium.source.database.user=foc_cdc",
        "debezium.source.database.sslmode=require",
        "debezium.source.slot.name=debezium_${name}",
        "debezium.source.publication.name=dbz_${name}_publication",
        "debezium.source.publication.autocreate.mode=disabled",
        "debezium.sink.rabbitmq.connection.host=${aws_lb.broker.dns_name}",
      ]
    ))
  }
}

resource "aws_ecs_task_definition" "cdc" {
  for_each                 = local.cdc
  family                   = "${local.name}-cdc-${each.key}"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.execution.arn

  runtime_platform {
    cpu_architecture        = "ARM64"
    operating_system_family = "LINUX"
  }

  volume {
    name = "offsets"

    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.cdc.id
      transit_encryption = "ENABLED"
      authorization_config {
        access_point_id = aws_efs_access_point.cdc[each.key].id
      }
    }
  }

  container_definitions = jsonencode([{
    name             = "debezium"
    image            = var.debezium_image
    essential        = true
    cpu              = 512
    memory           = 1024
    stopTimeout      = 60
    logConfiguration = local.log_config
    entryPoint       = ["/bin/bash", "-ec"]
    command          = ["printf '%s\\n' \"$CDC_CONFIG\" > /debezium/conf/application.properties; exec /debezium/run.sh"]
    environment = [
      { name = "CDC_CONFIG", value = local.cdc_config[each.key] },
      { name = "JAVA_OPTS", value = "-Xms128m -Xmx640m" },
    ]
    secrets = [
      { name = "DEBEZIUM_SOURCE_DATABASE_PASSWORD", valueFrom = "${local.secret_arn}:db_cdc::" },
      { name = "DEBEZIUM_SINK_RABBITMQ_CONNECTION_PASSWORD", valueFrom = "${local.secret_arn}:rabbit_${each.key}::" },
    ]
    mountPoints = [{ sourceVolume = "offsets", containerPath = "/debezium/data" }]
  }])
}

resource "aws_ecs_service" "cdc" {
  for_each                           = local.cdc
  name                               = "cdc-${each.key}"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.cdc[each.key].arn
  launch_type                        = "EC2"
  desired_count                      = local.run_cdc ? 1 : 0
  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100
  wait_for_steady_state              = true

  ordered_placement_strategy {
    type  = "spread"
    field = "instanceId"
  }

  depends_on = [aws_efs_mount_target.cdc, aws_ecs_service.gateway]
}

resource "aws_ecs_task_definition" "db_setup" {
  family                   = "${local.name}-db-setup"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.execution.arn

  runtime_platform {
    cpu_architecture        = "ARM64"
    operating_system_family = "LINUX"
  }

  container_definitions = jsonencode([{
    name             = "setup"
    image            = "postgres:16.15-alpine3.24@sha256:721873c34ceb9f8d8fc265984940dc982404c105f19ad51be9fdc5970a6080ea"
    essential        = true
    cpu              = 256
    memory           = 512
    logConfiguration = local.log_config
    entryPoint       = ["/bin/sh", "-ec", replace(file("${path.module}/db-setup.sh"), "\r\n", "\n"), "--"]
    command          = ["roles"]
    environment = [
      { name = "PGHOST", value = aws_db_instance.main.address },
      { name = "PGUSER", value = aws_db_instance.main.username },
      { name = "PGSSLMODE", value = "require" },
    ]
    secrets = concat(
      [{ name = "PGPASSWORD", valueFrom = "${aws_db_instance.main.master_user_secret[0].secret_arn}:password::" }],
      [for name in concat([for backend in local.backends : backend.name], ["cdc"]) : {
        name = "DB_${upper(name)}", valueFrom = "${local.secret_arn}:db_${name}::"
      }]
    )
  }])
}

resource "aws_ecs_task_definition" "migration" {
  for_each                 = local.backends
  family                   = "${local.name}-migrate-${each.value.name}"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.execution.arn

  runtime_platform {
    cpu_architecture        = "ARM64"
    operating_system_family = "LINUX"
  }

  container_definitions = jsonencode([{
    name             = "migrate"
    image            = "${local.ecr}/${each.key}:${var.image_tag}"
    essential        = true
    cpu              = 256
    memory           = 512
    logConfiguration = local.log_config
    entryPoint       = ["/bin/sh", "-ec", local.backend_start, "--"]
    command          = ["migrate"]
    environment = concat(
      [for name in ["DB_HOST", "DB_NAME", "DB_USER"] : { name = name, value = local.backend_env[each.key][name] }],
      [{ name = "SEED_SAMPLE_ORDERS", value = "true" }],
      each.key == "user-service" ? [{ name = "NODE_ENV", value = "production" }] : []
    )
    secrets = [{ name = "DB_PASSWORD", valueFrom = local.backend_secrets[each.key].DB_PASSWORD }]
  }])
}

output "database_setup_task" {
  value = aws_ecs_task_definition.db_setup.arn
}

output "migration_tasks" {
  value = { for key, task in aws_ecs_task_definition.migration : key => task.arn }
}
