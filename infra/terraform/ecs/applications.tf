# AI Assistance Disclosure:
# Tool: Codex (model: GPT-6), date: 2026-11-09
# Scope: Wire optional self-hosted observability for the approved ECS layout.
# Author review: <to be completed by yanhwee>
#
# Tool: Codex (model: GPT-6), date: 2026-11-08
# Scope: Define staged ARM64 application services, Service Connect routes, task inputs and scaling, with workflow ownership of deployed application revisions.
# Author review: <to be completed by the author>

# AI-generated (edited by ngkhengyang)
locals {
  backends = {
    user-service         = { port = 8001, name = "user" }
    supplier-service     = { port = 8002, name = "supplier" }
    order-service        = { port = 8003, name = "order" }
    credit-service       = { port = 8004, name = "credit" }
    notification-service = { port = 8005, name = "notification" }
    chat-service         = { port = 8006, name = "chat" }
  }
  frontends = { student-app = 5173, admin-portal = 5174 }
  apps = merge(
    { for key, backend in local.backends : key => { port = backend.port, min = 2, max = 3, memory = 768 } },
    { for key, port in local.frontends : key => { port = port, min = key == "admin-portal" ? 1 : 2, max = key == "admin-portal" ? 2 : 3, memory = 384 } },
    { gateway = { port = 80, min = 2, max = 3, memory = 384 } }
  )
  base_apps      = setsubtract(toset(keys(local.apps)), toset(["order-service", "chat-service", "gateway"]))
  auth_arn       = aws_secretsmanager_secret.runtime["auth"].arn
  secret_arn     = aws_secretsmanager_secret.runtime["runtime"].arn
  broker_clients = toset(["order-service", "credit-service", "notification-service", "chat-service"])

  backend_env = {
    for key, backend in local.backends : key => merge({
      NODE_ENV    = "production"
      PORT        = tostring(backend.port)
      CORS_ORIGIN = "https://${aws_cloudfront_distribution.main.domain_name}"
      DB_HOST     = aws_db_instance.main.address
      DB_NAME     = "${backend.name}_db"
      DB_USER     = "${backend.name}_svc"
      }, contains(local.broker_clients, key) ? {
      AMQP_HOST = aws_lb.broker.dns_name
      AMQP_USER = "${backend.name}_service"
      } : {}, key == "order-service" ? {
      SUPPLIER_SERVICE_URL = "http://supplier-service:8002"
      } : {}, key == "chat-service" ? {
      ORDER_SERVICE_URL = "http://order-service:8003"
    } : {}, local.obs_environment, var.observability_enabled ? { OTEL_SERVICE_NAME = key } : {})
  }

  backend_secrets = {
    for key, backend in local.backends : key => merge({
      DB_PASSWORD    = "${local.secret_arn}:db_${backend.name}::"
      JWT_PUBLIC_KEY = "${local.auth_arn}:jwt_public_key::"
      }, contains(local.broker_clients, key) ? {
      AMQP_PASSWORD = "${local.secret_arn}:rabbit_${backend.name}::"
      } : {}, key == "user-service" ? {
      JWT_PRIVATE_KEY = "${local.auth_arn}:jwt_private_key::"
      } : {}, contains(["order-service", "chat-service"], key) ? {
      SOCLAAS_API_KEY = "${local.auth_arn}:soclaas_api_key::"
    } : {})
  }

  backend_start = replace(file("${path.module}/backend-env.sh"), "\r\n", "\n")
  gateway_start = replace(file("${path.module}/gateway-start.sh"), "\r\n", "\n")
}

resource "aws_ecs_task_definition" "app" {
  for_each                 = local.apps
  family                   = "${local.name}-${each.key}"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  cpu                      = "384"
  memory                   = tostring(each.value.memory)
  execution_role_arn       = aws_iam_role.execution.arn

  runtime_platform {
    cpu_architecture        = "ARM64"
    operating_system_family = "LINUX"
  }

  container_definitions = jsonencode([{ for name, value in {
    name              = each.key
    image             = "${local.ecr}/${each.key}:${var.image_tag}"
    essential         = true
    cpu               = 128
    memoryReservation = each.value.memory - 64
    stopTimeout       = 30
    logConfiguration  = var.observability_enabled ? local.obs_logs : local.log_config
    portMappings      = [{ name = "http", containerPort = each.value.port, hostPort = 0 }]
    healthCheck = {
      command     = ["CMD-SHELL", contains(keys(local.backends), each.key) ? "node -e \"fetch('http://127.0.0.1:${each.value.port}/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\"" : "wget -q -O /dev/null http://127.0.0.1:${each.value.port}/${each.key == "gateway" ? "health" : ""}"]
      interval    = 15
      timeout     = 5
      retries     = 3
      startPeriod = 90
    }
    entryPoint  = contains(keys(local.frontends), each.key) ? null : ["/bin/sh", "-ec"]
    command     = contains(keys(local.frontends), each.key) ? null : [each.key == "gateway" ? local.gateway_start : "${local.backend_start}\nexec node dist/index.js"]
    environment = [for key, value in merge(lookup(local.backend_env, each.key, {}), each.key == "gateway" && var.observability_enabled ? { OBSERVABILITY_ENABLED = "true", OBS_BACKEND_HOST = local.obs_host } : {}) : { name = key, value = value }]
    secrets     = [for key, value in lookup(local.backend_secrets, each.key, {}) : { name = key, valueFrom = value }]
  } : name => value if value != null }])
}

