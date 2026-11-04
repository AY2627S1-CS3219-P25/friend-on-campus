# Application Load Balancer Security Group
resource "aws_security_group" "alb" {
  name        = "foc-${var.environment}-alb-sg"
  description = "Security group for Friend on Campus Application Load Balancer"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "Allow HTTP from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Allow HTTPS from anywhere"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "foc-${var.environment}-alb-sg"
  }
}

# Cluster Node Security Group (Master & Workers)
resource "aws_security_group" "cluster" {
  name        = "foc-${var.environment}-cluster-sg"
  description = "Security group for K3s Master and Worker compute instances"
  vpc_id      = aws_vpc.main.id

  # Ingress strictly from ALB on HTTP/HTTPS
  ingress {
    description     = "HTTP from ALB"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description     = "HTTPS from ALB"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description     = "NodePort range from ALB (Traefik / NGINX Ingress NodePorts)"
    from_port       = 30000
    to_port         = 32767
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Full intra-cluster communication (Flannel VXLAN, K3s API, Kubelet, DB, RabbitMQ)
  ingress {
    description = "Intra-cluster communication between K3s nodes"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    self        = true
  }

  # All outbound traffic for container pulls, apt updates, SSM agent, etc.
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "foc-${var.environment}-cluster-sg"
  }
}
