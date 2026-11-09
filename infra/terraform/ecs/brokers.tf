# AI Assistance Disclosure:
# Tool: Codex (model: GPT-6), date: 2026-11-09
# Scope: Wire optional self-hosted observability for the approved ECS layout.
# Author review: <to be completed by yanhwee>
#
# Tool: Codex (model: GPT-6), date: 2026-11-08
# Scope: Run one persistent RabbitMQ task on each ECS slot and expose AMQP privately.
# Author review: <to be completed by the author>

# AI-generated (edited by ngkhengyang)
resource "aws_ecs_task_definition" "broker" {
  for_each                 = local.brokers
  family                   = "${local.name}-broker-${each.key}"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  cpu                      = "512"
  memory                   = "2048"
  execution_role_arn       = aws_iam_role.execution.arn

  runtime_platform {
    cpu_architecture        = "ARM64"
    operating_system_family = "LINUX"
  }

  volume {
    name      = "broker"
    host_path = "/srv/rabbitmq"
  }

  placement_constraints {
    type       = "memberOf"
    expression = "attribute:broker-slot == ${each.key}"
  }

  container_definitions = jsonencode([{
    name             = "rabbitmq"
    image            = "rabbitmq:3.13.7-management-alpine@sha256:606d8c0d6b3c18d1da9afc53bc7cdb2a8d5486df91b5a9830e9e07626c9ae281"
    essential        = true
    cpu              = 512
    memory           = 2048
    entryPoint       = ["/bin/sh", "-ec"]
    command          = [replace(file("${path.module}/rabbitmq-start.sh"), "\r\n", "\n")]
    stopTimeout      = 90
    logConfiguration = var.observability_enabled ? local.obs_logs : local.log_config
    environment = [
      { name = "RABBITMQ_NODENAME", value = "rabbit@broker-${each.key}.${local.broker_zone}" },
      { name = "RABBITMQ_USE_LONGNAME", value = "true" },
      { name = "BROKER_SLOT", value = each.key },
      { name = "OBSERVABILITY_ENABLED", value = tostring(var.observability_enabled) },
      { name = "BROKER_ZONE", value = local.broker_zone },
    ]
    secrets = [
      { name = "BROKER_COOKIE", valueFrom = "${aws_secretsmanager_secret.runtime["runtime"].arn}:broker_cookie::" },
      { name = "BROKER_DEFINITIONS", valueFrom = "${aws_secretsmanager_secret.runtime["runtime"].arn}:broker_definitions::" },
    ]
    extraHosts   = [{ hostname = "broker-${each.key}.${local.broker_zone}", ipAddress = "127.0.0.1" }]
    portMappings = [for port in concat([4369, 5672, 25672], var.observability_enabled ? [15692] : []) : { containerPort = port, hostPort = port }]
    mountPoints  = [{ sourceVolume = "broker", containerPath = "/var/lib/rabbitmq" }]
    healthCheck = {
      command     = ["CMD-SHELL", "su-exec rabbitmq rabbitmq-diagnostics -q check_running"]
      interval    = 30
      timeout     = 20
      retries     = 4
      startPeriod = 120
    }
  }])
}

resource "aws_ecs_service" "broker" {
  for_each                           = local.brokers
  name                               = "broker-${each.key}"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.broker[each.key].arn
  launch_type                        = "EC2"
  desired_count                      = local.run_brokers ? 1 : 0
  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100
  wait_for_steady_state              = true

  depends_on = [
    aws_autoscaling_group.slot,
    aws_lb_listener.broker,
    aws_iam_role_policy.execution_secrets,
    aws_iam_role_policy_attachment.execution,
  ]
}
