variable "aws_region" {
  description = "AWS region for deployment (Singapore default for NUS)"
  type        = string
  default     = "ap-southeast-1"
}

variable "environment" {
  description = "Deployment environment name"
  type        = string
  default     = "production"
}

variable "vpc_cidr" {
  description = "CIDR block for the custom VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "master_instance_type" {
  description = "Instance type for K3s Master / Data Node (Postgres, RabbitMQ, Debezium CDC, K3s control plane)"
  type        = string
  default     = "t3.medium"
}

variable "worker_instance_type" {
  description = "Instance type for K3s Worker Nodes (Stateless microservices, HPA, Ingress)"
  type        = string
  default     = "t3.medium"
}

variable "worker_count" {
  description = "Number of stateless worker EC2 instances"
  type        = number
  default     = 2
}

variable "ebs_volume_size" {
  description = "Size in GB of persistent gp3 EBS volume for stateful data storage (/var/foc-data)"
  type        = number
  default     = 50
}

variable "k3s_token" {
  description = "Cluster join token for K3s. Leave empty to auto-generate a secure random token."
  type        = string
  default     = ""
  sensitive   = true
}

variable "github_repository" {
  description = "GitHub repository owner/repo for GitHub Actions OIDC role (e.g. CS3219-AY2425S1/cs3219-project-ay2425s1-g25 or * for all repos in account)"
  type        = string
  default     = "*"
}

variable "certificate_arn" {
  description = "Optional ACM certificate ARN for ALB HTTPS listener"
  type        = string
  default     = ""
}
