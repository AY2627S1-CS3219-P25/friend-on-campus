# ==============================================================================
# Amazon Elastic Container Registry (ECR) Repositories
# ==============================================================================

locals {
  ecr_repositories = [
    "foc/user-service",
    "foc/supplier-service",
    "foc/order-service",
    "foc/credit-service",
    "foc/notification-service",
    "foc/chat-service",
    "foc/gateway",
    "foc/student-app",
    "foc/admin-portal"
  ]
}

resource "aws_ecr_repository" "services" {
  for_each             = toset(local.ecr_repositories)
  name                 = each.value
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = each.value
  }
}

# Cost-Control: Lifecycle policy to purge untagged images and keep last 10 versions
resource "aws_ecr_lifecycle_policy" "cleanup_policy" {
  for_each   = toset(local.ecr_repositories)
  repository = aws_ecr_repository.services[each.key].name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images older than 3 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 3
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep at most 10 tagged images to protect student storage budget"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
