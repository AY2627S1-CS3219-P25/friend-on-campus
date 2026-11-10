# AI Assistance Disclosure:
# Tool: Codex (model: GPT-6), date: 2026-11-09
# Scope: Share the existing ECS Terraform state between local CLI and GitHub infrastructure runs.
# Author review: I validated correctness, edited for style, and verified with automated tests.

terraform {
  backend "s3" {
    key          = "ecs/terraform.tfstate"
    region       = "ap-southeast-1"
    encrypt      = true
    use_lockfile = true
  }
}
