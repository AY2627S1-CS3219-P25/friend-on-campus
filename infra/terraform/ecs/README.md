<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-08 to 2026-11-09
Scope: Document the ECS rollout, K3s retirement and manually triggered ARM64 application deployment workflow; updated across 7 AI-assisted revisions through D4 wrap-up (repair documentation references after consolidation and align factual setup/count wording; preserve authorization policy).
Author review: I validated correctness, edited for style, and verified with automated tests.
-->

# Singapore ECS Terraform

For an existing deployment, follow the GitHub delivery setup below and migrate its existing state to S3. For a fresh deployment, configure an empty S3 backend before the initial rollout. Terraform 1.10 or newer is required for S3 state locking. The nine existing `foc/*` ECR repositories supply the images. The stack adds ECR/ECS deployment permissions to the retained `foc-production-github-actions-cd-role`. Its OIDC trust and identity remain externally managed. The retired K3s configuration is available in Git history.

1. Copy `terraform.tfvars.example` to `terraform.tfvars`. Set a release tag and an ARM64 Debezium 2.7 image. Set `TF_VAR_origin_header` to a stable value generated from 32 random bytes in hexadecimal. Keep Terraform state and the value private.
2. Push `linux/arm64` builds for the six backend services, both frontends and gateway to the existing repositories with that release tag. Use the existing Dockerfiles with the repository root as the build context. Confirm the RabbitMQ, Postgres and Debezium image references also publish ARM64 manifests.
3. Review and apply the `foundation` plan. This creates the CloudFront distribution, load balancers, network, ECS hosts, RDS, broker disks, EFS, task definitions and empty application secret records. RDS creates its own administrator secret. Workload services initially have zero tasks.
4. Add the secret values in Singapore. Save `foc-ecs/auth` with JSON keys `jwt_private_key`, `jwt_public_key`, and `soclaas_api_key`. Run `node generate-runtime-secrets.cjs <private-new-file.json>` from this directory and use that file as the entire value of `foc-ecs/runtime`. Keep the file private and out of the repository. Generate it once for the fresh deployment. Replacing it later requires coordinated password rotation, including the database roles and RabbitMQ cookie.
5. In ECS, run the task from the `database_setup_task` output in the `cluster` output with EC2 launch type. Its default command is `roles`. Wait for exit code zero. Run all six `migration_tasks`, keeping their default `migrate` command. After all pass, run the User, Supplier, Order and Credit tasks again with a container command override of `["seed"]`, in that order. Use the same task definitions. Run the database setup task again with the `setup` container command override `["publications"]`. Review each task's exit status and logs before proceeding.
6. Set `phase = "brokers"`, review and apply. Confirm the three nodes report one cluster with three running members before starting the application services. On a broker host via Systems Manager, run `docker exec <rabbit-container> su-exec rabbitmq rabbitmq-diagnostics cluster_status`. The first broker starts the cluster. The other two join it. On replacement, each slot attaches its retained EBS volume and publishes its new private address.
7. Set `phase = "applications"`, review and apply. Verify the app services are healthy and RabbitMQ consumers have declared their queues with three quorum members where applicable. Set `phase = "live"`, review and apply, then verify the three connectors are processing outbox events. The browser URL is the `public_url` output.
8. To stop after the demo, apply the phases in reverse through `foundation` so workloads drain before hosts stop. Then set `hosts_running = false`. The broker disks, RDS data and EFS checkpoints remain. Stop RDS separately if required. To resume, start RDS, set `hosts_running = true` in foundation and advance through brokers, applications and live without rerunning the fresh seed jobs.

New registrations receive their credit wallets through `user.registered` events delivered by `cdc-user` and RabbitMQ. The `applications` phase leaves all three CDC services at zero tasks. Complete the `live` phase before testing registration credits, order processing or event-driven notifications. Existing committed outbox events are captured when the connectors start.

The Debezium 2.7 image runs as UID `185`, GID `0`, and its checkpoint directory is owned by `185:0`. The EFS access points use those same IDs so Docker can initialize the checkpoint mount. A group mismatch can prevent container creation with `failed to chown ... operation not permitted`, before any connector logs appear. Access-point replacements retain the connector paths on the existing EFS file system.

The three single-instance Auto Scaling groups give each broker a fixed disk and node name. Their combined ceiling is three hosts. Verify the trial task sizes under load and after a host replacement. Scaling all services to their ceilings exceeds the fleet's trial CPU budget. This root includes the broker infrastructure for existing consumers. Cross-replica Chat and Notification delivery is implemented in the application through RabbitMQ fanout and SQL realtime outboxes; see the [messaging reference](../../../docs/infrastructure/cdc-and-broker.md#realtime-delivery). Verify the deployed image revisions and multi-client recovery before claiming the live deployment provides that behavior.

