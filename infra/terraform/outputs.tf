# ==============================================================================
# Outputs
# ==============================================================================

output "alb_dns_name" {
  description = "Public HTTP entry point for the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_url" {
  description = "Full URL to access the deployed Friend on Campus platform"
  value       = "http://${aws_lb.main.dns_name}"
}

output "master_instance_id" {
  description = "EC2 instance ID of K3s Master / Data Node"
  value       = aws_instance.k3s_master.id
}

output "master_private_ip" {
  description = "Private IP of K3s Master"
  value       = aws_instance.k3s_master.private_ip
}

output "master_public_ip" {
  description = "Public IP of K3s Master"
  value       = aws_instance.k3s_master.public_ip
}

output "worker_instance_ids" {
  description = "EC2 instance IDs of K3s Worker Nodes"
  value       = aws_instance.k3s_worker[*].id
}

output "worker_private_ips" {
  description = "Private IPs of K3s Worker Nodes"
  value       = aws_instance.k3s_worker[*].private_ip
}

output "worker_public_ips" {
  description = "Public IPs of K3s Worker Nodes"
  value       = aws_instance.k3s_worker[*].public_ip
}

output "ebs_volume_id" {
  description = "Volume ID of persistent gp3 EBS volume mounted at /var/foc-data"
  value       = aws_ebs_volume.data_volume.id
}

output "github_actions_role_arn" {
  description = "IAM Role ARN for GitHub Actions OIDC authentication"
  value       = aws_iam_role.github_actions_cd.arn
}

output "ecr_repository_urls" {
  description = "Map of ECR repository names to registry clone URLs"
  value = {
    for k, v in aws_ecr_repository.services : k => v.repository_url
  }
}

output "ssm_connect_master" {
  description = "Command to connect securely to K3s Master terminal without SSH keys"
  value       = "aws ssm start-session --target ${aws_instance.k3s_master.id}"
}

output "fetch_kubeconfig_command" {
  description = "Command to retrieve cluster kubeconfig to your local machine"
  value       = "aws ssm start-session --target ${aws_instance.k3s_master.id} --document-name AWS-StartInteractiveCommand --parameters command='sudo cat /etc/rancher/k3s/k3s.yaml'"
}
