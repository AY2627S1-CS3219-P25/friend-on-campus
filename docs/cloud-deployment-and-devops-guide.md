# The Complete Student Guide to Cloud Deployment, Kubernetes & DevOps
## Architecture, Infrastructure as Code, CI/CD, and Distributed Load Testing

> **Course**: NUS CS3219 Software Design and Architecture (AY26/27 S1)  
> **Project**: Friend on Campus (`campuserrand`)  
> **Course Rubric Mapping**: Category N4 (Cloud Deployment & Automated Scaling) + Category N3 (Testing, Reliability & Concurrency)  
> **Target Audience**: Students, teammates, and developers learning cloud engineering and preparing for Milestone D4 deliverables.

---

## Table of Contents

1. [Introduction: From Local Laptop to Production Cloud](#1-introduction-from-local-laptop-to-production-cloud)
   * [1.1 The Microservices Dilemma: Why Not Just `docker-compose up` on a VM?](#11-the-microservices-dilemma-why-not-just-docker-compose-up-on-a-vm)
   * [1.2 Architectural Decision: General Compute (EC2) vs. Managed Cloud (RDS/EKS)](#12-architectural-decision-general-compute-ec2-vs-managed-cloud-rdseks)
   * [1.3 The Two-Tier Node Separation Principle](#13-the-two-tier-node-separation-principle)
   * [1.4 The S\$50 SGD Student Budget Constraint: How We Keep Costs Low](#14-the-s50-sgd-student-budget-constraint-how-we-keep-costs-low)
2. [Infrastructure as Code (IaC) with Terraform & AWS](#2-infrastructure-as-code-iac-with-terraform--aws)
   * [2.1 What is Infrastructure as Code and Why Does It Matter?](#21-what-is-infrastructure-as-code-and-why-does-it-matter)
   * [2.2 How Terraform Works Under the Hood](#22-how-terraform-works-under-the-hood)
   * [2.3 How Terraform Authenticates with AWS (IAM Identity Center / SSO)](#23-how-terraform-authenticates-with-aws-iam-identity-center--sso)
   * [2.4 File-by-File Breakdown of `infra/terraform/`](#24-file-by-file-breakdown-of-infraterraform)
     * [`versions.tf`](#versionstf)
     * [`variables.tf`](#variablestf)
     * [`vpc.tf`](#vpctf)
     * [`security_groups.tf`](#security_groupstf)
     * [`iam.tf`](#iamtf)
     * [`ebs.tf`](#ebstf)
     * [`ec2.tf`](#ec2tf)
     * [`alb.tf`](#albtf)
     * [`ecr.tf`](#ecrtf)
     * [`outputs.tf`](#outputstf)
     * [`terraform.tfvars.example`](#terraformtfvarsexample)
3. [Container Orchestration with Lightweight Kubernetes (K3s)](#3-container-orchestration-with-lightweight-kubernetes-k3s)
   * [3.1 The Container Evolution: Bare Metal $\to$ VMs $\to$ Docker Compose $\to$ Kubernetes](#31-the-container-evolution-bare-metal-to-vms-to-docker-compose-to-kubernetes)
   * [3.2 Why K3s over Upstream EKS or Docker Swarm?](#32-why-k3s-over-upstream-eks-or-docker-swarm)
   * [3.3 The 7 Core Kubernetes Primitives in Plain English](#33-the-7-core-kubernetes-primitives-in-plain-english)
   * [3.4 File-by-File Breakdown of `infra/k8s/`](#34-file-by-file-breakdown-of-infrak8s)
     * [`00-namespace.yaml`](#00-namespaceyaml)
     * [`01-configmaps-secrets.yaml`](#01-configmaps-secretsyaml)
     * [`02-storage.yaml`](#02-storageyaml)
     * [`03-stateful-data.yaml`](#03-stateful-datayaml)
     * [`04-stateless-services.yaml`](#04-stateless-servicesyaml)
     * [`05-frontends-gateway.yaml`](#05-frontends-gatewayyaml)
     * [`06-ingress.yaml`](#06-ingressyaml)
     * [`07-hpa.yaml`](#07-hpayaml)
4. [Continuous Delivery (CD) with GitHub Actions & AWS](#4-continuous-delivery-cd-with-github-actions--aws)
   * [4.1 Continuous Delivery vs. Continuous Deployment](#41-continuous-delivery-vs-continuous-deployment)
   * [4.2 The Stateless Apps vs. Stateful Database Dilemma](#42-the-stateless-apps-vs-stateful-database-dilemma)
   * [4.3 Database Migrations & The Expand-Contract Pattern](#43-database-migrations--the-expand-contract-pattern)
   * [4.4 Keyless Cloud Security with GitHub Actions & AWS IAM OIDC](#44-keyless-cloud-security-with-github-actions--aws-iam-oidc)
   * [4.5 Multi-Architecture Container Builds (Apple Silicon vs. AWS AMD64)](#45-multi-architecture-container-builds-apple-silicon-vs-aws-amd64)
   * [4.6 SSH-Free Remote Deployment via AWS Systems Manager (SSM)](#46-ssh-free-remote-deployment-via-aws-systems-manager-ssm)
   * [4.7 File-by-File Breakdown of Workflows](#47-file-by-file-breakdown-of-workflows)
     * [`.github/workflows/ci.yml`](#githubworkflowsciyml)
     * [`.github/workflows/deploy.yml`](#githubworkflowsdeployyml)
5. [Distributed Load & Concurrency Testing with k6](#5-distributed-load--concurrency-testing-with-k6)
   * [5.1 Why k6 over Apache JMeter or Apache Bench?](#51-why-k6-over-apache-jmeter-or-apache-bench)
   * [5.2 Scenario A: Race Condition Verification (`order-claim-race.js`)](#52-scenario-a-race-condition-verification-order-claim-racejs)
   * [5.3 Scenario B: Discovery Traffic Spikes & Live Autoscaling (`discovery-load.js`)](#53-scenario-b-discovery-traffic-spikes--live-autoscaling-discovery-loadjs)
   * [5.4 Fulfilling CS3219 Rubric Categories N3 & N4 for Milestone D4](#54-fulfilling-cs3219-rubric-categories-n3--n4-for-milestone-d4)
6. [Operations, Troubleshooting & Student Runbook](#6-operations-troubleshooting--student-runbook)
   * [6.1 Day-to-Day Operations: Connecting to Instances via AWS SSM](#61-day-to-day-operations-connecting-to-instances-via-aws-ssm)
   * [6.2 Controlling K3s Remotely via `kubectl`](#62-controlling-k3s-remotely-via-kubectl)
   * [6.3 Everyday Diagnosis & Log Triage Commands](#63-everyday-diagnosis--log-triage-commands)
   * [6.4 Preserving the Student Budget (Nightly Stop & Resume)](#64-preserving-the-student-budget-nightly-stop--resume)
   * [6.5 Clean Teardown (`terraform destroy`)](#65-clean-teardown-terraform-destroy)

---

## 1. Introduction: From Local Laptop to Production Cloud

### 1.1 The Microservices Dilemma: Why Not Just `docker-compose up` on a VM?
When developing locally, launching the entire **Friend on Campus** ecosystem is simple: you type `docker-compose up -d`. In seconds, Docker spins up:
* 6 NestJS/Express microservices (`user-service`, `supplier-service`, `order-service`, `credit-service`, `notification-service`, `chat-service`)
* 2 React SPAs (`student-app`, `admin-portal`)
* 1 NGINX reverse-proxy API Gateway
* 1 PostgreSQL 16 database server (hosting 6 isolated databases)
* 1 RabbitMQ 3.13 message broker
* 3 Debezium Server 2.7 CDC connectors

Why can't we simply rent an Amazon EC2 virtual machine, install Docker, run `docker-compose up -d`, and call it a day?

While running Docker Compose on a single VM is fine for quick prototypes, it suffers from fatal flaws in a production distributed system:
1. **Single Point of Failure (SPOF)**: If that single VM runs out of memory, crashes its kernel, or suffers a hardware fault in the AWS availability zone, every microservice and the database crash together.
2. **Zero Autoscaling**: If campus lunch time arrives and 500 students simultaneously browse errands, Docker Compose cannot dynamically launch additional container replicas on demand.
3. **Downtime During Updates**: When you rebuild a container image and run `docker compose up -d`, Docker stops the old container before starting the new one. In-flight HTTP transactions are abruptly severed, and users experience HTTP 502 Bad Gateway errors.
4. **Lack of Dynamic Health Recovery**: If a microservice enters a deadlocked state where its process is technically running but unable to serve requests, Docker Compose does not automatically replace it with a fresh container.

To solve these problems in modern software architecture, industry relies on **Container Orchestration (Kubernetes)**.

---

### 1.2 Architectural Decision: General Compute (EC2) vs. Managed Cloud (RDS/EKS)

In CS3219, students frequently ask: *"Should we use AWS managed services like AWS RDS for PostgreSQL, Amazon MQ for RabbitMQ, and AWS EKS for Kubernetes?"*

For our architecture, we deliberately chose **General-Purpose Compute (Amazon EC2 Instances + EBS Volumes)** to run our containerized infrastructure:

```mermaid
flowchart LR
    subgraph ManagedPaaS["Managed Services (AWS PaaS)"]
        RDS["AWS RDS Postgres<br/>• Restricted superuser<br/>• Complex CDC configuration<br/>• ~$30/mo"]
        EKS["AWS EKS<br/>• Proprietary control plane<br/>• $73/mo fixed fee<br/>• Burns student budget"]
        MQ["Amazon MQ<br/>• Managed broker<br/>• ~$25/mo"]
    end

    subgraph IaaSModel["Our Architecture (IaaS + Containers)"]
        EC2["EC2 Instances (t3.medium)<br/>• Standard Linux OS<br/>• 100% Cloud-Agnostic<br/>• ~$1.20/day"]
        K3s["K3s Lightweight K8s<br/>• $0 control plane fee<br/>• 100% upstream K8s manifests<br/>• Runs on EC2"]
        SelfDB["PostgreSQL 16 on EBS<br/>• Native CDC wal_level=logical<br/>• Automated 6-DB initialization<br/>• Single-digit dollar cost"]
    end
```

#### Comparative Evaluation

| Architectural Dimension | Self-Managed on EC2 (IaaS + EBS) | AWS Managed Services (RDS + EKS + MQ) |
| :--- | :--- | :--- |
| **Change Data Capture (Debezium CDC)** | **Native & Flawless**: PostgreSQL runs with `-c wal_level=logical`. Logical replication slots and `pgoutput` function identically to local development. | **Complex & Constrained**: AWS RDS restricts superuser access, requires custom parameter groups (`rds.logical_replication=1`), manual replication grants, and unmonitored slots can lock disk space. |
| **Multi-Database Initialization** | **Automated via Init Script**: Mounts `01-init-databases.sql` on first boot, creating 6 isolated databases and 6 dedicated users with restricted grants. | **Manual Network Scripts**: RDS provides no `/docker-entrypoint-initdb.d/` mechanism. Requires running external SQL scripts over the public internet. |
| **Cost & Budget Control** | **Predictable & Budget-Friendly**: 3 `t3.medium` instances run the entire cluster for $\approx$\$4.50 USD/day, well within the NUS S\$50 SGD student cap. | **Prohibitive for Students**: AWS EKS control plane alone costs **\$73.00 USD/month** before compute! Adding RDS (\$30/mo) and Amazon MQ (\$25/mo) would exhaust student credits in days. |
| **Cloud Portability (Course Theme)** | **100% Cloud-Agnostic**: The exact same K8s manifests and Docker containers run identically on AWS, Google Cloud (GCP), Microsoft Azure, or bare-metal servers. | **Vendor Lock-In**: Deep dependency on proprietary AWS-specific APIs, parameter groups, and control planes. |

> [!NOTE]
> **Academic Takeaway for Milestone D4**: Choosing self-managed PostgreSQL on EC2 backed by durable EBS storage is not a "shortcut"—it is a defensible, production-grade architectural decision that preserves Database-per-Service isolation, guarantees Change Data Capture compatibility, and respects realistic fiscal limits.

---

### 1.3 The Two-Tier Node Separation Principle

In a distributed architecture, workloads fall into two distinct categories:
1. **Stateful Workloads**: Services that store data on disk and cannot be casually killed or duplicated (PostgreSQL 16, RabbitMQ message logs, Debezium CDC replication offsets).
2. **Stateless Workloads**: Services that process requests in memory and persist state to an external database or broker (`order-service`, `credit-service`, `user-service`, frontends, API gateway).

Mixing these two haphazardly across a cluster causes operational headaches. If Kubernetes randomly moves a PostgreSQL database pod between worker nodes, that database loses access to its underlying disk storage!

To solve this cleanly, our cluster implements the **Two-Tier Node Separation Principle**:

```mermaid
flowchart TB
    subgraph Internet["Public Internet"]
        Students["Students & Couriers"]
        Admins["System Administrators"]
    end

    subgraph AWS_VPC["AWS VPC (10.0.0.0/16) — Region: ap-southeast-1"]
        ALB["AWS Application Load Balancer (ALB)<br/>• Port 80 (HTTP) & Port 443 (HTTPS)<br/>• Health Probes to Cluster Nodes"]

        subgraph Cluster["3-Node K3s Kubernetes Cluster"]
            subgraph Node1["Node 1: Stateful Data Node (t3.medium)<br/>Label: foc.role=data-node"]
                K3sMaster["K3s Control Plane Server"]
                Postgres["PostgreSQL 16 (6 Logical DBs)"]
                RabbitMQ["RabbitMQ 3.13 (Quorum Queues)"]
                Debezium["Debezium Server 2.7 (User, Order, Credit)"]
                EBS[("50GB gp3 Amazon EBS<br/>Mounted at /var/foc-data")]
                Postgres --- EBS
                RabbitMQ --- EBS
                Debezium --- EBS
            end

            subgraph Node2["Node 2: Stateless Worker 1 (t3.medium)<br/>Label: foc.role=worker-node"]
                Ingress1["Traefik Ingress Controller"]
                Gateway1["api-gateway (NGINX)"]
                OrderSvc1["order-service (Pod 1)"]
                CreditSvc1["credit-service (Pod 1)"]
                UserSvc1["user-service (Pod 1)"]
                Frontends1["student-app & admin-portal"]
            end

            subgraph Node3["Node 3: Stateless Worker 2 (t3.medium)<br/>Label: foc.role=worker-node"]
                Ingress2["Traefik Ingress Controller"]
                Gateway2["api-gateway (NGINX)"]
                OrderSvc2["order-service (Pod 2)"]
                CreditSvc2["credit-service (Pod 2)"]
                UserSvc2["user-service (Pod 2)"]
                Frontends2["student-app & admin-portal"]
            end
        end
    end

    Students -->|HTTPS / Port 443| ALB
    Admins -->|HTTPS / Port 443| ALB

    ALB -->|Forward Port 80| Ingress1
    ALB -->|Forward Port 80| Ingress2

    Ingress1 --> Gateway1
    Ingress2 --> Gateway2

    Gateway1 --> OrderSvc1
    Gateway2 --> OrderSvc2

    OrderSvc1 <-->|Flannel Overlay Network| Postgres
    OrderSvc2 <-->|Flannel Overlay Network| Postgres
    OrderSvc1 <-->|Flannel Overlay Network| RabbitMQ
    OrderSvc2 <-->|Flannel Overlay Network| RabbitMQ
```

* **Node 1 (Data Node)**: Fixed network identity, attached to an encrypted 50GB gp3 EBS volume. All stateful containers are pinned here using Kubernetes `nodeSelector: { foc.role: "data-node" }`.
* **Nodes 2 & 3 (Stateless Worker Nodes)**: Host microservices and frontends. If traffic spikes, Kubernetes spins up more replicas dynamically across these workers. If Node 3 crashes, Node 2 immediately shoulders the traffic.

---

### 1.4 The S\$50 SGD Student Budget Constraint: How We Keep Costs Low

The National University of Singapore provisions student AWS accounts with a strict S\$50 SGD credit allocation. Exceeding this budget causes the account to be locked. Our infrastructure is specifically engineered to maximize learning while minimizing cost:

1. **Zero Control-Plane Tax**: We use K3s instead of AWS EKS, avoiding the fixed \$73 USD/month EKS control plane surcharge.
2. **Right-Sized Instances**: We use 3 $\times$ `t3.medium` instances (2 vCPUs, 4GB RAM each). Total compute cost is approximately \$0.052 per instance-hour $\times$ 3 = **\$0.156/hour** ($\approx$\$3.74 USD / S\$5.00 SGD per 24 hours of continuous runtime).
3. **ECR Image Lifecycle Management**: Private Docker image registries incur storage costs (\$0.10/GB/month). We enforce an automated lifecycle policy in `ecr.tf` that purges untagged images older than 3 days and retains at most 10 images per microservice.
4. **Nightly Shutdown Support**: When you finish working for the day, stopping the 3 EC2 instances reduces the running cost to nearly zero (you only pay $\approx$\$0.10/day for the idle EBS volume storage).

---

## 2. Infrastructure as Code (IaC) with Terraform & AWS

### 2.1 What is Infrastructure as Code and Why Does It Matter?
In the early days of cloud computing, engineers logged into the AWS Management Console and clicked through web menus to create virtual machines, subnets, and firewalls.

This manual approach ("ClickOps") has severe flaws:
* **Human Error**: It is easy to forget to check a checkbox or mistype an IP CIDR block.
* **Configuration Drift**: If someone changes a firewall rule late at night, nobody else knows what changed or why.
* **Snowflake Environments**: You cannot easily recreate an identical copy of your staging environment in production.

**Infrastructure as Code (IaC)** solves this by defining all cloud resources—virtual networks, virtual machines, firewalls, and storage disks—in declarative code files checked into Git. With IaC, your cloud infrastructure is versioned, reviewed via Pull Requests, and reproducible with a single command.

---

### 2.2 How Terraform Works Under the Hood

Terraform by HashiCorp is the industry-standard open-source IaC tool. It follows a **declarative model**: you declare *what* resources you want, and Terraform calculates *how* to create or update them to reach that target state.

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer
    participant TF as Terraform CLI
    participant State as State File (terraform.tfstate)
    participant AWS as AWS Cloud APIs

    Dev->>TF: Run 'terraform plan'
    TF->>AWS: Read live cloud reality (Query VPCs, Instances, SGs)
    TF->>State: Read recorded cloud state
    TF->>TF: Construct Directed Acyclic Graph (DAG) of dependencies
    TF->>Dev: Show Diff (+ 46 to add, ~ 0 to change, - 0 to destroy)
    
    Dev->>TF: Run 'terraform apply'
    TF->>AWS: Dispatch API calls (Create VPC, Subnets, EC2, EBS)
    AWS-->>TF: Cloud resources provisioned (IDs, IPs, DNS)
    TF->>State: Write new IDs and ARNs to terraform.tfstate
    TF->>Dev: Apply complete! Outputs ALB DNS and instance IPs
```

#### Core Terraform Concepts:
* **State File (`terraform.tfstate`)**: A JSON document that acts as Terraform's memory. It records the mapping between your code declarations and actual AWS resource IDs (e.g., mapping `aws_vpc.main` to `vpc-0a817b12`).
* **Providers**: Plugins that know how to interact with external APIs. We use the official `hashicorp/aws` provider.
* **Dependency Graph (DAG)**: Terraform automatically analyzes references between resources. For example, because `aws_subnet.public_a` references `aws_vpc.main.id`, Terraform knows it must create the VPC *before* creating the subnet.
* **The 4 Essential Commands**:
  1. `terraform init`: Downloads the required provider plugins (like the AWS SDK plugin) and initializes the local backend.
  2. `terraform plan`: Performs a dry-run comparison between your code, the state file, and live AWS reality, printing a diff of proposed actions without making changes.
  3. `terraform apply`: Executes the API calls to make AWS match your code.
  4. `terraform destroy`: Safely tears down and deletes every resource declared in the code, returning cloud spend to zero.

---

### 2.3 How Terraform Authenticates with AWS (IAM Identity Center / SSO)

Our university provides AWS access through **AWS IAM Identity Center (Single Sign-On)**.

Unlike legacy setups where developers stored permanent secret keys (`AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`) on their machines (which risks catastrophic leaks if pushed to GitHub), IAM Identity Center issues **short-lived temporary credentials**:

1. You authenticate via your web browser:
   ```bash
   aws sso login
   ```
2. The AWS CLI verifies your identity with NUS Single Sign-On and receives a temporary session token valid for a limited window.
3. When you run `terraform plan` or `terraform apply`, Terraform reads the active profile from your `~/.aws/config`:
   ```ini
   [profile default]
   sso_session = nus
   sso_account_id = 891498120071
   sso_role_name = nusisb_IsbUsersPS
   region = ap-southeast-1
   ```
4. Terraform automatically calls the AWS Security Token Service (STS) to assume this role and manage resources securely.

---

### 2.4 File-by-File Breakdown of `infra/terraform/`

Every file in our `infra/terraform/` directory serves a clear, modular role:

#### `versions.tf`
Specifies the minimum Terraform engine version ($\ge 1.5.0$) and requires the official `hashicorp/aws` provider ($\sim 5.0$). It also defines **Default Tags**:
```hcl
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "friend-on-campus"
      Environment = var.environment
      ManagedBy   = "terraform"
      Milestone   = "D4"
    }
  }
}
```
Every single AWS resource created by Terraform automatically receives these tags, ensuring full transparency in the AWS billing console.

#### `variables.tf`
Centralizes input parameters so configuration can be tuned without modifying resource logic:
* `aws_region`: Defaults to `ap-southeast-1` (Singapore) for lowest network latency to NUS.
* `environment`: Environment namespace (defaults to `prod`).
* `master_instance_type`: EC2 instance type for Node 1 (defaults to `t3.medium`).
* `worker_instance_type`: EC2 instance type for Worker Nodes (defaults to `t3.medium`).
* `worker_count`: Number of stateless worker nodes (defaults to `2`).
* `data_volume_size_gb`: Size of persistent EBS volume (defaults to `50` GB).
* `github_repository`: Target GitHub repository for keyless OIDC authentication (`AY2627S1-CS3219-P25/friend-on-campus`).

#### `vpc.tf`
Provisions the Virtual Private Cloud (VPC)—our private, isolated virtual data center in the AWS cloud:
* `aws_vpc.main`: Allocates the IP address range `10.0.0.0/16` (providing 65,536 private IP addresses). Enables DNS hostnames and DNS support.
* `aws_subnet.public_a` & `aws_subnet.public_b`: Creates two public subnets across distinct Availability Zones (`ap-southeast-1a` and `ap-southeast-1b`). Multi-AZ placement is required by the AWS Application Load Balancer to guarantee high availability.
* `aws_internet_gateway.main`: The virtual router connecting our VPC to the public internet.
* `aws_route_table.public` & `aws_route_table_association`: Routes outbound traffic (`0.0.0.0/0`) through the Internet Gateway so our EC2 instances can download operating system packages and container images.

#### `security_groups.tf`
Implements the **Defense-in-Depth Network Security Model**. Security groups act as stateful virtual firewalls:

```mermaid
flowchart LR
    Internet["Public Internet"] -->|Port 80 / 443| ALB_SG["ALB Security Group<br/>• Allow HTTP :80<br/>• Allow HTTPS :443"]
    ALB_SG -->|Port 80 / 8443| Cluster_SG["Cluster Security Group<br/>• Allow traffic from ALB_SG ONLY<br/>• Allow inter-node mesh (Flannel)<br/>• SSH Port 22: BLOCKED"]
    DevTerminal["Developer Machine"] -.->|AWS SSM Session Manager| Cluster_SG
```

* `aws_security_group.alb`: Attached to the public ALB. Permits inbound traffic on HTTP port 80 and HTTPS port 443 from anywhere (`0.0.0.0/0`).
* `aws_security_group.cluster`: Attached to the EC2 instances. Crucially:
  * **Port 22 (SSH) is completely closed to the internet!** This eliminates the attack surface of automated SSH brute-force bots.
  * Permits inbound traffic from `aws_security_group.alb` only.
  * Permits internal inter-node traffic (`10.0.0.0/16`) for K3s Flannel VXLAN overlay networking (port 8472) and K3s cluster API communication (port 6443).

#### `iam.tf`
Configures AWS Identity and Access Management (IAM) according to the **Principle of Least Privilege**:
* `aws_iam_role.ec2_node` & `aws_iam_instance_profile.ec2_node`: Assigned to our EC2 instances. Attaches:
  * `AmazonSSMManagedInstanceCore`: Enables the instances to register with **AWS Systems Manager (SSM)**, allowing secure terminal shell access without SSH keys.
  * `AmazonEC2ContainerRegistryReadOnly`: Allows the nodes to pull Docker images directly from our private Amazon ECR repositories without managing Docker login credentials.
* `aws_iam_openid_connect_provider.github`: Registers GitHub's OpenID Connect (OIDC) identity provider with AWS.
* `aws_iam_role.github_actions_cd`: The role assumed by our GitHub Actions continuous deployment pipeline. Constrained by a strict condition: only jobs executing on the `main` branch of our specific repository can assume this role!

#### `ebs.tf`
Provisions the dedicated storage volume for our database and messaging layer:
* `aws_ebs_volume.data_volume`: A 50GB **General Purpose SSD (gp3)** volume provisioned in `ap-southeast-1a` (the exact AZ where Node 1 resides). Configured with `encrypted = true` and `kms_key_id = "alias/aws/ebs"` for transparent encryption at rest.
* `aws_volume_attachment.master_data`: Attaches this EBS volume to Node 1 as block device `/dev/sdf`.

#### `ec2.tf`
Provisions the actual virtual compute instances:
* `data.aws_ssm_parameter.ubuntu_ami`: Automatically queries the AWS public SSM parameter store for the latest official AMI ID of **Canonical Ubuntu 24.04 LTS (Noble Numbat)** for `amd64`. This ensures our base OS is always patched with modern security updates.
* `aws_instance.k3s_master` (Node 1):
  * Runs our bootstrap shell script via `user_data`.
  * Detects the attached EBS disk (`/dev/nvme1n1` or `/dev/xvdf`).
  * If the disk has no filesystem, formats it with `mkfs.ext4`.
  * Adds an entry to `/etc/fstab` and mounts the volume to `/var/foc-data`.
  * Installs K3s server using Rancher's official script with `--node-label foc.role=data-node`.
* `aws_instance.k3s_worker` (Nodes 2 & 3):
  * Spawns worker nodes distributed across our public subnets.
  * Waits for the master node's K3s API server on port 6443 to report healthy.
  * Installs the K3s agent and joins the cluster with `--node-label foc.role=worker-node`.

#### `alb.tf`
Provisions the public entrance to our system:
* `aws_lb.main`: An Internet-facing Application Load Balancer spanning multiple Availability Zones.
* `aws_lb_target_group.http`: Routes traffic on port 80 to the cluster instances. Regularly checks `/health` every 15 seconds to ensure only healthy nodes receive user traffic.
* `aws_lb_target_group_attachment`: Enrolls Node 1, Node 2, and Node 3 into the load balancer pool.
* `aws_lb_listener.http`: Listens on public HTTP port 80 and forwards requests to the target group.

#### `ecr.tf`
Provisions 9 private repositories in Amazon Elastic Container Registry (ECR) for all project images:
`foc/user-service`, `foc/supplier-service`, `foc/order-service`, `foc/credit-service`, `foc/notification-service`, `foc/chat-service`, `foc/gateway`, `foc/student-app`, and `foc/admin-portal`.
Each repository includes an automated **Lifecycle Policy** that purges untagged images older than 3 days and retains at most 10 images per service, protecting the student account from unnecessary storage fees.

#### `outputs.tf`
Defines the output variables printed in the terminal after running `terraform apply`:
* `alb_url`: The public web address to open in your browser to view the application.
* `master_instance_id` & `worker_instance_ids`: The EC2 instance identifiers.
* `ssm_connect_master`: A pre-formatted command to open an instant terminal shell on Node 1 via AWS SSM.
* `fetch_kubeconfig_command`: A command to download the cluster's `kubeconfig` to your local machine.

#### `terraform.tfvars.example`
A reference template illustrating how students can customize instance types or domain certificates without editing core `.tf` files.

---

## 3. Container Orchestration with Lightweight Kubernetes (K3s)

### 3.1 The Container Evolution: Bare Metal $\to$ VMs $\to$ Docker Compose $\to$ Kubernetes

Understanding modern cloud computing requires understanding how application hosting evolved over four decades:

```mermaid
flowchart TD
    subgraph Era1["1. Bare Metal (1990s)"]
        BM["One physical server = One Operating System.<br/>Expensive, inflexible, 90% CPU idle."]
    end

    subgraph Era2["2. Virtual Machines (2000s)"]
        VM["Hypervisor runs multiple OS copies on one hardware host.<br/>Good isolation, but high RAM and CPU overhead."]
    end

    subgraph Era3["3. Containerization (2010s)"]
        DC["Containers share the host Linux kernel (Docker).<br/>Fast boot, lightweight, orchestrated locally via Docker Compose."]
    end

    subgraph Era4["4. Orchestration (Modern Cloud)"]
        K8S["Kubernetes coordinates clusters of machines.<br/>Self-healing, automated scaling, declarative desired state."]
    end

    Era1 --> Era2 --> Era3 --> Era4
```

In Kubernetes, you stop managing individual virtual machines. Instead, you treat an entire cluster of machines as a single unified pool of compute and memory.

---

### 3.2 Why K3s over Upstream EKS or Docker Swarm?

In CS3219, we specifically chose **K3s** (created by Rancher / SUSE):

1. **100% Upstream Kubernetes Compatibility**: K3s is a fully certified Kubernetes distribution. It executes the identical YAML manifest specifications and accepts the exact same `kubectl` commands as enterprise AWS EKS or Google GKE.
2. **Zero Control-Plane Cost**: AWS charges \$73.00 USD/month just to operate an EKS control plane. K3s bundles the Kubernetes API server, scheduler, and controller manager into a tiny single binary that runs directly on our EC2 master node for \$0 extra.
3. **Low Resource Overhead**: Standard Kubernetes consumes over 2GB of RAM just for system components. K3s strips out legacy, in-tree cloud provider code and replaces heavy components with lightweight alternatives (like sqlite/embedded etcd and Flannel network mesh), running smoothly on a modest `t3.medium` instance.
4. **Superior to Docker Swarm**: While Docker Swarm is simple, it lacks automated horizontal pod autoscaling (HPA) driven by live metrics and does not have the rich ecosystem of Kubernetes resources (Ingress, ConfigMaps, Secrets, PVCs). Adopting Kubernetes directly satisfies the CS3219 **Category N4 rubric**.

---

### 3.3 The 7 Core Kubernetes Primitives in Plain English

Before reading our manifests, memorize these 7 fundamental building blocks:

```mermaid
flowchart TD
    Ingress["1. Ingress<br/>Routes public HTTP paths to internal Services"] --> Svc["2. Service (ClusterIP)<br/>Permanent internal DNS & Load Balancer"]
    Svc --> Deploy["3. Deployment<br/>Declares desired replica count & manages updates"]
    Deploy --> Pod1["4. Pod (Replica 1)<br/>Smallest deployable unit (wraps container)"]
    Deploy --> Pod2["4. Pod (Replica 2)<br/>Runs in parallel on another worker node"]
    
    HPA["5. Horizontal Pod Autoscaler (HPA)<br/>Monitors CPU and scales replicas 2 ➔ 5"] -.-> Deploy

    subgraph StorageConfig["Configuration & Storage"]
        CM["6. ConfigMap & Secret<br/>Injects env vars & database credentials"]
        PVC["7. PersistentVolumeClaim (PVC)<br/>Requests durable disk space on EBS"]
    end

    CM -.-> Pod1
    PVC -.-> Pod1
```

1. **Pod**: The smallest atomic unit in Kubernetes. A Pod wraps one (or more) running containers. Pods are ephemeral: their IP addresses change every time they are recreated.
2. **Deployment**: A supervisor that manages Pods. You tell the Deployment *"Ensure there are always 2 replicas of `order-service` running."* If a pod crashes, the Deployment immediately creates a replacement.
3. **Service (ClusterIP)**: Pods come and go, so you cannot hardcode a Pod's IP address. A **Service** creates a stable internal DNS name (e.g. `order-service:8003`) that automatically load-balances requests across all healthy Pod replicas.
4. **ConfigMap & Secret**:
   * `ConfigMap`: Stores non-sensitive configuration (hostnames, port numbers, log levels).
   * `Secret`: Stores sensitive credentials (passwords, JWT signing keys, connection strings) as base64-encoded environment variables.
5. **PersistentVolume (PV) & PersistentVolumeClaim (PVC)**: The storage abstraction. A `PersistentVolume` represents a physical storage disk (our 50GB EBS volume). A `PersistentVolumeClaim` is a ticket requested by a container to claim storage on that disk.
6. **Ingress**: The cluster's front door. It receives HTTP requests from the AWS ALB and routes them to the correct internal Service based on URL paths.
7. **Horizontal Pod Autoscaler (HPA)**: The autopilot. It periodically checks the CPU and memory consumption of your pods. When traffic spikes and CPU exceeds a threshold (e.g. 60%), HPA instructs the Deployment to increase replicas from 2 to 5.

---

### 3.4 File-by-File Breakdown of `infra/k8s/`

All Kubernetes manifests live in `infra/k8s/` and are applied in numeric sequence:

#### `00-namespace.yaml`
Creates an isolated namespace named `foc` (Friend on Campus):
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: foc
```
Namespaces partition cluster resources, preventing naming collisions with Kubernetes internal system pods (`kube-system`).

#### `01-configmaps-secrets.yaml`
Contains all cluster configuration and credentials:
* `foc-common-config`: Exposes cluster-internal microservice hostnames:
  * `USER_SERVICE_URL: "http://user-service:8001"`
  * `SUPPLIER_SERVICE_URL: "http://supplier-service:8002"`
  * `ORDER_SERVICE_URL: "http://order-service:8003"`
  * `CREDIT_SERVICE_URL: "http://credit-service:8004"`
  * `NOTIFICATION_SERVICE_URL: "http://notification-service:8005"`
  * `RABBITMQ_URL: "amqp://foc_user:foc_password@rabbitmq:5672"`
* `foc-secrets`: Securely encodes database passwords, RabbitMQ credentials, and JWT signing keys.
* `postgres-init-script`: Embeds the SQL initialization script (`01-init-databases.sql`) that runs on PostgreSQL's first boot, provisioning all 6 logical databases (`user_db`, `supplier_db`, `order_db`, `credit_db`, `notification_db`, `chat_db`) and granting least-privilege user credentials.

#### `02-storage.yaml`
Establishes durable persistence by binding Kubernetes to our Amazon EBS volume:
* `foc-ebs-pv`: A 50GB `PersistentVolume` with `storageClassName: local-storage`. Crucially, it defines `nodeAffinity`:
  ```yaml
  nodeAffinity:
    required:
      nodeSelectorTerms:
        - matchExpressions:
            - key: foc.role
              operator: In
              values:
                - data-node
  ```
  This tells Kubernetes: *"This physical disk is mounted at `/var/foc-data` exclusively on Node 1 (the data node)."*
* `foc-data-pvc`: A `PersistentVolumeClaim` that binds to `foc-ebs-pv`.

#### `03-stateful-data.yaml`
Deploys our stateful persistence layer, pinned to Node 1 via `nodeSelector: { foc.role: "data-node" }`:
* **PostgreSQL 16**:
  * Launched with command args `-c wal_level=logical -c max_replication_slots=10 -c max_wal_senders=10`. This enables PostgreSQL's write-ahead log (WAL) to emit Change Data Capture events for Debezium.
  * Mounts subpath `postgres` from the EBS volume to `/var/lib/postgresql/data`.
  * Mounts the init ConfigMap to `/docker-entrypoint-initdb.d/01-init-databases.sql`.
* **RabbitMQ 3.13**:
  * Deploys the message broker with the management plugin enabled.
  * Mounts subpath `rabbitmq` to persist Quorum Queues across pod restarts.
* **Debezium Server 2.7 (CDC Connectors)**:
  * Deploys 3 lightweight CDC connectors for User, Order, and Credit services.
  * Captures real-time changes from PostgreSQL outbox tables and publishes event streams into RabbitMQ exchanges.
  * Mounts subpath `debezium` to persist WAL replication offsets.

#### `04-stateless-services.yaml`
Deploys our 6 core backend microservices: `user-service`, `supplier-service`, `order-service`, `credit-service`, `notification-service`, and `chat-service`.

Every microservice manifest includes three production best practices:
1. **High Availability via `podAntiAffinity`**:
   ```yaml
   affinity:
     podAntiAffinity:
       preferredDuringSchedulingIgnoredDuringExecution:
         - weight: 100
           podAffinityTerm:
             labelSelector:
               matchExpressions:
                 - key: app
                   operator: In
                   values: [order-service]
             topologyKey: kubernetes.io/hostname
   ```
   This instructs the scheduler: *"Do not put both replicas of `order-service` on the same worker node. Spread them across Node 2 and Node 3!"*
2. **Resource Requests and Limits**:
   ```yaml
   resources:
     requests:
       cpu: "100m"
       memory: "128Mi"
     limits:
       cpu: "500m"
       memory: "512Mi"
   ```
   Guarantees baseline resources while preventing a rogue memory leak from exhausting the node's RAM.
3. **Liveness and Readiness Probes**:
   * `livenessProbe` (`GET /health`): Probes if the Node.js process is alive. If this probe fails repeatedly, Kubernetes restarts the pod.
   * `readinessProbe` (`GET /ready`): Probes if the service has connected to PostgreSQL and RabbitMQ. Kubernetes will not route incoming user traffic to the pod until this probe returns HTTP 200.

#### `05-frontends-gateway.yaml`
Deploys the client presentation tier:
* `student-app` & `admin-portal`: 2 replicas each. Runs static React single-page applications compiled with Vite and served through an optimized NGINX alpine container.
* `api-gateway`: 2 replicas. Runs our custom NGINX reverse-proxy gateway. It handles request routing, verifies authorization tokens, and manages WebSocket connection upgrades (`/ws/` and `/ws/chat/`).

#### `06-ingress.yaml`
Configures K3s's built-in **Traefik Ingress Controller**. Maps all public HTTP/HTTPS traffic entering the cluster on port 80/443 to the internal `api-gateway` service:
```yaml
spec:
  rules:
    - http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-gateway
                port:
                  number: 80
```

#### `07-hpa.yaml`
Defines the **Horizontal Pod Autoscalers (HPA)** for `order-service`, `credit-service`, and `api-gateway`:
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-service-hpa
  namespace: foc
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  minReplicas: 2
  maxReplicas: 5
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
```
When CPU utilization across `order-service` pods exceeds 60%, K3s automatically scales the deployment from 2 replicas up to 5 replicas across the worker nodes!

---

## 4. Continuous Delivery (CD) with GitHub Actions & AWS

### 4.1 Continuous Delivery vs. Continuous Deployment

Students often conflate Continuous Delivery and Continuous Deployment:
* **Continuous Integration (CI)**: Automatically builds code, runs linters, and executes test suites on every pull request to verify code quality.
* **Continuous Delivery (CD)**: Automatically packages software into deployable artifacts (Docker images in Amazon ECR) and prepares them so they can be released to production at any time.
* **Continuous Deployment**: Automatically deploys every merged commit on the `main` branch directly to live production without manual intervention.

In **Friend on Campus**, our pipeline supports both:
* **Automated Continuous Deployment on Merge**: Pushing or merging a PR to `main` automatically builds changed containers, pushes them to AWS ECR, runs database migrations, and updates the K3s cluster.
* **Workflow Dispatch (Manual CD Trigger)**: Allows developers to manually trigger a release of a single specific microservice with a single click in the GitHub Actions UI.

---

### 4.2 The Stateless Apps vs. Stateful Database Dilemma

In modern microservices architecture:
* **Application compute is stateless**: You can spin up, replace, or terminate microservice containers in seconds without losing data.
* **The database is stateful**: PostgreSQL holds real student errand data, wallet balances, and transaction ledgers. You cannot casually destroy and recreate the database during an update!

This creates a synchronization challenge during continuous delivery:
*What happens if you deploy a new version of `order-service` ($V_2$) that expects a new database column, but existing pods ($V_1$) are still running and serving customer requests?*

---

### 4.3 Database Migrations & The Expand-Contract Pattern

To achieve **Zero-Downtime Rolling Updates**, software teams adhere to the **Expand-Contract Pattern**:

```mermaid
sequenceDiagram
    autonumber
    participant CD as GitHub Actions CD
    participant DB as PostgreSQL 16
    participant OldPods as Running Pods (v1)
    participant NewPods as New Pods (v2)
    participant K8s as K3s Controller

    Note over OldPods: Pods (v1) actively serving users
    CD->>DB: Pre-Deploy: Run 'prisma migrate deploy'
    Note over DB: Schema EXPANDED:<br/>New column added (must be nullable or default).
    Note over OldPods: v1 Pods continue running without errors!<br/>They ignore the new column.
    
    CD->>K8s: Update Deployment image tag (:sha-xxx)
    K8s->>NewPods: Launch v2 Pods alongside v1 Pods
    NewPods->>NewPods: Run /ready health check
    Note over NewPods: v2 Pods pass /ready check (HTTP 200)
    
    K8s->>K8s: Shift incoming traffic to v2 Pods
    K8s->>OldPods: Send SIGTERM (Graceful Shutdown)
    Note over OldPods: In-flight HTTP requests finish cleanly
    K8s->>OldPods: Terminate v1 Pods
    Note over NewPods: v2 Pods now serve 100% of traffic (Zero Downtime)
```

#### Rules for Safe Database Migrations:
1. **Never rename or delete a column in a single release**: That breaks running $V_1$ pods.
2. **Always make new columns optional (`String?`) or provide a default value (`@default(...)`)**.
3. **Execute migrations ONCE before pod rotation**: The CD runner triggers `prisma migrate deploy` once via AWS Systems Manager prior to rolling out new containers.

---

### 4.4 Keyless Cloud Security with GitHub Actions & AWS IAM OIDC

A notorious security risk in junior engineering projects is storing long-lived AWS IAM Access Keys (`AKIA...`) in GitHub Repository Secrets. If an access key leaks, attackers can take over the AWS account within minutes.

Our architecture eliminates access keys entirely using **OpenID Connect (OIDC)**:

```mermaid
sequenceDiagram
    autonumber
    participant GH as GitHub Actions Runner
    participant OIDC as GitHub OIDC Token Service
    participant STS as AWS Security Token Service (STS)
    participant AWS as AWS ECR & SSM

    GH->>OIDC: Request short-lived OIDC JSON Web Token (JWT)
    OIDC-->>GH: Signed JWT (Contains repository name, branch, and commit)
    
    GH->>STS: Call AssumeRoleWithWebIdentity (Presents GitHub JWT)
    Note over STS: AWS verifies GitHub cryptographic signature.<br/>Validates repo matches AY2627S1-CS3219-P25/friend-on-campus.<br/>Validates ref matches refs/heads/main.
    STS-->>GH: Issues temporary AWS credentials (valid for 1 hour)
    
    GH->>AWS: Authenticate to ECR and push Docker images
    GH->>AWS: Dispatch SSM Run Command to deploy to K3s cluster
```

There are **zero hardcoded AWS secrets** stored in GitHub. Even if the GitHub workflow logs are inspected, there are no credentials to steal.

---

### 4.5 Multi-Architecture Container Builds (Apple Silicon vs. AWS AMD64)

Most students work on modern Apple Silicon Macs (M1/M2/M3/M4 chips), which use the **ARM64** CPU architecture. However, standard AWS EC2 instances (`t3.medium`) run on Intel/AMD **x86_64 (AMD64)** architecture.

If you build a Docker image locally on a Mac and push it to AWS, the EC2 instance will fail to run the container, crashing with the error:
```
exec /usr/local/bin/node: exec format error
```

To solve this, our CD pipeline uses **Docker Buildx with QEMU virtualization**:
```yaml
- name: Set up QEMU
  uses: docker/setup-qemu-action@v3

- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: Build and Push Docker Image
  uses: docker/build-push-action@v6
  with:
    platforms: linux/amd64
    push: true
```
This guarantees that regardless of what machine a developer uses, images pushed to Amazon ECR are always cross-compiled for `linux/amd64` and run seamlessly on AWS EC2.

---

### 4.6 SSH-Free Remote Deployment via AWS Systems Manager (SSM)

How does GitHub Actions instruct our K3s cluster to deploy updated containers?
* In legacy architectures, teams opened port 22 (SSH) on their servers and stored private SSH keys in CI/CD secrets.
* In our architecture, **port 22 is closed**. Instead, our EC2 instances run the native **AWS Systems Manager (SSM) Agent**.

Our GitHub Actions workflow dispatches a secure remote command via the AWS SSM API:
```bash
aws ssm send-command \
  --instance-ids "$MASTER_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[\"$COMMANDS\"]"
```
The SSM Agent inside Node 1 receives the encrypted command over outbound HTTPS, updates the Kubernetes deployments using `kubectl set image`, verifies rollout success with `kubectl rollout status`, and returns the execution logs back to GitHub Actions.

---

### 4.7 File-by-File Breakdown of Workflows

#### `.github/workflows/ci.yml` (Existing CI Pipeline)
The gatekeeper workflow for every Pull Request:
* Runs linters (`eslint`), type checkers (`tsc`), and code formatting verification.
* Validates workspace test scripts against the test matrix (`scripts/ci/validate-test-matrix.mjs`).
* Executes the test matrix in parallel:
  * Unit tests across all services.
  * Integration tests with isolated test databases.
  * Messaging tests with RabbitMQ and Debezium CDC.
  * End-to-end API and Playwright browser tests.

#### `.github/workflows/deploy.yml` (New CD Pipeline)
The production release pipeline:
* **Job 1: `detect-changes`**: Uses `dorny/paths-filter` to detect which services or apps were modified in the commit. If you only touched `order-service`, the pipeline only rebuilds `order-service`, saving build minutes.
* **Job 2: `build-and-push`**: Authenticates via AWS IAM OIDC, logs into Amazon ECR, compiles Docker images for `linux/amd64` with Buildx, tags them with both `:latest` and `:${{ github.sha }}`, and pushes them to private ECR repositories.
* **Job 3: `deploy`**: Locates the running K3s Master instance ID via the AWS CLI, issues an AWS SSM Run Command to apply any updated manifests, triggers rolling updates of modified services, and waits for `kubectl rollout status` to verify successful container health before marking the pipeline as green.

---

## 5. Distributed Load & Concurrency Testing with k6

### 5.1 Why k6 over Apache JMeter or Apache Bench?

In CS3219, verifying Non-Functional Requirements (NFRs) like scalability, concurrency, and latency requires automated load testing.

While older tools like Apache JMeter (heavy XML files and clunky Java GUI) or Apache Bench (basic single-endpoint hammering) are common, modern engineering teams prefer **k6 by Grafana**:
1. **Tests as Code (JavaScript ES6)**: Test scripts are written in readable modern JavaScript, checked into Git, and reviewed in PRs.
2. **Thresholds & Assertions**: Native assertions allow you to enforce strict performance budgets (e.g. `p(95) < 800ms`, `rate < 0.01`).
3. **Distributed Virtual Users (VUs)**: Lightweight Go-based concurrency engine capable of generating thousands of requests from a single test runner.

---

### 5.2 Scenario A: Race Condition Verification (`order-claim-race.js`)

#### The Academic Challenge:
In a campus peer-to-peer errand platform, multiple student couriers may attempt to claim the exact same open errand simultaneously.
* If two couriers claim the same errand, who gets paid?
* How does the system guarantee that **exactly one** courier wins, while all other couriers receive a clean conflict error without database corruption?

```mermaid
sequenceDiagram
    autonumber
    actor Courier1 as Courier A (VU 1)
    actor Courier2 as Courier B (VU 2)
    participant Svc as order-service
    participant DB as PostgreSQL 16 (order_db)

    Note over Courier1,Courier2: Both couriers hit 'Accept Errand' at the EXACT same millisecond!
    Courier1->>Svc: POST /api/orders/:id/accept
    Courier2->>Svc: POST /api/orders/:id/accept

    rect rgb(230, 245, 230)
    Note over Svc,DB: Courier A Transaction Wins Lock
    Svc->>DB: UPDATE orders SET status='ACCEPTED', courierId='A', version=2<br/>WHERE id=:id AND status='OPEN' AND version=1
    DB-->>Svc: Rows affected: 1
    Svc-->>Courier1: HTTP 200 OK (Status: ACCEPTED)
    end

    rect rgb(255, 230, 230)
    Note over Svc,DB: Courier B Transaction Executes
    Svc->>DB: UPDATE orders SET status='ACCEPTED', courierId='B', version=2<br/>WHERE id=:id AND status='OPEN' AND version=1
    DB-->>Svc: Rows affected: 0 (Version mismatch or status != OPEN)
    Note over Svc: Throws OrderStateConflictError
    Svc-->>Courier2: HTTP 409 Conflict (Order already claimed)
    end
```

#### How the Implementation Works (`services/order-service/src/repositories/order.repository.ts`):
The repository uses **Optimistic Concurrency Control** combined with an atomic SQL update:
```typescript
const updatedCount = await tx.order.updateMany({
  where: {
    id: orderId,
    status: 'OPEN',
    version: order.version, // Version check prevents race conditions
  },
  data: {
    status: 'ACCEPTED',
    courierId: courierId,
    courierContactNote: courierContactNote || null,
    acceptedAt: new Date(),
    version: { increment: 1 },
  },
});

if (updatedCount.count === 0) {
  throw new OrderStateConflictError('Order was claimed by another courier concurrently');
}
```

#### The k6 Verification Script (`tests/k6/order-claim-race.js`):
The test spawns **20 concurrent Virtual Users (VUs)** that fire simultaneous HTTP requests to accept the same errand:
```javascript
export const options = {
  scenarios: {
    courier_race: {
      executor: 'per-vu-iterations',
      vus: 20,
      iterations: 1,
      maxDuration: '15s',
    },
  },
  thresholds: {
    // Assert exactly 1 winner
    'claim_winner_200': ['count == 1'],
    // Assert exactly 19 conflicts
    'claim_conflict_409': ['count == 19'],
    // Zero server crashes
    'claim_unexpected_code': ['count == 0'],
  },
};
```
When executed, k6 verifies that the system maintained strict ACID consistency across distributed replicas.

---

### 5.3 Scenario B: Discovery Traffic Spikes & Live Autoscaling (`discovery-load.js`)

#### The Academic Challenge:
Satisfying **Category N4** requires: *"Kubernetes deployment and automated scaling, demonstrated with evidence."*

To prove this, `tests/k6/discovery-load.js` simulates peak campus lunch-hour traffic:
* Ramps from 10 to 150 concurrent Virtual Users over 2 minutes.
* Virtual users continuously query `GET /api/orders?status=OPEN` and `GET /api/suppliers` through the public AWS Application Load Balancer.
* As load increases, CPU utilization on `order-service` pods climbs past the 60% threshold configured in `07-hpa.yaml`.

```mermaid
flowchart LR
    k6["k6 Load Runner<br/>(150 Virtual Users)"] -->|Heavy HTTP Traffic| ALB["AWS ALB"]
    ALB --> Gateway["api-gateway"]
    Gateway --> OrderSvc["order-service (2 Pods)"]
    
    MetricsServer["K3s Metrics Server"] -.->|Detects CPU > 60%| HPA["Horizontal Pod Autoscaler"]
    HPA -->|Auto-Scale Trigger| Deployment["order-service Deployment"]
    Deployment -->|Scale Out| Pods["order-service (5 Pods Spanning Nodes 2 & 3!)"]
```

#### Running the Demonstration:
1. Open Terminal 1 and watch K3s autoscaling in real time:
   ```bash
   kubectl get hpa -n foc -w
   ```
2. Open Terminal 2 and launch the k6 traffic spike:
   ```bash
   TARGET_HOST="http://<ALB_DNS>" k6 run tests/k6/discovery-load.js
   ```
3. In Terminal 1, watch the replica count dynamically scale:
   ```
   NAME                REFERENCE                  TARGETS   MINPODS   MAXPODS   REPLICAS   AGE
   order-service-hpa   Deployment/order-service   12%/60%   2         5         2          5m
   order-service-hpa   Deployment/order-service   74%/60%   2         5         2          6m
   order-service-hpa   Deployment/order-service   85%/60%   2         5         4          6m30s
   order-service-hpa   Deployment/order-service   58%/60%   2         5         5          7m
   ```
4. Once the test concludes, K3s gracefully cools down and scales the pods back to 2 replicas.

---

### 5.4 Fulfilling CS3219 Rubric Categories N3 & N4 for Milestone D4

| Rubric Category | Requirement | Concrete Evidence Produced by Our Stack |
| :--- | :--- | :--- |
| **Category N3 (Testing & Scalability)** | Automated concurrency testing & verification of race conditions | Execution of `tests/k6/order-claim-race.js`: Proves 20 simultaneous couriers result in exactly 1 HTTP 200 winner and 19 HTTP 409 conflicts with zero server errors. |
| **Category N4 (Cloud & DevOps)** | Production cloud deployment & automated scaling demonstrated with evidence | Terraform provisioning on AWS + K3s multi-node cluster + Execution of `tests/k6/discovery-load.js` demonstrating live HPA scaling from 2 to 5 replicas under load. |

---

## 6. Operations, Troubleshooting & Student Runbook

### 6.1 Day-to-Day Operations: Connecting to Instances via AWS SSM

Because port 22 is closed for security, you never need to generate or distribute SSH `.pem` keys.

To open an instant web terminal directly into Node 1:
```bash
# 1. Retrieve the Master Instance ID from Terraform outputs
cd infra/terraform
MASTER_ID=$(terraform output -raw master_instance_id)

# 2. Start a secure SSM terminal session
aws ssm start-session --target "$MASTER_ID"
```
You are immediately placed into a root shell on the Ubuntu server.

---

### 6.2 Controlling K3s Remotely via `kubectl`

You can control the remote cluster directly from your local laptop using your standard `kubectl` CLI:

1. Download the cluster's `kubeconfig` file using AWS SSM:
   ```bash
   aws ssm start-session --target "$MASTER_ID" \
     --document-name AWS-StartInteractiveCommand \
     --parameters command='sudo cat /etc/rancher/k3s/k3s.yaml' > ~/.kube/config-foc
   ```
2. Replace `127.0.0.1` inside `~/.kube/config-foc` with your Node 1 public IP or master private IP (if using VPN/SSM port forwarding).
3. Set your terminal context:
   ```bash
   export KUBECONFIG=~/.kube/config-foc
   kubectl get nodes -o wide
   ```

---

### 6.3 Everyday Diagnosis & Log Triage Commands

```bash
# 1. Inspect all running pods in the Friend on Campus namespace
kubectl get pods -n foc -o wide

# 2. View real-time logs of a specific microservice
kubectl logs -n foc -l app=order-service -f --tail=100

# 3. Inspect why a pod is failing or restarting
kubectl describe pod <pod-name> -n foc

# 4. Check live CPU and Memory consumption across nodes and pods
kubectl top nodes
kubectl top pods -n foc

# 5. Check live autoscaler status
kubectl get hpa -n foc

# 6. Check Traefik Ingress routing rules
kubectl get ingress -n foc
```

---

### 6.4 Preserving the Student Budget (Nightly Stop & Resume)

To preserve the S\$50 SGD student budget, stop the EC2 instances at the end of each work session:

#### Nightly Stop:
```bash
# Stop all 3 cluster instances
aws ec2 stop-instances --instance-ids \
  $(cd infra/terraform && terraform output -raw master_instance_id) \
  $(cd infra/terraform && terraform output -json worker_instance_ids | jq -r '.[]')
```
* While stopped, you pay **zero** for CPU and RAM. You only pay pennies for the idle EBS disk storage ($\approx$\$0.10/day).
* All database data, RabbitMQ queues, and Docker images remain completely safe on the EBS volume.

#### Morning Resume:
```bash
# Start all 3 cluster instances
aws ec2 start-instances --instance-ids \
  $(cd infra/terraform && terraform output -raw master_instance_id) \
  $(cd infra/terraform && terraform output -json worker_instance_ids | jq -r '.[]')
```
Within 60 seconds, the instances boot up, K3s reconnects the nodes, mounts `/var/foc-data`, and automatically restarts all pods!

---

### 6.5 Clean Teardown (`terraform destroy`)

When Milestone D4 grading is complete and the semester concludes, delete every cloud resource with a single command:
```bash
cd infra/terraform
terraform destroy
```
Terraform prompts you for confirmation. Type `yes`, and it cleanly removes the ALB, EC2 instances, EBS volume, subnets, route tables, and VPC, returning your AWS hourly spend to exactly \$0.00.

---

## 7. Summary & Milestone D4 Checklist

* [x] **Infrastructure as Code**: Terraform configuration validated and ready (`infra/terraform/`).
* [x] **Lightweight Kubernetes**: K3s manifests configured for two-tier stateful/stateless split (`infra/k8s/`).
* [x] **Continuous Delivery**: Keyless GitHub Actions CD workflow utilizing AWS IAM OIDC and SSM (`.github/workflows/deploy.yml`).
* [x] **Concurrency Verification**: k6 race condition test validating ACID single-winner semantics (`tests/k6/order-claim-race.js`).
* [x] **Autoscaling Verification**: k6 spike load test demonstrating live HPA scaling from 2 to 5 replicas (`tests/k6/discovery-load.js`).
* [x] **Student Educational Guide**: Single comprehensive Markdown guide documenting every file and concept (`docs/cloud-deployment-and-devops-guide.md`).