The User seed sets `alice@u.nus.edu`, `bob@u.nus.edu` and `admin@nus.edu.sg` to `Password123!` in every environment, including production. Each account receives a separately salted scrypt hash in the database. The runtime generator creates the database and RabbitMQ secrets. Existing runtime files may retain older `seed_password_*` fields, but the updated seed takes its password directly from the seed code. Preserve the current database and RabbitMQ credentials when updating an existing deployment.

To reset existing demo accounts through seeding, deploy the updated User Service image, then run the latest `foc-ecs-migrate-user` task on EC2 with the `migrate` container command overridden to `seed`. Confirm exit code zero. Routine delivery runs migrations, so resetting demo passwords requires this explicit seed task. The application also exposes authenticated `PUT /api/users/me/password` with `currentPassword` and `newPassword` for individual password changes.

## Manual application deployment

Merge the release into `main` and wait for that commit's CI run to succeed. In GitHub Actions, select **Deploy applications to ECS**, then **Run workflow**. Select `main`, choose one service or `all`, and leave **Deploy after building** enabled. The role ARN defaults to the `AWS_DEPLOY_ROLE_ARN` repository variable, with an optional input override. Both delivery workflows require manual dispatch and run only from `main`. A queued application run for a superseded main commit is skipped. Builds and deployment scripts use the selected commit SHA throughout the run.

- For initial image preparation, clear **Deploy after building**. The run builds ARM64 images and pushes them to the existing ECR repositories. Each build job's summary lists its image tag. Use that tag as Terraform's `image_tag` during the initial rollout.
- For updates to running application services, the run builds all selected images before deployment starts. It checks all selected services and image digests, then runs the selected backend migration tasks using those new images. A failed or unplaceable migration stops the release before any application service is updated. The migration task command is explicitly `migrate`. Seeds and database-role setup remain part of the initial rollout.
- After migrations succeed, it pins images by digest, updates services sequentially and checks each rollout completes with the intended task revision. A failed rollout stops subsequent updates. Earlier successful service updates and committed migrations remain deployed. Schema migrations must remain compatible with the application version running during the rollout.
- Choosing `all` includes shared-package changes. A single-service selection builds and migrates only that service. The workflow targets the nine application services in `foc-ecs` in Singapore.

Image builds use GitHub's native `ubuntu-24.04-arm` runners with the `linux/arm64` Docker target. This avoids the QEMU illegal-instruction crash observed during the Supplier image's `npm ci` step on an x64 runner. [GitHub runner architectures](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)

Terraform continues to register application task templates. The workflow reads the latest template from each `foc-ecs-<service>` family and owns the revision selected by the application service. Terraform ignores changes to that service's `task_definition` field so a later apply does not revert a workflow deployment. The infrastructure workflow below applies and rolls updated application templates with the deployed images. After a local Terraform apply, explicitly roll the affected application services to their new task revisions. Broker and CDC task revisions continue to be selected by Terraform.

## One-time GitHub delivery setup

### Verify AWS sign-in

After the updated workflow is merged into `main`, open **Actions → Deploy applications to ECS → Run workflow**. Select `main`, enter the retained deployment role ARN and enable **Only print the OIDC subject and test AWS sign-in**. This mode skips image builds, migrations and deployment, and can run before CI has succeeded.

The job summary prints the actual OIDC subject, including immutable organization/repository IDs when GitHub uses them. The token itself is kept private. In AWS, open **IAM → Roles → foc-production-github-actions-cd-role → Trust relationships → Edit trust policy**. Keep the GitHub federated provider and `sts:AssumeRoleWithWebIdentity`, set `token.actions.githubusercontent.com:aud` to `sts.amazonaws.com`, and set `token.actions.githubusercontent.com:sub` to the exact printed subject using `StringEquals`. Rerun the access check. An organization policy denying STS requires the sandbox administrator's assistance.

In the repository, open **Settings → Secrets and variables → Actions → Variables → New repository variable**. Add `AWS_DEPLOY_ROLE_ARN` with the role ARN after the check succeeds. The workflow can then use it without an ARN input on every run.

### Move the existing Terraform state to S3

Use the PowerShell window with the existing `foc` login and original `TF_VAR_origin_header`. Keep the current `terraform.tfvars`, including its working phase and image settings. Back up the state privately before migration. The state and saved plans can contain secret values.

