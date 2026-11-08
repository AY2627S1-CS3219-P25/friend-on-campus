<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-08
Scope: Document the ECS rollout, K3s retirement and manually triggered ARM64 application deployment workflow.
Author review: <to be completed by the author>
-->

# Singapore ECS Terraform

Run Terraform in this directory with fresh state. The nine existing `foc/*` ECR repositories supply the images. The stack adds ECR/ECS deployment permissions to the retained `foc-production-github-actions-cd-role`. Its OIDC trust and identity remain externally managed. The retired K3s configuration is available in Git history.

1. Copy `terraform.tfvars.example` to `terraform.tfvars`. Set a release tag and an ARM64 Debezium 2.7 image. Set `TF_VAR_origin_header` to a stable value generated from 32 random bytes in hexadecimal. Keep Terraform state and the value private.
2. Push `linux/arm64` builds for the six backend services, both frontends and gateway to the existing repositories with that release tag. Use the existing Dockerfiles with the repository root as the build context. Confirm the RabbitMQ, Postgres and Debezium image references also publish ARM64 manifests.
3. Review and apply the `foundation` plan. This creates the CloudFront distribution, load balancers, network, ECS hosts, RDS, broker disks, EFS, task definitions and empty application secret records. RDS creates its own administrator secret. Workload services initially have zero tasks.
4. Add the secret values in Singapore. Save `foc-ecs/auth` with JSON keys `jwt_private_key`, `jwt_public_key`, and `soclaas_api_key`. Run `node generate-runtime-secrets.cjs <private-new-file.json>` from this directory and use that file as the entire value of `foc-ecs/runtime`. Keep the file private and out of the repository. Generate it once for the fresh deployment. Replacing it later requires coordinated password rotation, including the database roles and RabbitMQ cookie.
5. In ECS, run the task from the `database_setup_task` output in the `cluster` output with EC2 launch type. Its default command is `roles`. Wait for exit code zero. Run all six `migration_tasks`, keeping their default `migrate` command. After all pass, run the User, Supplier, Order and Credit tasks again with a container command override of `["seed"]`, in that order. Use the same task definitions. Run the database setup task again with the `setup` container command override `["publications"]`. Review each task's exit status and logs before proceeding.
6. Set `phase = "brokers"`, review and apply. Confirm the three nodes report one cluster with three running members before starting the application services. On a broker host via Systems Manager, run `docker exec <rabbit-container> su-exec rabbitmq rabbitmq-diagnostics cluster_status`. The first broker starts the cluster. The other two join it. On replacement, each slot attaches its retained EBS volume and publishes its new private address.
7. Set `phase = "applications"`, review and apply. Verify the app services are healthy and RabbitMQ consumers have declared their queues with three quorum members where applicable. Set `phase = "live"`, review and apply, then verify the three connectors are processing outbox events. The browser URL is the `public_url` output.
8. To stop after the demo, apply the phases in reverse through `foundation` so workloads drain before hosts stop. Then set `hosts_running = false`. The broker disks, RDS data and EFS checkpoints remain. Stop RDS separately if required. To resume, start RDS, set `hosts_running = true` in foundation and advance through brokers, applications and live without rerunning the fresh seed jobs.

The three single-instance Auto Scaling groups give each broker a fixed disk and node name. Their combined ceiling is three hosts. Verify the trial task sizes under load and after a host replacement. Scaling all services to their ceilings exceeds the fleet's trial CPU budget. This root includes the broker infrastructure for existing consumers. Cross-replica Chat and Notification delivery remains application work.

## Manual application deployment

In GitHub Actions, select **Deploy applications to ECS**, then **Run workflow**. GitHub displays the dispatch button once this workflow is on the repository's default branch. Select the source branch, enter the deployment role ARN, and choose one service or `all`.

- For initial image preparation, clear **Deploy after building**. The run builds ARM64 images and pushes them to the existing ECR repositories. Each build job's summary lists its image tag. Use that tag as Terraform's `image_tag` during the initial rollout.
- For updates to running application services, leave deployment enabled. Apply this stack's GitHub role policy first and ensure the role's OIDC trust permits the selected repository/ref. The run builds all selected images before deployment starts. It pins the selected images by digest, updates services sequentially and checks each rollout completes with the intended task revision. A failed rollout stops subsequent updates. Earlier successful service updates remain deployed.
- Run migrations separately through the existing one-off tasks before deploying releases that require schema changes. The workflow targets the nine application services in `foc-ecs` in Singapore.

Terraform continues to register application task templates. The workflow reads the latest template from each `foc-ecs-<service>` family and owns the revision selected by the application service. Terraform ignores changes to that service's `task_definition` field so a later apply does not revert a workflow deployment. After changing application task configuration in Terraform, apply it and run the workflow to roll out the new template. Broker and CDC task revisions continue to be selected by Terraform.
