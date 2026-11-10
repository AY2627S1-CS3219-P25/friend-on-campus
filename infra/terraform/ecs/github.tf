# AI Assistance Disclosure:
# Tool: Codex (model: GPT-6), date: 2026-11-08 to 2026-11-09
# Scope: Grant the retained GitHub deployment role ECR push and ECS application rollout permissions; updated across 2 AI-assisted revisions through D4 wrap-up (allow GitHub delivery to run and inspect migration tasks in foc-ecs).
# Author review: I validated correctness, edited for style, and verified with automated tests.

resource "aws_iam_role_policy" "github_deploy" {
  name = "foc-ecs-application-deploy"
  role = "foc-production-github-actions-cd-role"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken", "ecs:RegisterTaskDefinition", "ecs:DescribeTaskDefinition"]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability", "ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer",
          "ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload", "ecr:PutImage", "ecr:DescribeImages"
        ]
        Resource = [for service in keys(local.apps) : "arn:aws:ecr:ap-southeast-1:${var.account_id}:repository/foc/${service}"]
      },
      {
        Effect   = "Allow"
        Action   = ["ecs:DescribeServices", "ecs:UpdateService"]
        Resource = [for service in keys(local.apps) : "arn:aws:ecs:ap-southeast-1:${var.account_id}:service/${aws_ecs_cluster.main.name}/${service}"]
      },
      {
        Effect    = "Allow"
        Action    = "ecs:RunTask"
        Resource  = [for backend in local.backends : "arn:aws:ecs:ap-southeast-1:${var.account_id}:task-definition/${local.name}-migrate-${backend.name}:*"]
        Condition = { ArnEquals = { "ecs:cluster" = aws_ecs_cluster.main.arn } }
      },
      {
        Effect   = "Allow"
        Action   = "ecs:DescribeTasks"
        Resource = "arn:aws:ecs:ap-southeast-1:${var.account_id}:task/${aws_ecs_cluster.main.name}/*"
      },
      {
        Effect    = "Allow"
        Action    = "iam:PassRole"
        Resource  = aws_iam_role.execution.arn
        Condition = { StringEquals = { "iam:PassedToService" = "ecs-tasks.amazonaws.com" } }
      }
    ]
  })
}
