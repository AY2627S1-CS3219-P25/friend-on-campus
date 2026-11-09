# AI Assistance Disclosure:
# Tool: Codex (model: GPT-6), date: 2026-11-09
# Scope: Prepare the approved optional persistent backend and per-host collectors; no deployment.
# Author review: <to be completed by yanhwee>
# AI-generated (edited by yanhwee)

variable "observability_enabled" {
  type        = bool
  default     = false
  description = "Prepare the self-hosted monitoring tasks on the existing fleet. Review capacity and provision the monitoring DB role before enabling."
}
variable "observability_bundle_image" {
  type        = string
  default     = ""
  description = "ARM64 image built with docker/observability/Dockerfile, pinned by digest. Required when observability is enabled."
}

locals {
  obs_host    = "broker-1.${local.broker_zone}"
  obs_enabled = var.observability_enabled && local.run_apps
  obs_logs = {
    logDriver = "json-file"
    options   = { "max-size" = "10m", "max-file" = "3", labels = "com.amazonaws.ecs.container-name" }
  }
  obs_environment = var.observability_enabled ? {
    OTEL_ENABLED                = "true"
    OTEL_EXPORTER_OTLP_ENDPOINT = "http://${local.obs_host}:4318"
    OTEL_TRACES_SAMPLER_ARG     = "0.1"
  } : {}
  obs_init = {
    name        = "configure"
    image       = var.observability_bundle_image
    essential   = false
    cpu         = 32
    memory      = 64
    command     = ["backend"]
    environment = [{ name = "OBS_BACKEND_HOST", value = local.obs_host }]
    mountPoints = [
      { sourceVolume = "config", containerPath = "/config" },
      { sourceVolume = "data", containerPath = "/data" },
    ]
    logConfiguration = local.log_config
  }
  obs_backends = {
    prometheus = {
      image   = "prom/prometheus:v3.8.0@sha256:d936808bdea528155c0154a922cd42fd75716b8bb7ba302641350f9f3eaeba09"
      memory  = 384
      command = ["--config.file=/config/prometheus.yaml", "--storage.tsdb.retention.time=72h", "--storage.tsdb.retention.size=512MB"]
      data    = "/prometheus"
    }
    loki = {
      image   = "grafana/loki:3.6.3@sha256:cd6e176883a90c21755f0315688668991634143423f75bdedfef41441b0fdc3c"
      memory  = 384
      command = ["-config.file=/config/loki.yaml"]
      data    = "/loki"
    }
    tempo = {
      image   = "grafana/tempo:2.9.0@sha256:65a5789759435f1ef696f1953258b9bbdb18eb571d5ce711ff812d2e128288a4"
      memory  = 384
      command = ["-config.file=/config/tempo.yaml"]
      data    = "/var/tempo"
    }
    grafana = {
      image   = "grafana/grafana:12.3.1@sha256:2175aaa91c96733d86d31cf270d5310b278654b03f5718c59de12a865380a31f"
      memory  = 256
      command = []
      data    = "/var/lib/grafana"
    }
    blackbox = {
      image   = "prom/blackbox-exporter:v0.27.0@sha256:a50c4c0eda297baa1678cd4dc4712a67fdea713b832d43ce7fcc5f9bea05094d"
      memory  = 64
      command = ["--config.file=/config/blackbox.yaml"]
      data    = ""
    }
    postgres = {
      image   = "prometheuscommunity/postgres-exporter:v0.18.1@sha256:fb96c4413985d4b23ab02b19022b3d70a86c8e0a62f41ab15ebb6f4673781a5d"
      memory  = 96
      command = []
      data    = ""
    }
  }
}

resource "aws_ebs_volume" "observability" {
  count             = var.observability_enabled ? 1 : 0
  availability_zone = local.azs[0]
  size              = 20
  type              = "gp3"
  encrypted         = true
  tags              = { Name = "${local.name}-observability" }
  lifecycle { prevent_destroy = true }
}

