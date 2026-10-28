# ==============================================================================
# EC2 Node IAM Role & Instance Profile (SSM & ECR Access)
# ==============================================================================

resource "aws_iam_role" "ec2_node" {
  name = "foc-${var.environment}-ec2-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "foc-${var.environment}-ec2-node-role"
  }
}

# Attach AWS Systems Manager Core policy (enables SSH-free web terminal & Run Command)
resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.ec2_node.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Attach ECR Read-Only policy (enables K3s nodes to pull from private ECR without docker login)
resource "aws_iam_role_policy_attachment" "ecr_read" {
  role       = aws_iam_role.ec2_node.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

# EC2 Instance Profile attached to instances
resource "aws_iam_instance_profile" "ec2_node" {
  name = "foc-${var.environment}-ec2-node-profile"
  role = aws_iam_role.ec2_node.name

  tags = {
    Name = "foc-${var.environment}-ec2-node-profile"
  }
}

# ==============================================================================
# GitHub Actions OIDC Role (Keyless CI/CD Pipeline)
# ==============================================================================

# GitHub Actions OIDC Provider
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1", "1c5824a6f33e401ee08176b3040f32d700d012e3"]

  tags = {
    Name = "foc-${var.environment}-github-oidc"
  }
}

# IAM Role assumed by GitHub Actions workflows
resource "aws_iam_role" "github_actions_cd" {
  name = "foc-${var.environment}-github-actions-cd-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = var.github_repository == "*" ? "repo:*" : "repo:${var.github_repository}:*"
          }
        }
      }
    ]
  })

  tags = {
    Name = "foc-${var.environment}-github-actions-cd-role"
  }
}

# Inline policy allowing GitHub Actions to push images to ECR and execute SSM commands
resource "aws_iam_role_policy" "github_actions_policy" {
  name = "foc-${var.environment}-github-actions-policy"
  role = aws_iam_role.github_actions_cd.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ECRAuthAndPush"
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:DescribeRepositories",
          "ecr:ListImages"
        ]
        Resource = "*"
      },
      {
        Sid    = "SSMDeployExecution"
        Effect = "Allow"
        Action = [
          "ssm:SendCommand",
          "ssm:GetCommandInvocation",
          "ssm:DescribeInstanceInformation"
        ]
        Resource = "*"
      }
    ]
  })
}
