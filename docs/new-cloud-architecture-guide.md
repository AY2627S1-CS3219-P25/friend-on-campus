<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-07
Scope: Expanded the team's existing infrastructure write-up into an educational companion with deployment details, cost assumptions, and a glossary.
Author review: <to be completed by the author>
-->

# Friend on Campus cloud architecture guide

This is the detailed companion to the [condensed infrastructure decision write-up](infrastructure/infra-decision.md). It explains how the selected components work together, why the alternatives listed in that write-up behave differently, and what needs to be tested before evaluation. If you're new to AWS, the [beginner glossary](#beginner-glossary) at the end explains the services and terms used here.

## Contents

1. [Architecture at a glance](#architecture-at-a-glance)
2. [Public entry point and frontend hosting](#public-entry-point-and-frontend-hosting)
3. [Backend compute and scaling](#backend-compute-and-scaling)
4. [RabbitMQ and message delivery](#rabbitmq-and-message-delivery)
5. [Debezium and checkpoint storage](#debezium-and-checkpoint-storage)
6. [PostgreSQL on RDS](#postgresql-on-rds)
7. [Demo schedule and cost](#demo-schedule-and-cost)
8. [What to verify before the demo](#what-to-verify-before-the-demo)
9. [Beginner glossary](#beginner-glossary)

## Architecture at a glance

The deployment is in **AWS Singapore (`ap-southeast-1`)**. The detailed diagram and replica counts are in the [decision write-up](infrastructure/infra-decision.md). Two paths explain most of it:

- **Browser traffic.** Browser → public ALB → NGINX → ECS Service Connect → frontend or backend task. NGINX selects the service based on the URL. Service Connect selects a replica of that service.
- **Order and credit events.** A backend commits a database change and an outbox event to PostgreSQL. Debezium reads the committed event and publishes it to RabbitMQ. RabbitMQ routes it to the appropriate queues. Backend consumers process those events and update their own databases.

The **application fleet scales from two to three EC2 hosts**. RabbitMQ has **three separate, fixed EC2 hosts**, so an application scale-in does not remove a broker. The demo places these fleets in one AZ because a full AZ outage is out of scope. The public ALB still uses two AZ subnets, and RDS has a standby in another AZ for database failover. An ALB with two subnets does not make application tasks in a single AZ resilient to losing that AZ.

## Public entry point and frontend hosting

The **public Application Load Balancer (ALB)** accepts HTTPS and secure WebSocket connections. It forwards traffic to healthy NGINX tasks. Two gateway tasks on different hosts let the ALB continue sending new connections to the other gateway when one host fails. Existing WebSocket connections to the failed task may drop and need to reconnect.

**NGINX** keeps the app's routing and access rules. It sends the root path to the student app, `/admin/` to the admin portal, and API and WebSocket paths to the corresponding backend. It also blocks public access to internal credit escrow routes. The routes carry over, but the deployed NGINX configuration must use ECS service endpoints rather than relying on the Docker Compose resolver. For public HTTPS, plan for a hostname and a matching certificate. Check that the ALB, NGINX, and Service Connect timeouts work together for WebSockets. [Current gateway configuration](../gateway/nginx.conf) · [ALB integration with ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/alb.html) · [Service Connect configuration](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect-concepts-deploy.html)

Each portal already builds to static files served by its own NGINX container. Run them as **separate ECS services** so they can deploy and scale independently, while keeping the same browser hostname for frontend, API, and WebSocket traffic. The student app starts at two replicas because it serves the main user flows. The admin portal starts at one and can scale to two. At one replica, its availability after host failure depends on task replacement.

| Alternative in the write-up | Trade-off |
| --- | --- |
| **Expose NGINX directly** | NGINX can serve HTTPS itself. Pointing public DNS at one host is simpler to set up, but a second replica does not automatically take over that address. The ALB provides a shared endpoint and health-based routing. |
| **Amazon API Gateway** | Useful if the team needs managed API features such as per-route throttling. Replacing NGINX would mean recreating route and access rules and handling frontend serving separately. Moving the WebSockets to API Gateway's WebSocket API also changes how the app manages connections and sends messages. If API Gateway is added while keeping existing ingress, it adds request charges. [WebSocket API model](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-overview.html) · [Pricing](https://aws.amazon.com/api-gateway/pricing/) |

## Backend compute and scaling

**ECS on EC2** runs each backend as its own ECS service. Scaling Order Service adds Order tasks without changing the other services. Service Auto Scaling adjusts the task count when configured. An EC2 Auto Scaling group, connected through an ECS capacity provider with managed scaling, can separately add a host when more capacity is needed. If existing hosts have spare room, extra tasks can run without another EC2 instance charge. Running EC2 hosts are billed even while idle. The ECS control plane adds no separate charge for this launch model. Storage, networking, and other services still have their own charges. [ECS pricing](https://aws.amazon.com/ecs/pricing/) · [Service Auto Scaling](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-auto-scaling.html) · [Capacity providers](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/clusters.html)

| What scales | Target range |
| --- | --- |
| Application EC2 fleet | **2–3 `m7g.xlarge` hosts**, each with 4 vCPU and 16 GiB RAM |
| NGINX, student frontend, User, Supplier, Order, Credit, Chat, Notification | **2–3 tasks per service**, with replicas on different hosts where possible |
| Admin frontend | **1–2 tasks** |
| Debezium | **3 fixed tasks**, one active task per connector |
| RabbitMQ | **3 fixed brokers**, each on its own host |

These are **per-service limits**, not a guarantee that every service can reach its maximum simultaneously. The earlier sizing model estimates **29 application-fleet tasks and 11.25 vCPU** at all current maxima, before host overhead. Raising all eight 2–3 services to four would mean **37 tasks and about 14.25 vCPU**, more than the three hosts' 12 vCPU. The estimate assumes 0.125 vCPU for each frontend, backend, or gateway task plus AWS's recommended 0.25 vCPU allowance for its Service Connect proxy, and 0.5 vCPU per Debezium task. Measure actual CPU, memory, task placement, and startup time before setting thresholds or raising selected limits. At the two-host minimum, losing one host leaves only **4 vCPU** on the application fleet until a replacement joins. [Service Connect proxy resources](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect-concepts-deploy.html)

Chat and Notification need a separate correctness check when scaled. A live socket belongs to the process that accepted it. A queue consumer on another replica may handle the event without having that socket. Load balancing incoming connections does not deliver those events across replicas. Verify cross-replica delivery before relying on the two-task production minimum. [Chat socket hub](../services/chat-service/src/ws/hub.ts) · [Notification delivery](../services/notification-service/src/notifications/events.ts)

| Alternative in the write-up | Trade-off |
| --- | --- |
| **ECS on Fargate** | AWS manages the hosts. You pay for requested CPU and RAM for each task while it runs, including quiet periods. Smaller tasks and scaling out can save money if the workload fits, but scaling adds tasks rather than making one task larger. A cluster can use EC2 for some services and Fargate for others. A single service's capacity provider strategy cannot mix the two, so EC2 tasks do not automatically spill over onto Fargate. [Fargate pricing](https://aws.amazon.com/fargate/pricing/) · [ECS compute options](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/capacity-launch-type-comparison.html) |
| **Run containers directly on EC2** | A single host can run different replica counts for each service, but they share one machine's capacity and failure risk. Across hosts, the team would own more of task placement, discovery, replacement, and deployment. |
| **Kubernetes on EKS or k3s** | Both can manage and scale containers. Kubernetes isn't required for this evaluation, so the extra cluster configuration and operational work would need a separate justification. |
| **AWS Lambda** | Lambda scales automatically and supports container images. The migration cost comes from changing how persistent HTTP servers, RabbitMQ consumers, and WebSocket connections run. Lambda can discard idle environments, so some requests wait for initialization. ECS can keep replicas ready, although adding a new task still takes time. [Lambda container images](https://docs.aws.amazon.com/lambda/latest/dg/images-create.html) · [Lambda execution lifecycle](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html) |

## RabbitMQ and message delivery

Run **three RabbitMQ nodes**, one per dedicated EC2 host, each with its own retained **10 GiB gp3 EBS data volume**. A three-member quorum queue has one leader and two followers. RabbitMQ routes operations to that queue's leader and replicates its state. Different queues can have leaders on different nodes. With two members online, the queue can still operate. With only one survivor, it cannot form a majority. That's why all three broker hosts run whenever the system is online, even when the application fleet has only two hosts. [RabbitMQ quorum queues](https://www.rabbitmq.com/docs/quorum-queues)

Clients can connect to any broker in the cluster. The proposed **private NLB** gives the backends and Debezium one AMQP address for new connections to healthy brokers. It serves internal messaging rather than public browser traffic. If a broker connection drops, the client still has to reconnect. Adding an application host does not add a broker. If broker load becomes the bottleneck, first check whether consumers, disk throughput, or a busy queue leader are limiting throughput. You can resize the brokers or distribute queue leaders. Adding broker nodes requires managing queue placement and does not automatically speed up one busy queue.

Each broker writes to its own data directory. Separate EBS volumes keep the disks independent. If a broker task restarts on its original host, it can reuse its mount. If the host fails, ECS does not automatically reattach that existing disk. Recover the node by mounting the retained disk on a replacement in the same AZ, or replace the node and rebuild its queue replicas from the surviving members. During repair, the other two members can continue serving quorum queues. Confirmed publishes and consumer acknowledgements help protect delivery. A retried event can still reach a consumer twice, so credit settlement must handle duplicates safely. [RabbitMQ reliability](https://www.rabbitmq.com/docs/reliability) · [EBS attachment rules](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-attaching-volume.html)

| Alternative in the write-up | Trade-off |
| --- | --- |
| **One RabbitMQ task on EC2** | Lowest operational complexity and disk cost. If its host fails, all messaging waits for recovery. EBS can preserve data but cannot serve it while the broker is down. Two broker nodes also do not solve that problem when both are needed for quorum. |
| **Amazon MQ for RabbitMQ** | AWS operates the broker infrastructure and provides an endpoint. A single broker still has an outage during replacement. A three-node cluster is the like-for-like availability comparison. At the earlier Singapore rates, 14 days of `mq.m7g.medium` compute was about S$80 for one broker or S$240 for three. AWS no longer offers `mq.t3.micro` for new RabbitMQ brokers. [Broker sizes](https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/rmq-broker-instance-types.html) · [Deployment options](https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/rabbitmq-broker-architecture.html) |
| **Amazon SNS and SQS** | SNS distributes events to subscribed queues, and SQS holds events for consumers. They remove broker host management, but replacing RabbitMQ would mean adapting publishers, consumers, routing, retries, and the Debezium delivery path. SQS Standard can deliver duplicates or out of order, so the application still needs safe credit retries. [SNS delivery](https://docs.aws.amazon.com/sns/latest/dg/fifo-message-delivery.html) · [SQS Standard](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues.html) |

## Debezium and checkpoint storage

There are **three Debezium Server tasks**, one each for the Order, User, and Credit databases. Each reads its configured PostgreSQL outbox and publishes to the `campus.events` exchange. The count follows the configured connectors, not the number of RabbitMQ nodes or queues. All three use the same broker endpoint. Each connector has its own replication slot and checkpoint directory. Run one active task per connector. Two copies sharing a slot and checkpoint do not divide the work. [Current connector settings](../docker/debezium/) · [Debezium PostgreSQL connector](https://debezium.io/documentation/reference/connectors/postgresql.html)

**One EFS One Zone filesystem** gives the three connectors separate directories that any eligible ECS host in the demo AZ can mount. If a host fails, the replacement reads the latest stored checkpoint without moving a disk. EBS could also hold these files, but a standard gp3 volume attaches to one host at a time. Moving it to another host would require a same-AZ detach, attach, and mount procedure. The small amount of checkpoint data makes ease of recovery more important than the difference in storage price. EFS alone does not guarantee recovery. PostgreSQL still needs the relevant slot and WAL, and the broker must be reachable. Watch for retained WAL if a connector falls behind. [ECS EFS support](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/efs-volumes.html) · [RDS logical replication](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.FeatureSupport.LogicalReplication.html)

## PostgreSQL on RDS

Use a **private RDS PostgreSQL 16 Multi-AZ DB instance** with a starting size of **`db.t4g.small` and 20 GiB gp3**. The six services keep separate logical databases and credentials on the same instance. The primary handles application reads and writes. A synchronous standby takes over if the primary fails. AWS reports typical database failover of **60–120 seconds**. Application reconnects and Debezium catch-up can extend the full workflow recovery time. Storage can grow automatically if configured. To add compute, resize the instance. A separate read replica can serve suitable queries if needed, but the standby itself does not serve reads. [RDS Multi-AZ](https://aws.amazon.com/rds/features/multi-az/) · [Failover timing](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.Failover.html)

For a fresh evaluation environment, keep the Prisma schemas and migrations. Provision the six databases and roles, update connection URLs and TLS settings, run the existing migrations and seed commands, and enable logical replication in the RDS parameter group. Configure the three connectors with the appropriate replication and table permissions. Start them with fresh checkpoints for the fresh databases. No business logic change is expected from the RDS move itself. [Database bootstrap](../docker/postgres-init/01-init-databases.sql) · [RDS TLS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html)

**PostgreSQL on EC2 with EBS** can cost less if it fits on a host the team already pays for. A single instance would still interrupt reads and writes when that host fails. The team would also own backups, restore testing, and patching, and the database would compete for host capacity. RDS moves those operational responsibilities off the shared hosts and provides the standby used in this design.

## Demo schedule and cost

The cost model uses **144 active hours** for setup, the **12 November 2026 demo**, and requested verification. Storage and both load balancers are retained through the **28 November exam**, estimated at **504 hours**. The detailed figures are in the [decision write-up's cost table](infrastructure/infra-decision.md#demo-and-verification-through-28-november-2026).

| Scenario | Estimated cost including assumed GST |
| --- | ---: |
| Demo baseline with two application hosts and three broker hosts | **S$240** |
| Baseline plus a third application host for up to 24 active hours | **S$247** |
| Three application hosts online for all 144 active hours | **S$284** |
| Continuous production, 730 hours, two to three application hosts | **S$925–1,142 per month** |

These are planning estimates, not a bill or a capacity guarantee. The budget assumes the hosts and RDS are stopped when no verification is needed, light traffic, and an existing HTTPS hostname. EBS, EFS, and retained load balancers still cost money while compute is stopped. The third application host has very little budget headroom. RDS automatically restarts after seven consecutive days stopped, so check it before the exam and stop it again when appropriate. Use the EC2 Auto Scaling group's standby procedure when stopping managed hosts so it does not launch replacements unexpectedly. [RDS stop behavior](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_StopInstance.html) · [EC2 Auto Scaling standby](https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-enter-exit-standby.html)

## What to verify before the demo

1. **Build and start.** Verify the deployed images on ARM64, inject secrets, run migrations and seeding, and check that the gateway can reach all service endpoints.
2. **Try the user flows.** Check both portals, login, live chat translation and the order assistant through SoCLaaS, and the internal escrow route's public block. Chat and Order need outbound HTTPS from the deployment.
3. **Lose one host at a time.** Test an application host and a broker host separately. Check task placement, connector checkpoint recovery, RabbitMQ reconnects, and whether the surviving capacity is enough.
4. **Force RDS failover.** Confirm the app reconnects and all three connectors resume. Submit a transaction around the interruption and verify the order and credit workflow settles within the target, with no missing or duplicate credit movement.
5. **Stop and resume the stack.** Retain the broker data disks and connector checkpoints. Bring the database, brokers, and applications back and run the key user flows again before depending on on-demand verification.

## Beginner glossary

| Term | What it means here |
| --- | --- |
| **Region and Availability Zone (AZ)** | A region is a geographic AWS location. Singapore is our region. An AZ is an isolated location inside that region. Separate hosts protect against a machine failure. Separate AZs protect against losing a whole location when the rest of the design also spans AZs. |
| **VPC and security group** | A VPC is the deployment's private network. A security group controls which connections can reach a resource. For example, the database accepts connections from the deployed application rather than the public internet. |
| **EC2, ECS, Fargate, task, and service** | EC2 provides virtual machines. ECS schedules containers. A **task** is a running unit of one or more containers. An ECS **service** keeps the desired number of tasks running. Fargate runs ECS tasks without the team managing the underlying hosts. |
| **ALB, NGINX, and Service Connect** | The public ALB chooses a healthy gateway. NGINX chooses a service using the URL. Service Connect chooses a replica of that service. |
| **Private NLB and AMQP** | The internal Network Load Balancer gives the app one broker address. AMQP is the protocol the app and Debezium use to talk to RabbitMQ. |
| **EBS, gp3, and EFS** | EBS is a virtual disk. A gp3 volume normally attaches to one host at a time. EFS is a network filesystem that multiple hosts can mount. We use separate broker disks and shared access to connector checkpoints. |
| **RabbitMQ node, exchange, and queue** | A node is a running broker. An exchange routes published messages to queues using routing rules. A queue holds messages for consumers. |
| **Quorum queue** | A queue replicated across broker nodes. With three members, two must be available for the queue to keep working. Each queue has its own leader. |
| **RDS, primary, and standby** | RDS manages the database instance. The primary serves reads and writes. The standby is a ready copy that takes over after failure. |
| **Outbox, CDC, WAL, and offset** | An **outbox** stores events alongside application changes in a database transaction. **Change data capture (CDC)** reads committed changes. PostgreSQL's **write-ahead log (WAL)** records them. An **offset** is Debezium's checkpoint for where to resume. |
| **ECR, Secrets Manager, and CloudWatch** | ECR stores container images. Secrets Manager holds credentials. CloudWatch collects logs and metrics for debugging and monitoring. |
| **Egress and WebSocket** | Egress is outbound network traffic, such as Chat calling SoCLaaS. A WebSocket is a long-lived connection that lets the backend push a message to the browser. |
| **Idempotency** | Handling the same event twice has the same effect as handling it once. For credits, a retried delivery must not apply a second ledger movement. |