resource "aws_ecs_service" "base" {
  for_each                           = local.base_apps
  name                               = each.key
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.app[each.key].arn
  launch_type                        = "EC2"
  desired_count                      = local.run_apps ? local.apps[each.key].min : 0
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200
  wait_for_steady_state              = true

  ordered_placement_strategy {
    type  = "spread"
    field = "instanceId"
  }

  service_connect_configuration {
    enabled   = true
    namespace = aws_service_discovery_http_namespace.main.arn

    service {
      port_name      = "http"
      discovery_name = each.key
      client_alias {
        dns_name = each.key
        port     = local.apps[each.key].port
      }
    }
  }

  depends_on = [aws_ecs_service.broker]

  lifecycle {
    ignore_changes = [task_definition]
  }
}
resource "aws_ecs_service" "order" {
  for_each                           = toset(["order-service"])
  name                               = each.key
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.app[each.key].arn
  launch_type                        = "EC2"
  desired_count                      = local.run_apps ? local.apps[each.key].min : 0
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200
  wait_for_steady_state              = true

  ordered_placement_strategy {
    type  = "spread"
    field = "instanceId"
  }

  service_connect_configuration {
    enabled   = true
    namespace = aws_service_discovery_http_namespace.main.arn

    service {
      port_name      = "http"
      discovery_name = each.key
      client_alias {
        dns_name = each.key
        port     = local.apps[each.key].port
      }
    }
  }

  depends_on = [aws_ecs_service.base]

  lifecycle {
    ignore_changes = [task_definition]
  }
}
resource "aws_ecs_service" "chat" {
  for_each                           = toset(["chat-service"])
  name                               = each.key
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.app[each.key].arn
  launch_type                        = "EC2"
  desired_count                      = local.run_apps ? local.apps[each.key].min : 0
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200
  wait_for_steady_state              = true

  ordered_placement_strategy {
    type  = "spread"
    field = "instanceId"
  }

  service_connect_configuration {
    enabled   = true
    namespace = aws_service_discovery_http_namespace.main.arn

    service {
      port_name      = "http"
      discovery_name = each.key
      client_alias {
        dns_name = each.key
        port     = local.apps[each.key].port
      }
    }
  }

  depends_on = [aws_ecs_service.order]

  lifecycle {
    ignore_changes = [task_definition]
  }
}
resource "aws_ecs_service" "gateway" {
  name                               = "gateway"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.app["gateway"].arn
  launch_type                        = "EC2"
  desired_count                      = local.run_apps ? 2 : 0
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200
  health_check_grace_period_seconds  = 90
  wait_for_steady_state              = true

  ordered_placement_strategy {
    type  = "spread"
    field = "instanceId"
  }

  service_connect_configuration {
    enabled   = true
    namespace = aws_service_discovery_http_namespace.main.arn
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.gateway.arn
    container_name   = "gateway"
    container_port   = 80
  }

  depends_on = [aws_ecs_service.chat, aws_lb_listener_rule.cloudfront]

  lifecycle {
    ignore_changes = [task_definition]
  }
}

locals {
  scalable_services = merge(
    { for key, service in aws_ecs_service.base : key => service.name },
    { for key, service in aws_ecs_service.order : key => service.name },
    { for key, service in aws_ecs_service.chat : key => service.name },
    { gateway = aws_ecs_service.gateway.name }
  )
}

resource "aws_appautoscaling_target" "app" {
  for_each           = local.run_apps ? local.apps : {}
  service_namespace  = "ecs"
  scalable_dimension = "ecs:service:DesiredCount"
  resource_id        = "service/${aws_ecs_cluster.main.name}/${local.scalable_services[each.key]}"
  min_capacity       = each.value.min
  max_capacity       = each.value.max
}

resource "aws_appautoscaling_policy" "app" {
  for_each           = aws_appautoscaling_target.app
  name               = "${each.key}-cpu"
  policy_type        = "TargetTrackingScaling"
  service_namespace  = each.value.service_namespace
  scalable_dimension = each.value.scalable_dimension
  resource_id        = each.value.resource_id

  target_tracking_scaling_policy_configuration {
    target_value       = 65
    scale_in_cooldown  = 180
    scale_out_cooldown = 60

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}
