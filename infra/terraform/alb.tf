# ==============================================================================
# AWS Application Load Balancer (Single Ingress Entry Point)
# ==============================================================================

resource "aws_lb" "main" {
  name               = "foc-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.public_a.id, aws_subnet.public_b.id]

  enable_deletion_protection = false

  tags = {
    Name = "foc-${var.environment}-alb"
  }
}

# Target Group pointing to K3s cluster Ingress (Port 80)
resource "aws_lb_target_group" "http" {
  name        = "foc-${var.environment}-tg-http"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "instance"

  health_check {
    enabled             = true
    path                = "/health"
    matcher             = "200,301,302,404"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = {
    Name = "foc-${var.environment}-tg-http"
  }
}

# Attach Master node to Target Group (Master also hosts Traefik Ingress)
resource "aws_lb_target_group_attachment" "master" {
  target_group_arn = aws_lb_target_group.http.arn
  target_id        = aws_instance.k3s_master.id
  port             = 80
}

# Attach Worker nodes to Target Group
resource "aws_lb_target_group_attachment" "workers" {
  count            = var.worker_count
  target_group_arn = aws_lb_target_group.http.arn
  target_id        = aws_instance.k3s_worker[count.index].id
  port             = 80
}

# HTTP Port 80 Listener
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.http.arn
  }
}

# Optional HTTPS Port 443 Listener (Activated when certificate_arn is supplied)
resource "aws_lb_listener" "https" {
  count             = var.certificate_arn != "" ? 1 : 0
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.http.arn
  }
}
