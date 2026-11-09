# AI Assistance Disclosure:
# Tool: Codex (model: GPT-6), date: 2026-11-08
# Scope: Configure the CloudFront HTTP origin and private broker load balancer.
# Author review: <to be completed by the author>

# AI-generated (edited by ngkhengyang)
data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

resource "aws_security_group" "alb" {
  name   = "${local.name}-alb"
  vpc_id = aws_vpc.main.id

  ingress {
    protocol        = "tcp"
    from_port       = 80
    to_port         = 80
    prefix_list_ids = [data.aws_ec2_managed_prefix_list.cloudfront.id]
  }

  egress {
    protocol    = "tcp"
    from_port   = 32768
    to_port     = 65535
    cidr_blocks = [aws_subnet.public[0].cidr_block]
  }
}

resource "aws_security_group" "broker_nlb" {
  name   = "${local.name}-broker-nlb"
  vpc_id = aws_vpc.main.id

  ingress {
    protocol    = "tcp"
    from_port   = 5672
    to_port     = 5672
    cidr_blocks = [aws_subnet.public[0].cidr_block]
  }

  egress {
    protocol    = "tcp"
    from_port   = 5672
    to_port     = 5672
    cidr_blocks = [aws_subnet.public[0].cidr_block]
  }
}

resource "aws_lb" "web" {
  name               = local.name
  load_balancer_type = "application"
  subnets            = aws_subnet.public[*].id
  security_groups    = [aws_security_group.alb.id]
  idle_timeout       = 120
}

resource "aws_lb_target_group" "gateway" {
  name        = "${local.name}-gateway"
  target_type = "instance"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id

  health_check {
    path     = "/health"
    interval = 15
  }
}

variable "origin_header" {
  type        = string
  sensitive   = true
  description = "Unique random 64-character hex value shared by CloudFront and the ALB listener. It is recorded in Terraform state."

  validation {
    condition     = can(regex("^[a-fA-F0-9]{64}$", var.origin_header))
    error_message = "Provide 64 hexadecimal characters for the origin header."
  }
}

resource "aws_lb_listener" "web" {
  load_balancer_arn = aws_lb.web.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      status_code  = "403"
    }
  }
}

resource "aws_lb_listener_rule" "cloudfront" {
  listener_arn = aws_lb_listener.web.arn
  priority     = 1

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.gateway.arn
  }

  condition {
    http_header {
      http_header_name = "X-Foc-Origin"
      values           = [var.origin_header]
    }
  }
}

data "aws_cloudfront_cache_policy" "disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "viewer" {
  name = "Managed-AllViewerExceptHostHeader"
}

resource "aws_cloudfront_distribution" "main" {
  enabled = true
  comment = local.name

  origin {
    domain_name = aws_lb.web.dns_name
    origin_id   = "gateway"

    custom_header {
      name  = "X-Foc-Origin"
      value = var.origin_header
    }

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id         = "gateway"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = data.aws_cloudfront_cache_policy.disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.viewer.id
    compress                 = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

resource "aws_lb" "broker" {
  name               = "${local.name}-broker"
  internal           = true
  load_balancer_type = "network"
  subnets            = [aws_subnet.private[0].id]
  security_groups    = [aws_security_group.broker_nlb.id]
}

resource "aws_lb_target_group" "broker" {
  name               = "${local.name}-broker"
  target_type        = "instance"
  port               = 5672
  protocol           = "TCP"
  vpc_id             = aws_vpc.main.id
  preserve_client_ip = false
}

resource "aws_lb_listener" "broker" {
  load_balancer_arn = aws_lb.broker.arn
  port              = 5672
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.broker.arn
  }
}