resource "aws_iam_role" "observability" {
  count              = var.observability_enabled ? 1 : 0
  name               = "${local.name}-observability"
  assume_role_policy = data.aws_iam_policy_document.assume_task.json
}
resource "aws_iam_role_policy" "observability_discovery" {
  count = var.observability_enabled ? 1 : 0
  role  = aws_iam_role.observability[0].id
  policy = jsonencode({ Version = "2012-10-17", Statement = [
    { Effect = "Allow", Action = ["ecs:ListTasks"], Resource = "*", Condition = { ArnEquals = { "ecs:cluster" = aws_ecs_cluster.main.arn } } },
    { Effect = "Allow", Action = ["ecs:DescribeTasks"], Resource = "arn:aws:ecs:ap-southeast-1:${var.account_id}:task/${local.name}/*" },
    { Effect = "Allow", Action = ["ecs:DescribeContainerInstances"], Resource = "arn:aws:ecs:ap-southeast-1:${var.account_id}:container-instance/${local.name}/*" },
    { Effect = "Allow", Action = ["ec2:DescribeInstances"], Resource = "*" },
  ] })
}

resource "aws_ecs_task_definition" "observability" {
  count                    = var.observability_enabled ? 1 : 0
  family                   = "${local.name}-observability"
  network_mode             = "host"
  requires_compatibilities = ["EC2"]
  cpu                      = "512"
  memory                   = "1792"
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.observability[0].arn
  runtime_platform { cpu_architecture = "ARM64" }
  volume {
    name      = "config"
    host_path = "/srv/observability/config"
  }
  volume {
    name      = "data"
    host_path = "/srv/observability/data"
  }
  dynamic "volume" {
    for_each = toset(["prometheus", "loki", "tempo", "grafana"])
    content {
      name      = volume.value
      host_path = "/srv/observability/data/${volume.value}"
    }
  }
  placement_constraints {
    type       = "memberOf"
    expression = "attribute:broker-slot == 1 and attribute:observability-storage == ready"
  }
  container_definitions = jsonencode(concat([local.obs_init], [for name, backend in local.obs_backends : {
    name             = name
    image            = backend.image
    essential        = true
    cpu              = 64
    memory           = backend.memory
    command          = backend.command
    dependsOn        = [{ containerName = "configure", condition = "SUCCESS" }]
    logConfiguration = local.log_config
    mountPoints      = concat([{ sourceVolume = "config", containerPath = "/config", readOnly = true }], backend.data != "" ? [{ sourceVolume = name, containerPath = backend.data, readOnly = false }] : [])
    environment = name == "grafana" ? [
      { name = "GF_PATHS_PROVISIONING", value = "/config/grafana" },
      { name = "GF_SERVER_HTTP_ADDR", value = "127.0.0.1" },
      { name = "GF_AUTH_ANONYMOUS_ENABLED", value = "true" },
      { name = "GF_AUTH_ANONYMOUS_ORG_ROLE", value = "Viewer" },
      { name = "GF_AUTH_DISABLE_LOGIN_FORM", value = "true" },
      { name = "GF_USERS_ALLOW_SIGN_UP", value = "false" },
      ] : name == "postgres" ? [
      { name = "DATA_SOURCE_URI", value = "${aws_db_instance.main.address}:5432/order_db?sslmode=require" },
      { name = "DATA_SOURCE_USER", value = "observability" },
      { name = "PG_EXPORTER_EXTEND_QUERY_PATH", value = "/config/postgres-queries.yaml" },
    ] : []
    secrets = name == "postgres" ? [{ name = "DATA_SOURCE_PASS", valueFrom = "${local.secret_arn}:db_observability::" }] : []
    }], [{
    name             = "discovery"
    image            = var.observability_bundle_image
    essential        = true
    cpu              = 32
    memory           = 128
    entryPoint       = ["/bin/sh", "/bundle/cloud/discover.sh"]
    environment      = [{ name = "OBS_CLUSTER", value = aws_ecs_cluster.main.name }]
    mountPoints      = [{ sourceVolume = "config", containerPath = "/config" }]
    dependsOn        = [{ containerName = "configure", condition = "SUCCESS" }]
    logConfiguration = local.log_config
  }]))
  lifecycle {
    precondition {
      condition     = can(regex("@sha256:[a-f0-9]{64}$", var.observability_bundle_image))
      error_message = "Set observability_bundle_image to the ARM64 configuration image pinned by sha256 digest."
    }
  }
}
resource "aws_ecs_service" "observability" {
  count                              = var.observability_enabled ? 1 : 0
  name                               = "observability"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.observability[0].arn
  launch_type                        = "EC2"
  desired_count                      = local.obs_enabled ? 1 : 0
  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100
  depends_on                         = [aws_autoscaling_group.slot, aws_iam_role_policy.observability_discovery]
}

