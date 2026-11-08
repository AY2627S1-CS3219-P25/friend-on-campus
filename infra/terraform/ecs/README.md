<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-08
Scope: Document the inputs and rollout order for the new Terraform root and record retirement of the K3s root.
Author review: <to be completed by the author>
-->

# Singapore ECS Terraform

Run Terraform in this directory with fresh state. The nine existing `foc/*` ECR repositories supply the images. GitHub deployment IAM is outside this stack. The retired K3s configuration is available in Git history.

1. Copy `terraform.tfvars.example` to `terraform.tfvars`. Set a release tag and an ARM64 Debezium 2.7 image. Set `TF_VAR_origin_header` to a stable value generated from 32 random bytes in hexadecimal. Keep Terraform state and the value private.
2. Push `linux/arm64` builds for the six backend services, both frontends and gateway to the existing repositories with that release tag. Use the existing Dockerfiles with the repository root as the build context. Confirm the RabbitMQ, Postgres and Debezium image references also publish ARM64 manifests.
3. Review and apply the `foundation` plan. This creates the CloudFront distribution, load balancers, network, ECS hosts, RDS, broker disks, EFS, task definitions and empty application secret records. RDS creates its own administrator secret. Workload services initially have zero tasks.
4. Add the secret values in Singapore. Save `foc-ecs/auth` with JSON keys `jwt_private_key`, `jwt_public_key`, and `soclaas_api_key`. Run `node generate-runtime-secrets.cjs <private-new-file.json>` from this directory and use that file as the entire value of `foc-ecs/runtime`. Keep the file private and out of the repository. Generate it once for the fresh deployment. Replacing it later requires coordinated password rotation, including the database roles and RabbitMQ cookie.
5. In ECS, run the task from the `database_setup_task` output in the `cluster` output with EC2 launch type. Its default command is `roles`. Wait for exit code zero. Run all six `migration_tasks`, keeping their default `migrate` command. After all pass, run the User, Supplier, Order and Credit tasks again with a container command override of `["seed"]`, in that order. Use the same task definitions. Run the database setup task again with the `setup` container command override `["publications"]`. Review each task's exit status and logs before proceeding.
6. Set `phase = "brokers"`, review and apply. Confirm the three nodes report one cluster with three running members before starting the application services. On a broker host via Systems Manager, run `docker exec <rabbit-container> su-exec rabbitmq rabbitmq-diagnostics cluster_status`. The first broker starts the cluster. The other two join it. On replacement, each slot attaches its retained EBS volume and publishes its new private address.
7. Set `phase = "applications"`, review and apply. Verify the app services are healthy and RabbitMQ consumers have declared their queues with three quorum members where applicable. Set `phase = "live"`, review and apply, then verify the three connectors are processing outbox events. The browser URL is the `public_url` output.
8. To stop after the demo, apply the phases in reverse through `foundation` so workloads drain before hosts stop. Then set `hosts_running = false`. The broker disks, RDS data and EFS checkpoints remain. Stop RDS separately if required. To resume, start RDS, set `hosts_running = true` in foundation and advance through brokers, applications and live without rerunning the fresh seed jobs.

The three single-instance Auto Scaling groups give each broker a fixed disk and node name. Their combined ceiling is three hosts. Verify the trial task sizes under load and after a host replacement. Scaling all services to their ceilings exceeds the fleet's trial CPU budget. This root includes the broker infrastructure for existing consumers. Cross-replica Chat and Notification delivery remains application work.