```powershell
Set-Location 'C:\Users\User\Documents\NUS\CS3219\friend-on-campus\infra\terraform\ecs'
$env:AWS_PROFILE = 'foc'
Copy-Item -LiteralPath terraform.tfstate -Destination "$env:USERPROFILE\foc-state-backup-$(Get-Date -Format yyyyMMddHHmmss).json"
terraform version
```

Upgrade the local Terraform CLI if it is older than 1.10. Create a private, versioned S3 bucket in Singapore using an available bucket name. For example, the following commands create the bucket and enable versioning and all public-access blocks. If your team already created the state bucket, reuse it.

```powershell
$stateBucket = 'foc-terraform-state-891498120071'
aws s3api create-bucket --bucket $stateBucket --region ap-southeast-1 --create-bucket-configuration LocationConstraint=ap-southeast-1 --profile foc
aws s3api put-bucket-versioning --bucket $stateBucket --versioning-configuration Status=Enabled --region ap-southeast-1 --profile foc
aws s3api put-public-access-block --bucket $stateBucket --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true --region ap-southeast-1 --profile foc
terraform init -migrate-state "-backend-config=bucket=$stateBucket"
```

Confirm the prompt to copy the existing state. Then run `terraform state list` and verify the existing resources, including `aws_ecs_cluster.main`, are present. The shared key is `ecs/terraform.tfstate`. The backend enables server-side encryption and S3 lockfiles. Keep the bucket and state when stopping the application. Future local runs use the same backend. Avoid simultaneous local and GitHub infrastructure changes.

Apply the updated application-role policy locally before enabling release migrations.

```powershell
terraform plan "-out=github-delivery.tfplan"
terraform apply "github-delivery.tfplan"
```

Review the plan before applying. This policy grants migration task execution and task inspection in `foc-ecs`, in addition to the existing image-push and application-rollout permissions.

### Configure infrastructure delivery

The infrastructure workflow requires an AWS OIDC role authorized to manage the resources in this Terraform root, including its IAM resources. The retained application role has application delivery permissions. Ask the sandbox administrator to provide an infrastructure role if your team cannot create one with the required permissions. Its trust policy must match the exact main-branch OIDC subject printed by the workflow.

The infrastructure role and local Terraform identity also need the following state permissions.

| Resource | Actions |
|---|---|
| State bucket | `s3:ListBucket` |
| `ecs/terraform.tfstate` | `s3:GetObject`, `s3:PutObject` |
| `ecs/terraform.tfstate.tflock` | `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` |

Under **Settings → Secrets and variables → Actions**, add these repository settings.

| Kind | Name | Value |
|---|---|---|
| Variable | `AWS_INFRA_ROLE_ARN` | The infrastructure role ARN |
| Variable | `TF_STATE_BUCKET` | The bucket used in the state migration |
| Secret | `TERRAFORM_TFVARS` | The entire contents of your current working `terraform.tfvars` |
| Secret | `TF_VAR_ORIGIN_HEADER` | The existing private origin header value |

Keep the JWT keys and database/RabbitMQ credentials in AWS Secrets Manager. These workflows use the existing ECS task secret references. Saved plan files and Terraform state are excluded from Git and are never uploaded as GitHub artifacts.

## Manual infrastructure delivery

Merge the infrastructure change into `main`. Open **Actions → Deploy ECS infrastructure → Run workflow**, select `main` and leave **Apply the plan** unchecked to preview the plan in the run logs. After reviewing it, dispatch again with **Apply the plan** checked. The apply run generates a fresh plan from that run's main commit and applies that saved plan.

The workflow requires the migrated remote state to exist and contain the ECS cluster before planning. Application and infrastructure delivery share one GitHub concurrency group, and Terraform uses S3 state locking. After applying, the workflow rolls all active application services using the newest task configuration while preserving each service's currently deployed image. It skips application migrations in this configuration-only rollout. For changes that also modify application source or schema, run the application delivery workflow afterwards.

Use this workflow for updates to the running stack. Keep stop/resume and initial provisioning on the phased rollout above. Terraform controls broker and CDC revisions. Changes to EC2 launch templates retain the existing Auto Scaling Group replacement behavior and may require a controlled host replacement to reach existing hosts.

The first preview should match the existing deployment. A plan that recreates the stack indicates a state or input mismatch that must be corrected before applying.

References include [GitHub OIDC with AWS](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws), [Terraform S3 state and permissions](https://developer.hashicorp.com/terraform/language/backend/s3), and [Terraform state migration](https://developer.hashicorp.com/terraform/cli/commands/init).