resource "aws_ecs_task_definition" "observability_agent" {
  count                    = var.observability_enabled ? 1 : 0
  family                   = "${local.name}-observability-agent"
  network_mode             = "host"
  requires_compatibilities = ["EC2"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.execution.arn
  runtime_platform { cpu_architecture = "ARM64" }
  dynamic "volume" {
    for_each = {
      config = "/srv/observability-agent/config"
      state  = "/srv/observability-agent/state"
      logs   = "/var/lib/docker/containers"
      socket = "/var/run/docker.sock"
      proc   = "/proc"
      sys    = "/sys"
      root   = "/"
    }
    content {
      name      = volume.key
      host_path = volume.value
    }
  }
  container_definitions = jsonencode([
    {
      name             = "configure"
      image            = var.observability_bundle_image
      essential        = false
      cpu              = 32
      memory           = 64
      command          = ["agent"]
      environment      = [{ name = "OBS_BACKEND_HOST", value = local.obs_host }]
      mountPoints      = [{ sourceVolume = "config", containerPath = "/config" }]
      logConfiguration = local.log_config
    },
    {
      name      = "collector"
      image     = "otel/opentelemetry-collector-contrib:0.140.0@sha256:ffc818ee108d0b934fd14207fd87ff247c9b64f344ed349d0b66c166c18a2312"
      essential = true
      cpu       = 128
      memory    = 256
      user      = "0"
      command   = ["--config=/config/collector.yaml"]
      dependsOn = [{ containerName = "configure", condition = "SUCCESS" }, { containerName = "docker-api", condition = "START" }]
      mountPoints = [
        { sourceVolume = "config", containerPath = "/config", readOnly = true },
        { sourceVolume = "state", containerPath = "/var/lib/otelcol" },
        { sourceVolume = "logs", containerPath = "/host-logs", readOnly = true },
      ]
      logConfiguration = local.log_config
    },
    {
      name             = "docker-api"
      image            = "tecnativa/docker-socket-proxy:v0.4.1@sha256:3400c429c5f9e1b21d62130fb93b16e2e772d4fb7695bd52fc2b743800b9fe9e"
      essential        = true
      cpu              = 32
      memory           = 64
      environment      = [for key, value in { CONTAINERS = "1", INFO = "1", VERSION = "1", POST = "0", LOG_LEVEL = "warning" } : { name = key, value = value }]
      mountPoints      = [{ sourceVolume = "socket", containerPath = "/var/run/docker.sock", readOnly = true }]
      logConfiguration = local.log_config
    },
    {
      name             = "node-exporter"
      image            = "prom/node-exporter:v1.10.2@sha256:3ac34ce007accad95afed72149e0d2b927b7e42fd1c866149b945b84737c62c3"
      essential        = true
      cpu              = 32
      memory           = 64
      command          = ["--path.procfs=/host/proc", "--path.sysfs=/host/sys", "--path.rootfs=/host/root"]
      mountPoints      = [for key in ["proc", "sys", "root"] : { sourceVolume = key, containerPath = "/host/${key}", readOnly = true }]
      logConfiguration = local.log_config
    },
  ])
}
resource "aws_ecs_service" "observability_agent" {
  count                              = local.obs_enabled ? 1 : 0
  name                               = "observability-agent"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.observability_agent[0].arn
  launch_type                        = "EC2"
  scheduling_strategy                = "DAEMON"
  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100
  depends_on                         = [aws_autoscaling_group.slot]
}

output "observability_access" {
  value = var.observability_enabled ? "Use Systems Manager port forwarding to broker slot 1, remote localhost:3000. No public Grafana listener is created." : "disabled"
}
