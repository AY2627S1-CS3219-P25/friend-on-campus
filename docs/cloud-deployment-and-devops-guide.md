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
   * [1.3 Cluster Topology & The Two-Tier Autoscaling Architecture](#13-cluster-topology--the-two-tier-autoscaling-architecture)
   * [1.4 The S\$50 SGD Student Budget Constraint: How We Run 24/7 Safely](#14-the-s50-sgd-student-budget-constraint-how-we-run-247-safely)
   * [1.5 End-to-End Developer Workflow: What Developers Actually Do (Step-by-Step)](#15-end-to-end-developer-workflow-what-developers-actually-do-step-by-step)
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
   * [2.5 Day 1 vs. Day 2: Why We Separate Terraform from GitHub Actions CD (The State Collision Trap)](#25-day-1-vs-day-2-why-we-separate-terraform-from-github-actions-cd-the-state-collision-trap)
   * [2.6 Hardware, Compute & Storage Engineering Decisions](#26-hardware-compute--storage-engineering-decisions)
     * [2.6.1 EBS gp3 SSD vs. st1 HDD: The 500 GB Minimum Provisioning Trap](#261-ebs-gp3-ssd-vs-st1-hdd-the-500-gb-minimum-provisioning-trap)
     * [2.6.2 Compute Architecture: x86_64 (t3) vs. AWS Graviton ARM64 (t4g)](#262-compute-architecture-x86_64-t3-vs-aws-graviton-arm64-t4g)
     * [2.6.3 Why Stateless Worker Nodes Still Need 20 GB Root Disk (The Kubelet DiskPressure Trap)](#263-why-stateless-worker-nodes-still-need-20-gb-root-disk-the-kubelet-diskpressure-trap)
     * [2.6.4 Why the Application Load Balancer (ALB) is Essential (Even Before Autoscaling)](#264-why-the-application-load-balancer-alb-is-essential-even-before-autoscaling)
     * [2.6.5 The K3s ServiceLB vs. AWS ALB Port-Binding Insight](#265-the-k3s-servicelb-vs-aws-alb-port-binding-insight)
     * [2.6.6 Worker Fleet Sizing Rationale: Aggregate Pod Memory vs. ASG Scale-Down](#266-worker-fleet-sizing-rationale-aggregate-pod-memory-vs-asg-scale-down)
   * [2.7 Complete AWS Component Inventory & Billability Breakdown](#27-complete-aws-component-inventory--billability-breakdown)
     * [2.7.1 Complete Resource Inventory & Cost Summary](#271-complete-resource-inventory--cost-summary)
     * [2.7.2 Deep Dive: Is Amazon ECR Billable?](#272-deep-dive-is-amazon-ecr-billable)
     * [2.7.3 Why HTTP Instead of HTTPS on the ALB? (Custom Domain & ACM Constraints)](#273-why-http-instead-of-https-on-the-alb-custom-domain--acm-constraints)
     * [2.7.4 Student Budget Ceiling Math: 24/7 vs. Nightly Pausing](#274-student-budget-ceiling-math-247-vs-nightly-pausing)
3. [Container Orchestration with Lightweight Kubernetes (K3s)](#3-container-orchestration-with-lightweight-kubernetes-k3s)
   * [3.1 The Container Evolution: Bare Metal $\to$ VMs $\to$ Docker Compose $\to$ Kubernetes](#31-the-container-evolution-bare-metal-to-vms-to-docker-compose-to-kubernetes)
   * [3.2 Why K3s over Upstream EKS or Docker Swarm?](#32-why-k3s-over-upstream-eks-or-docker-swarm)
     * [3.2.1 What is `kubectl`? Is It Part of K3s?](#321-what-is-kubectl-is-it-part-of-k3s)
   * [3.3 The 7 Core Kubernetes Primitives in Plain English](#33-the-7-core-kubernetes-primitives-in-plain-english)
   * [3.4 Multi-Node Overlay Networking: Flannel VXLAN, Pod CIDRs, and CoreDNS in Plain English](#34-multi-node-overlay-networking-flannel-vxlan-pod-cidrs-and-coredns-in-plain-english)
   * [3.5 File-by-File Breakdown of `infra/k8s/`](#35-file-by-file-breakdown-of-infrak8s)
     * [`00-namespace.yaml`](#00-namespaceyaml)
     * [`01-configmaps-secrets.yaml`](#01-configmaps-secretsyaml)
     * [`02-storage.yaml`](#02-storageyaml)
     * [`03-stateful-data.yaml`](#03-stateful-datayaml)
     * [`04-stateless-services.yaml`](#04-stateless-servicesyaml)
     * [`05-frontends-gateway.yaml`](#05-frontends-gatewayyaml)
       * [The Two-Tier Gateway Pattern: Traefik (Cluster Ingress) vs. NGINX (Application API Gateway)](#the-two-tier-gateway-pattern-traefik-cluster-ingress-vs-nginx-application-api-gateway)
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
   * [5.1 Where k6 Runs: Local Laptop vs. Cloud Runners (Zero-Cost External Simulation)](#51-where-k6-runs-local-laptop-vs-cloud-runners-zero-cost-external-simulation)
   * [5.2 Why k6 over Apache JMeter or Apache Bench?](#52-why-k6-over-apache-jmeter-or-apache-bench)
   * [5.3 Scenario A: Race Condition Verification (`order-claim-race.js`)](#53-scenario-a-race-condition-verification-order-claim-racejs)
   * [5.4 Scenario B: Discovery Traffic Spikes & Live Autoscaling (`discovery-load.js`)](#54-scenario-b-discovery-traffic-spikes--live-autoscaling-discovery-loadjs)
   * [5.5 Fulfilling CS3219 Rubric Categories N3 & N4 for Milestone D4](#55-fulfilling-cs3219-rubric-categories-n3--n4-for-milestone-d4)
6. [Operations, Troubleshooting & Student Runbook](#6-operations-troubleshooting--student-runbook)
   * [6.1 Day-to-Day Operations: Connecting to Instances via AWS SSM](#61-day-to-day-operations-connecting-to-instances-via-aws-ssm)
   * [6.2 Controlling K3s Remotely via `kubectl`](#62-controlling-k3s-remotely-via-kubectl)
   * [6.3 Everyday Diagnosis & Log Triage Commands](#63-everyday-diagnosis--log-triage-commands)
   * [6.4 Common Kubernetes Troubleshooting Scenarios (`CrashLoopBackOff`, `ImagePullBackOff`, `Pending`)](#64-common-kubernetes-troubleshooting-scenarios-crashloopbackoff-imagepullbackoff-pending)
   * [6.5 Preserving the Student Budget (Nightly Stop & Resume)](#65-preserving-the-student-budget-nightly-stop--resume)
   * [6.6 Clean Teardown (`terraform destroy`)](#66-clean-teardown-terraform-destroy)

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
| **Cost & Budget Control** | **Predictable & Budget-Friendly**: 1 `t3.medium` master + elastic `t3.small` workers run the entire cluster continuously 24/7 for 16 days for $\approx$\$43.04 USD, comfortably within the NUS S\$50 SGD student cap. | **Prohibitive for Students**: AWS EKS control plane alone costs **\$73.00 USD/month** before compute! Adding RDS (\$30/mo) and Amazon MQ (\$25/mo) would exhaust student credits in days. |
| **Cloud Portability (Course Theme)** | **100% Cloud-Agnostic**: The exact same K8s manifests and Docker containers run identically on AWS, Google Cloud (GCP), Microsoft Azure, or bare-metal servers. | **Vendor Lock-In**: Deep dependency on proprietary AWS-specific APIs, parameter groups, and control planes. |

> [!NOTE]
> **Academic Takeaway for Milestone D4**: Choosing self-managed PostgreSQL on EC2 backed by durable EBS storage is not a "shortcut"—it is a defensible, production-grade architectural decision that preserves Database-per-Service isolation, guarantees Change Data Capture compatibility, and respects realistic fiscal limits.

---

### 1.3 Cluster Topology & The Two-Tier Autoscaling Architecture

In a distributed architecture, workloads fall into two distinct categories:
1. **Stateful Workloads**: Services that store data on disk and cannot be casually killed or duplicated (PostgreSQL 16, RabbitMQ message logs, Debezium CDC replication offsets).
2. **Stateless Workloads**: Services that process requests in memory and persist state to an external database or broker (`order-service`, `credit-service`, `user-service`, frontends, API gateway).

Mixing these two haphazardly across a cluster causes operational headaches. If Kubernetes randomly moves a PostgreSQL database pod between worker nodes, that database loses access to its underlying disk storage!

Furthermore, modern cloud systems experience unpredictable surges in traffic (e.g. lunch rushes on campus). To handle this reliably and economically, our system implements **Two-Tier Autoscaling**:
* **Tier 1 (Pod-Level Autoscaling via Kubernetes HPA)**: Evaluates pod CPU metrics every 15 seconds. Pods scale up from 2 to 5 replicas in **1 to 2 seconds** when pod CPU utilization exceeds 60%.
* **Tier 2 (VM/Node-Level Autoscaling via AWS EC2 Auto Scaling Group)**: Evaluates aggregate cluster CPU metrics across worker instances. If worker CPU exceeds 75% for sustained periods, AWS spins up a new worker EC2 instance in **2 to 3 minutes**, which autonomously joins the K3s cluster.

```mermaid
flowchart TB
    subgraph Internet["Public Internet"]
        Students["Students & Couriers"]
        Admins["System Administrators"]
    end

    subgraph AWS_VPC["AWS VPC (10.0.0.0/16) — Multi-AZ (ap-southeast-1a & 1b)"]
        ALB["AWS Application Load Balancer (ALB)<br/>• Port 80 (HTTP) & Port 443 (HTTPS)<br/>• Dynamic Target Group Routing"]

        subgraph StatefulTier["Stateful Tier: Dedicated Master Node (Single AZ ap-southeast-1a)"]
            subgraph Node1["Node 1: Master & Data Node (t3.medium)<br/>Label: foc.role=data-node"]
                K3sMaster["K3s Control Plane Server"]
                Postgres["PostgreSQL 16 (6 Logical DBs)"]
                RabbitMQ["RabbitMQ 3.13 (Quorum Queues)"]
                Debezium["Debezium Server 2.7 (User, Order, Credit)"]
                EBS["25GB gp3 Amazon EBS<br/>Mounted at /var/foc-data"]
                Postgres --- EBS
                RabbitMQ --- EBS
                Debezium --- EBS
            end
        end

        subgraph StatelessTier["Stateless Tier: EC2 Auto Scaling Group (Multi-AZ, min=2, desired=2, max=3 instances)"]
            subgraph ASG["AWS Auto Scaling Group (foc-prod-worker-asg)"]
                subgraph Node2["Worker EC2 Instance A (t3.small)<br/>Label: foc.role=worker-node"]
                    Ingress1["Traefik Ingress Controller"]
                    Gateway1["api-gateway (NGINX)"]
                    PodsA["Microservice Pods (Tier 1 HPA Replicas)"]
                    Frontends1["student-app & admin-portal"]
                end

                subgraph Node3["Worker EC2 Instance B (t3.small)<br/>Label: foc.role=worker-node"]
                    Ingress2["Traefik Ingress Controller"]
                    Gateway2["api-gateway (NGINX)"]
                    PodsB["Microservice Pods (Tier 1 HPA Replicas)"]
                    Frontends2["student-app & admin-portal"]
                end
            end
        end
    end

    Students -->|HTTPS / Port 443| ALB
    Admins -->|HTTPS / Port 443| ALB

    ALB -->|Forward Port 80| Ingress1
    ALB -->|Forward Port 80| Ingress2

    Ingress1 --> Gateway1
    Ingress2 --> Gateway2

    Gateway1 --> PodsA
    Gateway2 --> PodsB

    PodsA <-->|Flannel Overlay Network| Postgres
    PodsB <-->|Flannel Overlay Network| Postgres
    PodsA <-->|Flannel Overlay Network| RabbitMQ
    PodsB <-->|Flannel Overlay Network| RabbitMQ
```

#### How the Two Tiers Collaborate:
1. **Tier 1 (Horizontal Pod Autoscaler - HPA)**:
   - When a sudden burst of student orders arrives, the microservice containers spike in CPU.
   - K3s Horizontal Pod Autoscaler immediately scales replicas (e.g. `order-service` expands from 2 to 5 pods) within existing worker memory and CPU headroom in **1–2 seconds**.
2. **Tier 2 (AWS EC2 Auto Scaling Group - ASG)**:
   - If high load continues and worker CPU exceeds 75% average (`ASGAverageCPUUtilization`), CloudWatch alerts the Auto Scaling Group.
   - The ASG launches a new `t3.small` EC2 worker instance via `aws_launch_template.k3s_worker`.
   - The new instance executes its `user_data` bootstrap script, waits for the master node API to respond, installs the K3s agent, and automatically registers itself with the cluster.
   - The ALB dynamically adds the new worker to its Target Group, and K3s immediately distributes pod workloads onto the newly added compute node!
3. **Hard Budget Ceiling & Cost Optimization**:
   - The worker ASG enforces `min_size = 1`, `desired_capacity = 1`, and `max_size = 3`.
   - Baseline worker instances run on cost-effective `t3.small` (2 vCPU, 2GB RAM at \$0.0259/hr), while the stateful master runs on `t3.medium` (2 vCPU, 4GB RAM at \$0.0518/hr) to ensure database stability.
   - Even under continuous synthetic load testing, AWS will **never launch more than 3 worker instances**, keeping maximum cluster compute costs strictly capped.

---

### 1.4 The S\$50 SGD Student Budget Constraint: How We Run 24/7 Safely

The National University of Singapore provisions student AWS accounts with a strict S\$50 SGD credit allocation. Exceeding this budget causes the account to be locked. Our infrastructure is specifically engineered to run **24/7 continuously across a 16-day submission window** without exceeding this cap:

1. **Zero Control-Plane Tax**: We use K3s instead of AWS EKS, avoiding the fixed \$73 USD/month EKS control plane surcharge.
2. **Right-Sized Compute Splitting**:
   * **Node 1 (Master / Data Node)**: Fixed `t3.medium` (4GB RAM) dedicated to PostgreSQL 16, RabbitMQ, and Debezium CDC to prevent Out-Of-Memory (OOM) crashes (\$0.0518/hr).
   * **Worker Pool**: Elastic `t3.small` (2GB RAM) running stateless microservices and frontends (\$0.0259/hr — 50% cheaper).
   * **16-Day 24/7 Compute Cost**: $(\$0.0518 + \$0.0259) \times 384\text{ hours} = \mathbf{\$29.84\text{ USD}}$.
3. **Optimized Storage Allocation**:
   * Persistent EBS gp3 Data Volume: **25 GB** ($\approx$\$1.17 for 16 days).
   * Master Root Disk: **30 GB** gp3; Worker Root Disk: **20 GB** gp3 ($\approx$\$2.35 for 16 days).
4. **Predictable Load Balancer & ECR Lifecycle**:
   * AWS Application Load Balancer: \$0.0252/hr $\times$ 384 hours = **\$9.68 USD**.
   * ECR lifecycle policies automatically purge untagged images older than 3 days.
5. **Grand Total 16-Day 24/7 Cost**:
   $$\$29.84\text{ (EC2)} + \$9.68\text{ (ALB)} + \$3.52\text{ (EBS)} = \mathbf{\$43.04\text{ USD}} \quad (< \mathbf{\$50.00\text{ Budget}})$$
   This allows the cluster to run continuously 24/7 without worrying about manual shutdowns.

---

### 1.5 End-to-End Developer Workflow: What Developers Actually Do (Step-by-Step)

When students first encounter cloud computing, a common source of confusion is understanding **who runs what, where, and when**:
* *"Do I need to run `terraform apply` every time I change a TypeScript file?"* $\to$ **No!**
* *"Do I need to SSH into AWS to deploy my changes?"* $\to$ **No!**
* *"What happens when I `git push origin main`?"* $\to$ **GitHub Actions builds the containers and deploys them to AWS automatically!**

To understand this clearly, we separate cloud operations into **two distinct lifecycles**:
1. **The Infrastructure Lifecycle (Day 1 / One-Time Setup)**: Building the virtual datacenter (VPC, subnets, load balancer, EC2 instances, storage disks, IAM roles). This is executed **once locally** by one team member using Terraform.
2. **The Application Lifecycle (Day 2 / Continuous Delivery)**: Building and deploying updated application code. This is executed **automatically in the cloud** via GitHub Actions whenever any team member pushes code to Git.

```mermaid
flowchart TD
    subgraph Day1["Phase 1: Day 1 — Infrastructure Genesis (One Developer, Local Laptop)"]
        D1A["1. Configure AWS CLI<br/>aws sso login"] --> D1B["2. Apply Terraform<br/>cd infra/terraform && terraform apply"]
        D1B --> D1C["AWS Provisions Infrastructure<br/>VPC, Subnets, ALB, ECR, EBS, IAM OIDC & EC2 Nodes"]
        D1C --> D1D["3. Initial K8s Manifest Bootstrap<br/>kubectl apply -f infra/k8s/"]
    end

    subgraph Day2["Phase 2: Day 2 — Everyday Feature Work (All Developers)"]
        D2A["Developer edits code locally<br/>services/order-service/..."] --> D2B["Test Locally<br/>npm run test:unit && npm run dev"]
        D2B --> D2C["Push to GitHub<br/>git push origin main"]
        D2C --> D2D["GitHub Actions (deploy.yml)<br/>Keyless OIDC Auth with AWS IAM"]
        D2D --> D2E["Docker Buildx<br/>Builds linux/amd64 images & pushes to Amazon ECR"]
        D2E --> D2F["AWS Systems Manager (SSM)<br/>Sends remote command to Master Node"]
        D2F --> D2G["K3s Zero-Downtime Rolling Update<br/>kubectl set image & rollout status"]
    end

    subgraph Day3["Phase 3: Verification & Load Testing (Any Team Member)"]
        D3A["Verify Web Application<br/>Open http://ALB-DNS-NAME in browser"]
        D3B["Run k6 Concurrency Tests locally<br/>k6 run tests/k6/discovery-load.js"]
        D3C["Observe Live Autoscaling in terminal<br/>kubectl get hpa -n foc -w"]
    end

    Day1 --> Day2
    Day2 --> Day3
```

#### Detailed Step-by-Step Walkthrough

##### Phase 1: Day 1 — Cloud Datacenter Genesis (One Developer, Local Laptop)
Only **one designated teammate** needs to perform this setup once to create the AWS environment:

1. **Authenticate with AWS**:
   ```bash
   # Log in to your AWS Academy or IAM Identity Center session
   aws sso login   # or export AWS_ACCESS_KEY_ID & AWS_SECRET_ACCESS_KEY
   ```
2. **Provision Cloud Infrastructure via Terraform**:
   ```bash
   cd infra/terraform
   cp terraform.tfvars.example terraform.tfvars
   # Configure variables: aws_region = "ap-southeast-1", github_repo = "AY2627S1-CS3219-P25/friend-on-campus"
   
   terraform init
   terraform plan
   terraform apply -auto-approve
   ```
   Terraform takes $\approx$3 minutes to provision the VPC, subnets, Application Load Balancer, ECR container repositories, EBS gp3 volume, IAM OIDC trust policies, and the EC2 Master + Worker ASG instances.
3. **Capture Outputs**:
   ```bash
   # Note down these values from the terminal:
   terraform output alb_dns_name          # e.g., foc-prod-alb-123456789.ap-southeast-1.elb.amazonaws.com
   terraform output master_instance_id    # e.g., i-0abcd1234efgh5678
   terraform output ecr_repository_urls   # Map of ECR repository URIs
   ```
4. **Initial Kubernetes Manifest Bootstrap**:
   Connect to the Master Node via AWS Systems Manager (no SSH key needed) and apply the initial K8s manifests:
   ```bash
   MASTER_ID=$(terraform output -raw master_instance_id)
   aws ssm start-session --target "$MASTER_ID"
   
   # Inside the Master EC2 instance shell:
   sudo -i
   kubectl get nodes -o wide   # Verify Master and Worker nodes are in 'Ready' state
   
   # Apply K8s manifests (Namespace, Storage, Secrets, Postgres, RabbitMQ, Services, Ingress, HPA)
   kubectl apply -f /path/to/infra/k8s/
   ```
   At this point, the cloud cluster is live, the database is mounted on persistent EBS, RabbitMQ is routing messages, and the ALB is ready to receive web traffic!

---

##### Phase 2: Day 2 — Everyday Feature Work & Continuous Delivery (All Developers)
Once the infrastructure is up, **no developer ever needs to run Terraform or manually SSH into AWS again** for everyday coding.

1. **Develop and Test Locally as Usual**:
   Developers write code on their own machines, run local unit tests, and verify features:
   ```bash
   # Work on features or bugfixes
   npm run dev:services
   npm run test:unit
   ```
2. **Commit and Push to GitHub**:
   ```bash
   git checkout -b feat/order-cancellation
   # ... write code ...
   git commit -m "feat(order): add errand cancellation window"
   git push origin feat/order-cancellation
   ```
3. **Open Pull Request & Merge**:
   - The Pull Request triggers `.github/workflows/ci.yml` (running linting, typechecking, and unit tests).
   - Once approved and merged into `main`, GitHub Actions triggers `.github/workflows/deploy.yml`.
4. **What GitHub Actions Executes Automatically (Under the Hood)**:
   - **Step 1 (Keyless AWS Authentication)**: GitHub Actions requests an OIDC cryptographic token and exchanges it with AWS STS for temporary IAM role credentials (`configure-aws-credentials`). No permanent AWS keys are stored in GitHub Secrets!
   - **Step 2 (Cross-Platform Container Build)**: Docker Buildx builds the service container image targeting `linux/amd64` (ensuring compatibility with AWS EC2 even if built on an Apple Silicon M1/M2/M3 Mac).
   - **Step 3 (Push to ECR)**: Pushes the container image to Amazon ECR tagged with the Git commit SHA (e.g., `user-service:95399d8`).
   - **Step 4 (Remote Deployment via AWS SSM)**: GitHub Actions uses AWS Systems Manager Run Command to send an update command directly to the Master EC2 instance:
     ```bash
     kubectl set image deployment/order-service \
       order-service=<AWS_ACCOUNT_ID>.dkr.ecr.ap-southeast-1.amazonaws.com/foc-prod/order-service:95399d8 \
       -n foc
     kubectl rollout status deployment/order-service -n foc --timeout=180s
     ```
   - **Step 5 (Zero-Downtime Rolling Update)**: Kubernetes spins up new Pods with the new image, waits for readiness probes to report HTTP 200, shifts ALB traffic to the new Pods, and terminates the old Pods. Live users experience **zero downtime**!

---

##### Phase 3: Day 3 & Ongoing — Verification, Concurrency & Load Testing (Any Team Member)
Any teammate can verify the deployment or collect rubric evidence from their own laptop:

1. **Access the Live Platform in a Web Browser**:
   Open the ALB DNS URL in any browser:
   * **Student Web App**: `http://<ALB_DNS_NAME>/`
   * **Admin Portal**: `http://<ALB_DNS_NAME>/admin/`
   * **API Health Check**: `http://<ALB_DNS_NAME>/api/orders/health`
2. **Run Distributed Concurrency & Load Tests with k6**:
   Run k6 directly from your local terminal against the live AWS ALB:
   ```bash
   # Scenario A: Verify race condition prevention (Category N3)
   k6 run --env BASE_URL=http://<ALB_DNS_NAME> tests/k6/order-claim-race.js
   
   # Scenario B: Generate traffic spike to trigger live autoscaling (Category N4)
   k6 run --env BASE_URL=http://<ALB_DNS_NAME> tests/k6/discovery-load.js
   ```
3. **Observe Live Cluster Scaling**:
   Open an SSM terminal to watch the Horizontal Pod Autoscaler and EC2 Auto Scaling Group respond in real time:
   ```bash
   # Terminal 1: Watch pods scale from 2 to 5 replicas
   kubectl get hpa -n foc -w
   
   # Terminal 2: Watch worker nodes and pod placement
   kubectl get pods -n foc -o wide -w
   ```
4. **Preserving Student Budget (Nightly Stop & Resume)**:
   When you finish working for the day, pause the cluster using the commands in [Section 6.5](#65-preserving-the-student-budget-nightly-stop--resume). When you wake up, resume with one command.

---

#### Summary: Who Runs What, Where, and When?

| Operation | When to Run | Who Executes It | Where It Runs | Tool Used | Output / Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cloud Provisioning** | Day 1 (once) | 1 designated teammate | Local laptop | Terraform CLI | VPC, ALB, ECR, EBS, EC2 Master & Worker ASG created |
| **Initial K8s Bootstrap** | Day 1 (once) | 1 designated teammate | Master EC2 shell | AWS SSM + `kubectl` | Postgres, RabbitMQ, microservices & Ingress booted |
| **Feature Development** | Day 2+ (daily) | All developers | Local laptop | Node.js, `npm run dev` | Code changes and local test passes |
| **Deploying Code Updates** | Day 2+ (continuous) | **Automated** | GitHub Actions Cloud | GitHub Actions CD + AWS SSM | Docker images built, pushed to ECR, rolled out to K3s |
| **Milestone D4 Verification** | Whenever testing | Any teammate | Local laptop | k6 CLI + Web Browser | Concurrency proof & live HPA scaling evidence |
| **Nightly Pause / Resume** | End / start of day | Any teammate with AWS access | Local laptop | AWS CLI (`aws autoscaling`, `aws ec2`) | Compute charges drop to \$0.00 while preserving all data |
| **Complete Cloud Teardown** | End of semester | 1 designated teammate | Local laptop | Terraform CLI (`terraform destroy`) | All AWS resources permanently deleted |

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
* `worker_instance_type`: EC2 instance type for Worker Nodes (defaults to `t3.small`).
* `worker_min_size`: Minimum number of worker EC2 instances in the Auto Scaling Group (defaults to `1`).
* `worker_desired_capacity`: Baseline desired number of worker EC2 instances (defaults to `1`).
* `worker_max_size`: Hard ceiling on worker EC2 instances to protect student budget (defaults to `3`).
* `worker_cpu_target`: Target average CPU percentage across workers before triggering scale-out (defaults to `75.0`%).
* `ebs_volume_size`: Size of persistent EBS volume (defaults to `25` GB).
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
* `aws_ebs_volume.data_volume`: A 25GB **General Purpose SSD (gp3)** volume provisioned in `ap-southeast-1a` (the exact AZ where Node 1 resides). Configured with `encrypted = true` and `kms_key_id = "alias/aws/ebs"` for transparent encryption at rest.
* `aws_volume_attachment.master_data`: Attaches this EBS volume to Node 1 as block device `/dev/sdf`.

#### `ec2.tf`
Provisions the virtual compute instances and automated scaling infrastructure:
* `data.aws_ssm_parameter.ubuntu_ami`: Automatically queries the AWS public SSM parameter store for the latest official AMI ID of **Canonical Ubuntu 24.04 LTS (Noble Numbat)** for `amd64`. This ensures our base OS is always patched with modern security updates.
* `aws_instance.k3s_master` (Node 1 - Stateful Data Node):
  * Runs our bootstrap shell script via `user_data`.
  * Detects the attached EBS disk (`/dev/nvme1n1` or `/dev/xvdf`).
  * If the disk has no filesystem, formats it with `mkfs.ext4`.
  * Adds an entry to `/etc/fstab` and mounts the volume to `/var/foc-data`.
  * Installs K3s server using Rancher's official script with `--node-label foc.role=data-node`. (Note: Built-in `servicelb` is kept active so Klipper LB binds `HostPort: 80` across all cluster nodes for AWS ALB target forwarding).
* `aws_launch_template.k3s_worker` (Tier 2 Autoscaling Template):
  * Defines the standardized blueprint for all stateless worker nodes: Ubuntu 24.04 LTS, `t3.small` (2 vCPU, 2GB RAM), 20GB gp3 encrypted root disk, cluster security group, and SSM instance profile.
  * Contains an autonomous bootstrap script (`user_data`) encoded in base64: polls the master K3s API server on port 6443, installs the K3s agent, and registers the worker with `--node-label foc.role=worker-node`.
* `aws_autoscaling_group.k3s_workers` (Tier 2 Elastic Worker Pool):
  * Manages the worker EC2 fleet across multiple Availability Zones (`public_a` and `public_b`).
  * Enforces `min_size = 2`, `desired_capacity = 2`, and `max_size = 3`. Having 2 baseline workers provides 4 GB aggregated RAM across distinct Availability Zones, comfortably accommodating all 17 microservice pods without eviction.
  * Automatically registers and deregisters EC2 instances with the Application Load Balancer target group (`target_group_arns`).
  * Configured with rolling `instance_refresh` so updates to the launch template can roll out zero-downtime updates across the worker fleet.
* `aws_autoscaling_policy.worker_cpu_policy` (Target Tracking Scaling Policy):
  * Continuously evaluates `ASGAverageCPUUtilization`.
  * When average worker CPU utilization exceeds 75%, AWS CloudWatch instructs the Auto Scaling Group to add an EC2 instance. When CPU load normalizes, it gracefully scales back in down to the baseline.

#### `alb.tf`
Provisions the public entrance to our system:
* `aws_lb.main`: An Internet-facing Application Load Balancer spanning multiple Availability Zones (`ap-southeast-1a` and `ap-southeast-1b`).
* `aws_lb_target_group.http`: Routes traffic on port 80 to the cluster instances. Regularly checks `/health` every 15 seconds to ensure only healthy nodes receive user traffic.
* `aws_lb_target_group_attachment.master`: Registers Node 1 into the load balancer pool.
* **Dynamic Worker Target Registration**: Worker nodes are not statically attached! Instead, `aws_autoscaling_group.k3s_workers` dynamically registers each newly launched worker instance and deregisters terminated instances directly via `target_group_arns`.
* `aws_lb_listener.http`: Listens on public HTTP port 80 and forwards requests to the target group.

#### `ecr.tf`
Provisions 9 private repositories in Amazon Elastic Container Registry (ECR) for all project images:
`foc/user-service`, `foc/supplier-service`, `foc/order-service`, `foc/credit-service`, `foc/notification-service`, `foc/chat-service`, `foc/gateway`, `foc/student-app`, and `foc/admin-portal`.
Each repository includes an automated **Lifecycle Policy** that purges untagged images older than 3 days and retains at most 10 images per service, protecting the student account from unnecessary storage fees.

#### `outputs.tf`
Defines the output variables printed in the terminal after running `terraform apply`:
* `alb_url`: The public web address to open in your browser to view the application.
* `master_instance_id` & `master_public_ip`: Identifiers for Node 1.
* `worker_asg_name`: The name of the EC2 Auto Scaling Group (`foc-prod-worker-asg-...`).
* `worker_asg_capacity`: Map showing `min_size`, `desired_capacity`, and `max_size`.
* `list_worker_instances_command`: Pre-formatted AWS CLI command to query active worker instance IDs, lifecycle states, and health statuses directly from the ASG.
* `ssm_connect_master`: Pre-formatted command to open an instant terminal shell on Node 1 via AWS SSM.
* `fetch_kubeconfig_command`: Command to download the cluster's `kubeconfig` to your local machine.

#### `terraform.tfvars.example`
A reference template illustrating how students can customize instance types or domain certificates without editing core `.tf` files.

---

### 2.5 Day 1 vs. Day 2: Why We Separate Terraform from GitHub Actions CD (The State Collision Trap)

Students often wonder:
> *"If GitHub Actions can run our automated tests and deployment, why shouldn't it run `terraform apply` on every commit as well?"*

The answer lies in how Terraform manages state, security, and lifecycle boundaries:

```mermaid
flowchart TD
    subgraph DevLaptop["Developer Laptop"]
        T_Local["terraform apply"] --> State_Local["terraform.tfstate (Local Disk)<br/>Contains Secrets & Passwords"]
        State_Local -.->|Excluded by .gitignore| Git["GitHub Repository"]
    end

    subgraph GitHubActions["GitHub Actions Runner"]
        Git --> FreshClone["Clones Fresh Repo (No .tfstate)"]
        FreshClone --> T_GH["terraform apply"]
        T_GH --> Collision["💥 ERROR: Resource Already Exists!<br/>• VPC 10.0.0.0/16 already exists<br/>• ECR Repository foc/order-service already exists<br/>• IAM Role already exists"]
    end
```

#### 1. The State Collision Problem (`terraform.tfstate`)
* Terraform maintains an inventory file called `terraform.tfstate` mapping declared code resources to actual AWS resource IDs (VPC IDs, Subnet IDs, Security Group IDs).
* This state file contains sensitive database passwords, generated cluster join tokens, and KMS keys. Therefore, **it is strictly excluded from Git via `.gitignore`**.
* If GitHub Actions were to run `terraform apply`, it starts inside a fresh, blank runner with **no state file**. Terraform would assume zero resources exist in AWS and attempt to create everything from scratch!
* AWS will immediately abort the run with fatal errors: *"VPC with CIDR 10.0.0.0/16 already exists"*, *"ECR repository foc/user-service already exists"*, and *"IAM role already exists"*.

#### 2. The Clean Architectural Separation of Concerns
In cloud engineering, we separate operations into two distinct lifecycles:
* **Day 1: Infrastructure Provisioning (Terraform)**:
  * Analogous to *building the airport and paving the runway*.
  * Executed **once** from your local terminal (`terraform apply`).
  * Establishes the VPC, ALB, ECR registries, IAM roles, and K3s EC2 instances.
  * You only touch Terraform again when modifying cloud topology (e.g., adding a new subnet).
* **Day 2: Application Delivery (GitHub Actions CD)**:
  * Analogous to *landing airplanes on the runway*.
  * Executed **automatically on every Git push** to `main`.
  * Builds microservice Docker images, pushes them to ECR, and triggers a zero-downtime rolling update of pods on K3s via AWS Systems Manager (SSM).
  * It does not touch cloud infrastructure.

#### 3. What About Enterprise GitOps? (The Remote Backend)
In large corporate environments where teams collaborate on infrastructure via CI/CD, engineers set up a **Terraform Remote Backend**:
* An **Amazon S3 bucket** stores the central `terraform.tfstate` with server-side encryption.
* An **Amazon DynamoDB table** provides state locking (preventing two engineers or CI jobs from applying simultaneously).
* For a 16-day university project with strict sandbox policies, managing S3 backend buckets and DynamoDB locking tables introduces unnecessary moving parts and extra permission risks. Local `terraform apply` + GitHub Actions SSM deployment is the cleanest, most reliable pattern.

---

### 2.6 Hardware, Compute & Storage Engineering Decisions

Every line of our Terraform configuration was deliberately chosen to optimize performance, stability, and budget.

#### 2.6.1 EBS gp3 SSD vs. st1 HDD: The 500 GB Minimum Provisioning Trap
Why did we choose **Amazon EBS `gp3` (General Purpose SSD)** over cheaper HDD storage tiers like `st1` (Throughput Optimized HDD)?
1. **The 500 GB Minimum Size Constraint**:
   * AWS enforces a strict minimum volume size of **500 GB** for `st1` volumes. You cannot provision a 25 GB or 50 GB `st1` disk.
   * At \$0.045/GB-month, a 500 GB `st1` disk costs **\$22.50 / month minimum**!
   * In contrast, our 25 GB `gp3` SSD costs only **\$2.20 / month** (\$0.088/GB-month $\times$ 25 GB).
2. **Boot Drive Restrictions**:
   * AWS EC2 explicitly forbids booting an operating system from `st1` or `sc1` magnetic drives. Root volumes must be SSD (`gp2` or `gp3`).
3. **Database Random I/O**:
   * Relational databases (PostgreSQL 16) perform random disk I/O when reading indexes and updating rows. Mechanical HDD heads introduce unacceptable latency. `gp3` delivers **3,000 IOPS baseline** with sub-millisecond seek times.

#### 2.6.2 Compute Architecture: x86_64 (`t3`) vs. AWS Graviton ARM64 (`t4g`)
AWS offers Graviton processors (`t4g.small` at \$0.0208/hr), which are ~20% cheaper than x86 `t3.small` (\$0.0259/hr). Over 16 days, switching to `t4g` would save $\approx$\$5 USD.

However, we intentionally standardized on **x86_64 (`t3`)**:
* **Architecture Hazards**: `t4g` uses ARM64 (`aarch64`). If any Node.js native C++ addon (`bcrypt`, Prisma query engine), Java native library in Debezium, or prebuilt container base image lacks ARM64 support, container startup crashes with `exec format error`.
* **Zero Compatibility Friction**: `t3` (x86_64) guarantees 100% binary compatibility with standard Docker images, eliminating cross-compilation risks 16 days before project submission while still keeping 24/7 costs well within the \$50 credit cap (~$43 USD).

#### 2.6.3 Why Stateless Worker Nodes Still Need 20 GB Root Disk (The Kubelet DiskPressure Trap)
Students often ask: *"If worker nodes are stateless, why do they need 20 GB of disk space?"*

```mermaid
flowchart LR
    RootDisk["20 GB Root Disk (Worker Node)"]
    RootDisk --> OS["Ubuntu 24.04 OS & K3s binaries (~4 GB)"]
    RootDisk --> Cache["Containerd Docker Image Cache (~4-5 GB)"]
    RootDisk --> Logs["Pod stdout/stderr Logs & /tmp (~2 GB)"]
    RootDisk --> Buffer["Kubelet Eviction Safety Buffer (~8 GB)"]
```

Even without a persistent database volume, a worker node stores:
1. **Ubuntu 24.04 LTS OS & K3s Agent**: Kernel, systemd, containerd daemon, and networking tools consume ~3–4 GB.
2. **Container Image Cache**: Every microservice image (`order-service`, `credit-service`, `gateway`, `traefik`, frontends) pulled from ECR is unpacked onto local disk. During rolling deployments, containerd downloads the new image before removing the old one (~4–5 GB).
3. **Container Ephemeral Writes & Logs**: Microservice stdout/stderr logs (`/var/log/pods/`) and temporary files write to root disk.
4. **The Kubelet `DiskPressure` Eviction Rule**:
   * Kubernetes continuously checks node disk usage. **If disk utilization crosses 85%, the Kubelet enters `DiskPressure` state and begins forcefully evicting (killing) running pods!**
   * A 20 GB disk guarantees sufficient operational headroom to prevent sudden pod eviction during stress tests.

#### 2.6.4 Why the Application Load Balancer (ALB) is Essential (Even Before Autoscaling)
Students frequently ask:
> *"Is the AWS Application Load Balancer (ALB) only required if we have two-tier autoscaling? If we only ran a static master and worker, couldn't we save money by pointing users straight to an EC2 public IP?"*

While autoscaling requires a load balancer to dynamically attach and detach newly spawned worker nodes, **the ALB is critical to production architecture even with zero autoscaling**:

1. **Single Stable Entrypoint vs. Ephemeral EC2 Public IPs**:
   * EC2 instances are dynamic virtual machines. If an EC2 instance reboots, stops, or is replaced by AWS during hardware maintenance, AWS changes its public IP address (unless an Elastic IP is bound, which AWS bills for).
   * Relying on raw EC2 IP addresses breaks client connections, bookmarks, and frontend configurations whenever a node cycles.
   * The ALB provides a single permanent AWS DNS address (`foc-prod-alb-xxxx.ap-southeast-1.elb.amazonaws.com`). The entire outside world talks to this unchanging DNS name, while instances behind it can restart or scale transparently.
2. **Layer 7 Ingress Routing & SSL/TLS Termination**:
   * The ALB operates at OSI Layer 7 (HTTP/HTTPS). It provides a centralized boundary to terminate SSL/TLS certificates and inspect HTTP headers before requests hit internal compute nodes.
3. **Balancing Traffic Across Multiple Cluster Nodes**:
   * In a multi-node K3s cluster, K3s runs Traefik Ingress Controller listeners on port 80 across all nodes. When thousands of external HTTP requests arrive, which EC2 node should receive them?
   * Without an ALB, 100% of external traffic would choke the single EC2 master node. The ALB distributes incoming requests across all healthy EC2 nodes using round-robin and least outstanding requests.
4. **Active Health Probing & Zero-Downtime Failover**:
   * The ALB continuously pings `/health` every 15 seconds. If a worker instance is booting, under heavy CPU load, or undergoing an OS update, the ALB instantly stops routing traffic to that node. External clients never experience abrupt `502 Bad Gateway` or `Connection Refused` errors.
5. **Defense-in-Depth Security**:
   * Backend compute instances should never be directly reachable on the public internet. Placing the ALB in the public subnet allows us to lock down the cluster security group so that EC2 instances accept HTTP traffic *exclusively* from the ALB security group, eliminating direct bot scans and arbitrary port probing.

#### 2.6.5 The K3s ServiceLB vs. AWS ALB Port-Binding Insight
When combining K3s with an external AWS Application Load Balancer, a common subtle bug arises:
* **The Symptom**: The ALB Target Group marks all EC2 instances as `unhealthy`, returning `502 Bad Gateway` or `503 Service Temporarily Unavailable` to users, even though `kubectl get pods` shows all microservices running.
* **The Root Cause**: If K3s is launched with `--disable servicelb`, K3s's built-in Klipper LoadBalancer controller is disabled. As a result, Traefik's `LoadBalancer` service cannot allocate a host port, listening only on a random internal `NodePort` (e.g. `30318`). Nothing binds to host port 80 on the EC2 instances. The AWS ALB target health check expects port 80 and receives `Connection Refused`!
* **The Solution**: Keep `servicelb` enabled in K3s. Klipper runs a lightweight DaemonSet (`svclb-traefik`) that binds `HostPort: 80` on every cluster node. The ALB target group can then forward traffic directly to port 80 of any node in the VPC, routing seamlessly to Traefik.

#### 2.6.6 Worker Fleet Sizing Rationale: Aggregate Pod Memory vs. ASG Scale-Down
* **The Memory Math**: Our microservice architecture runs 6 backend services (2 replicas each = 12 pods), 2 gateway replicas, 2 student app replicas, and 1 admin portal replica = **17 stateless pods**.
* With baseline V8 heap requirements, runtime libraries, and OS overhead, these 17 pods require $\approx$3.5 GB of aggregated RAM.
* **The Scale-Down Trap**: If `worker_min_size` is set to `1`, an idle cluster with low CPU utilization will cause CloudWatch's Target Tracking Alarm to scale down the worker Auto Scaling Group from 2 to 1 `t3.small` instance.
* Since a single `t3.small` only has 2 GB RAM, attempting to squeeze 3.5 GB of pods onto 1 node triggers severe memory starvation, OOM killing, and pod evictions.
* **The Architectural Guarantee**: Setting `worker_min_size = 2` guarantees 2 active worker instances (4 GB RAM total) across two distinct Availability Zones (`ap-southeast-1a` and `ap-southeast-1b`), providing high availability and steady headroom.

---

### 2.7 Complete AWS Component Inventory & Billability Breakdown

Every cloud infrastructure decision in Friend on Campus was made to maximize reliability, architectural realism, and security while remaining strictly under our **S$50 SGD course budget ceiling**.

#### 2.7.1 Complete Resource Inventory & Cost Summary

The following table summarizes all AWS resources provisioned by Terraform, their architectural purpose, and their billing structure:

| AWS Component | Terraform Resource | Role in Architecture | Is It Billable? | Cost Rate & Impact |
| :--- | :--- | :--- | :--- | :--- |
| **Amazon ECR** | `aws_ecr_repository.repositories` | Private container registry storing Docker images for all 6 microservices, NGINX gateway & 2 web apps | **Partially (Negligible)** | • **Free Tier:** 500 MB/month free storage.<br/>• **Storage:** \$0.10 USD/GB/mo.<br/>• **Data Transfer:** **\$0.00 (100% Free)** when EC2 nodes pull within the same region (`ap-southeast-1`).<br/>*Total cost: < \$0.20–\$0.40 USD/month.* |
| **EC2 Compute** | `aws_instance.k3s_master`, `aws_autoscaling_group.worker_asg` | 1 Master (`t3.medium`) + 2 Workers (`t3.small`) running K3s and container workloads | **Yes (Active Compute)** | • `t3.medium`: \$0.0416/hr.<br/>• `t3.small` $\times$ 2: \$0.0416/hr total.<br/>• **\$0.00/hr when stopped** via nightly pause commands. |
| **AWS ALB** | `aws_lb.main`, `aws_lb_target_group.http` | Multi-AZ Application Load Balancer routing internet traffic to workers on port 80 | **Yes (Fixed Hourly)** | $\sim$\$0.0225/hr ($\sim$\$0.54/day or $\sim$\$16/mo if left running 24/7). Stays provisioned until `terraform destroy`. |
| **Amazon EBS** | `aws_ebs_volume.stateful_data`, EC2 root disks | 25 GB gp3 SSD for PostgreSQL/RabbitMQ/Debezium persistence + 20 GB root disks per node | **Yes (Storage)** | \$0.08 USD/GB/month.<br/>$\sim$85 GB total storage = $\sim$\$6.80/month ($\sim$\$0.22/day). Stays billable while instances are paused to preserve data. |
| **Public IPv4** | AWS VPC auto-assignment | Public IP addresses assigned to the ALB and EC2 instances | **Yes (AWS Policy)** | \$0.005/hr per IPv4 address ($\sim$\$0.12/day total). |
| **Amazon VPC & Subnets** | `aws_vpc.main`, `aws_subnet.*` | Isolated virtual private network (CIDR `10.0.0.0/16`) spanned across 2 availability zones | **100% Free** | AWS charges \$0.00 for VPCs, subnets, and route tables. |
| **Internet Gateway** | `aws_internet_gateway.main` | Outbound and inbound internet gateway for public VPC subnets | **100% Free** | Zero hourly or configuration fees. |
| **Security Groups** | `aws_security_group.alb`, `aws_security_group.k3s_nodes` | Stateful virtual firewalls enforcing ALB port 80 and internal node communication | **100% Free** | Zero charges for security groups or security rules. |
| **AWS IAM & OIDC** | `aws_iam_role.github_actions_cd_role`, instance profiles | Keyless GitHub Actions CD role & EC2 instance profiles | **100% Free** | Zero charges for IAM roles, OIDC identity federation, or STS assume-role calls. |
| **AWS Systems Manager (SSM)** | AWS managed daemon | Zero-SSH terminal access via SSM Session Manager | **100% Free** | Standard SSM Session Manager is completely free (eliminates the cost of an EC2 SSH bastion host!). |

#### 2.7.2 Deep Dive: Is Amazon ECR Billable?

Students are often concerned whether maintaining 9 distinct container repositories in Amazon ECR will inflate cloud costs:

1. **Repository Creation**: **Free**. AWS charges \$0.00 to create, name, or delete ECR repositories.
2. **Data Ingress & Intra-Region Egress**:
   * Pushing newly built images from GitHub Actions to ECR is **\$0.00** (AWS does not charge for internet data transfer into AWS).
   * Pulling images from ECR onto EC2 worker instances located in the same region (`ap-southeast-1`) is **\$0.00** (AWS does not charge for intra-region transfer between ECR and EC2).
3. **Storage Billing & The Automated Cleanup Policy**:
   * Storage is charged at **\$0.10 USD per GB-month** after AWS Free Tier's 500 MB/month allowance.
   * If left unmanaged, storing 10 builds of 9 services (90 images $\times$ 400 MB = 36 GB) would accumulate $\sim$\$3.60/month.
   * **Our Terraform Solution**: In [`infra/terraform/ecr.tf`](../infra/terraform/ecr.tf), we configured an automated ECR lifecycle rule:
     ```hcl
     {
       rulePriority = 1
       description  = "Keep only the last 3 tagged images and purge untagged layers"
       selection = {
         tagStatus   = "any"
         countType   = "imageCountMoreThan"
         countNumber = 3
       }
       action = { type = "expire" }
     }
     ```
   * Because stale and untagged layers are automatically deleted, total ECR storage across all 9 repositories never exceeds 2–3 GB, costing **under S$0.40 SGD per month**.

#### 2.7.3 Why HTTP Instead of HTTPS on the ALB? (Custom Domain & ACM Constraints)

Notice that the ALB endpoint is currently accessed via `http://` rather than `https://`:
* **The AWS Domain Ownership Constraint**:
  * AWS assigns each Application Load Balancer a dynamic, AWS-owned DNS name (e.g. `foc-production-alb-144589427.ap-southeast-1.elb.amazonaws.com`).
  * To serve HTTPS with a trusted green browser padlock, an SSL/TLS certificate must be issued by a public Certificate Authority (such as AWS Certificate Manager or Let's Encrypt).
  * Public Certificate Authorities **only** issue SSL certificates to verified owners of registered domains (e.g. `yourname.com` via DNS CNAME validation). AWS owns `amazonaws.com`, and public CAs strictly prohibit issuing SSL certificates for cloud provider shared domain names (`*.elb.amazonaws.com`).
* **Academic Course Alignment**:
  * For university capstone projects, purchasing a custom domain (e.g. via Route 53 or Namecheap for \$12 USD) is optional. Exposing port 80 (HTTP) on the ALB is the standard course pattern for milestone evaluation, automated grading, and load testing.
* **Production-Ready HTTPS in Terraform**:
  * Our [`infra/terraform/alb.tf`](../infra/terraform/alb.tf) file is **already fully coded for HTTPS**:
    ```hcl
    # Optional HTTPS Port 443 Listener (Activated when certificate_arn is supplied)
    resource "aws_lb_listener" "https" {
      count             = var.certificate_arn != "" ? 1 : 0
      load_balancer_arn = aws_lb.main.arn
      port              = 443
      protocol          = "HTTPS"
      ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
      certificate_arn   = var.certificate_arn

      default_action {
        type             = "forward"
        target_group_arn = aws_lb_target_group.http.arn
      }
    }
    ```
  * If a team purchases a custom domain, they simply request an ACM certificate, add `certificate_arn = "arn:aws:acm:..."` to `terraform.tfvars`, and Terraform instantly provisions the HTTPS port 443 listener with TLS 1.3 encryption without touching any infrastructure code.

#### 2.7.4 Student Budget Ceiling Math: 24/7 vs. Nightly Pausing

* **Scenario A: Running 24/7 (Continuous)**:
  * ALB: \$0.54 / day
  * EC2 Compute (1 Master + 2 Workers): \$0.0832/hr $\times$ 24 = \$2.00 / day
  * EBS Storage (85 GB total): \$0.22 / day
  * IPv4 & ECR: $\sim$\$0.15 / day
  * **Daily Total**: $\sim$\$2.91 USD/day ($\sim$S$3.80 SGD/day).
  * For a 10-day grading period, total cost is $\approx$S$38 SGD, well under the S$50 budget cap!
* **Scenario B: Nightly Budget Pause (Recommended)**:
  * Running EC2 compute for 6 hours/day during active development:
  * Compute cost drops from \$2.00/day to **\$0.50/day**.
  * **Daily Total**: $\sim$\$1.41 USD/day ($\sim$S$1.85 SGD/day).
  * Preserves maximum budget credits for final benchmarks and live presentations.

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

### 3.2.1 What is `kubectl`? Is It Part of K3s?

Students frequently ask:
> *"What is `kubectl`? Is it a separate tool, or is it part of K3s?"*

1. **What `kubectl` is**:
   * `kubectl` (pronounced "kube-control" or "kube-cuddle") is the official Kubernetes command-line interface (CLI).
   * It acts as the **remote control / steering wheel** for any Kubernetes cluster. It does not run containers itself; instead, it sends REST API requests (in JSON/YAML) over HTTPS to the Kubernetes API server (running on port 6443) instructing it to create pods, query cluster health, or stream logs.
2. **Is it part of K3s?**:
   * **Yes and No**:
     * In upstream Kubernetes (like AWS EKS or standard K8s), `kubectl` is a separate standalone binary that you must manually install on your computer.
     * In K3s, Rancher **packaged `kubectl` directly inside the single `k3s` binary**!
   * When you install K3s on a Linux server, you can immediately run:
     ```bash
     k3s kubectl get pods -n foc
     ```
   * Furthermore, the K3s installation script creates a convenient symlink at `/usr/local/bin/kubectl` pointing directly to the `k3s` binary. This means standard commands like `kubectl get nodes` or `kubectl apply -f infra/k8s/` work out of the box with zero additional software installation!
3. **Client-Server Architecture**:
   ```mermaid
   flowchart LR
       Admin["Developer / SSM Shell<br/>(kubectl get pods)"] -->|HTTPS :6443<br/>/etc/rancher/k3s/k3s.yaml| APIServer["K3s Control Plane Server<br/>(kube-apiserver)"]
       APIServer --> State["Embedded Cluster State<br/>(sqlite / etcd)"]
       APIServer --> Kubelet["Worker Nodes<br/>(kubelet daemon)"]
   ```

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
5. **PersistentVolume (PV) & PersistentVolumeClaim (PVC)**: The storage abstraction. A `PersistentVolume` represents a physical storage disk (our 25GB EBS volume). A `PersistentVolumeClaim` is a ticket requested by a container to claim storage on that disk.
6. **Ingress**: The cluster's front door. It receives HTTP requests from the AWS ALB and routes them to the correct internal Service based on URL paths.
7. **Horizontal Pod Autoscaler (HPA)**: The autopilot. It periodically checks the CPU and memory consumption of your pods. When traffic spikes and CPU exceeds a threshold (e.g. 60%), HPA instructs the Deployment to increase replicas from 2 to 5.

---

### 3.4 Multi-Node Overlay Networking: Flannel VXLAN, Pod CIDRs, and CoreDNS in Plain English

When running K3s across multiple EC2 instances (1 Master + 1 to 3 Workers), a fundamental networking question arises:
> *"How do pods communicate across different EC2 instances? If `order-service` runs on Worker 1, how does it talk to `postgres` running on Master? Is this managed by AWS or by K3s?"*

The answer is that Kubernetes uses a **two-layer networking model**: the **Underlay** (AWS VPC) and the **Overlay** (K3s Flannel).

```mermaid
flowchart TD
    subgraph VPC["AWS VPC Underlay Network (10.0.0.0/16)"]
        subgraph MasterEC2["Master Node (EC2: 10.0.1.10)"]
            F0["Flannel Interface (flannel.1)"]
            cni0["Bridge cni0 (10.42.0.0/24)"]
            PodDB["PostgreSQL Pod<br/>(10.42.0.8)"]
            F0 --- cni0 --- PodDB
        end

        subgraph WorkerEC2["Worker Node 1 (EC2: 10.0.1.20)"]
            F1["Flannel Interface (flannel.1)"]
            cni1["Bridge cni1 (10.42.1.0/24)"]
            PodOrder["order-service Pod<br/>(10.42.1.15)"]
            F1 --- cni1 --- PodOrder
        end

        MasterEC2 <-->|VXLAN UDP Port 8472| WorkerEC2
    end
```

#### 1. Underlay vs. Overlay: The Two Network Planes
* **AWS VPC Underlay (`10.0.0.0/16`)**:
  * Managed by AWS VPC routing tables.
  * Assigns private IP addresses to each physical EC2 instance (e.g., Master = `10.0.1.10`, Worker 1 = `10.0.1.20`, Worker 2 = `10.0.1.21`).
  * Instances talk to each other over standard AWS network interfaces.
* **K3s Pod Overlay (`10.42.0.0/16`)**:
  * Managed by **K3s and Flannel CNI** (Container Network Interface).
  * Creates a software-defined, flat virtual network spanning the entire cluster.
  * Every pod receives its own unique IP inside `10.42.0.0/16`, regardless of which EC2 instance it runs on. To the containers, all pods appear to sit on the exact same local Ethernet switch.

#### 2. Subnet Slicing: Pod CIDR per Node
When the K3s control plane starts, it automatically carves up the `10.42.0.0/16` overlay into dedicated non-overlapping `/24` subnets (each supporting 254 pods):
* **Master Node**: Assigned `10.42.0.0/24` (Pods on master receive `10.42.0.2`, `10.42.0.3`...)
* **Worker Node 1**: Assigned `10.42.1.0/24` (Pods on worker 1 receive `10.42.1.2`, `10.42.1.3`...)
* **Worker Node 2**: Assigned `10.42.2.0/24` (Pods on worker 2 receive `10.42.2.2`, `10.42.2.3`...)

Because every node has a distinct subnet slice, no two pods in the cluster will ever have an IP collision.

#### 3. The Packet Journey: Flannel VXLAN Encapsulation
What happens when Pod A (`order-service` on Worker 1, `10.42.1.15`) queries PostgreSQL on Master (`10.42.0.8:5432`)?

```mermaid
sequenceDiagram
    autonumber
    participant PodA as "Pod: order-service<br/>(10.42.1.15 on Worker 1)"
    participant F1 as "flannel.1 Interface<br/>(Worker 1: 10.0.1.20)"
    participant VPC as "AWS VPC Router"
    participant F0 as "flannel.1 Interface<br/>(Master: 10.0.1.10)"
    participant PodDB as "Pod: postgres<br/>(10.42.0.8 on Master)"

    PodA->>F1: 1. Outgoing TCP Packet: [Src: 10.42.1.15 ➔ Dst: 10.42.0.8:5432]
    Note over F1: 2. Flannel Route Lookup:<br/>Destination 10.42.0.0/24 lives on EC2 host 10.0.1.10.<br/>Encapsulation: Wraps the original TCP packet<br/>inside an outer UDP datagram!
    F1->>VPC: 3. Outgoing UDP Packet: [Src: 10.0.1.20:8472 ➔ Dst: 10.0.1.10:8472]
    VPC->>F0: 4. Standard AWS VPC delivers UDP packet across EC2 nodes
    Note over F0: 5. VXLAN Decapsulation:<br/>Strips outer UDP wrapper,<br/>restores inner TCP packet: [Src: 10.42.1.15 ➔ Dst: 10.42.0.8:5432]
    F0->>PodDB: 6. Delivers unwrapped packet to Postgres container via local cni0 bridge
```

* **Step 1**: Pod A generates a standard TCP packet targeting `10.42.0.8:5432`.
* **Step 2**: The packet hits Worker 1's `flannel.1` virtual network tunnel device. Flannel inspects its kernel routing table and determines that `10.42.0.0/24` resides on EC2 host `10.0.1.10`.
* **Step 3 (Encapsulation)**: Flannel wraps the entire original TCP/IP packet inside an outer **UDP datagram** addressed to `10.0.1.10:8472` (standard VXLAN port).
* **Step 4**: The AWS VPC router delivers this standard UDP packet across EC2 instances. *(This is why our Terraform `security_groups.tf` opens UDP port 8472 between cluster instances!)*
* **Step 5 (Decapsulation)**: Master's `flannel.1` interface catches the packet on port 8472, strips the outer UDP wrapper, and extracts the original packet.
* **Step 6**: Master routes the packet through the local `cni0` bridge directly into the PostgreSQL container.

Neither container has any awareness of the underlying EC2 instances or the VXLAN tunnel—they communicate using transparent TCP sockets.

#### 4. Service Discovery with CoreDNS and ClusterIP
Pods are ephemeral: when a pod crashes, restarts, or scales, its IP changes. You should **never** hardcode pod IP addresses in application configurations.

Kubernetes solves this with **Services** and **CoreDNS**:
1. **ClusterIP Subnet (`10.43.0.0/16`)**:
   * Every Kubernetes Service gets a permanent, virtual ClusterIP (e.g., `credit-service` $\to$ `10.43.0.45`).
   * This IP never changes for the entire lifetime of the Service.
2. **CoreDNS In-Cluster Resolution**:
   * When `order-service` calls `http://credit-service:8004`, it asks the internal CoreDNS server. CoreDNS resolves `credit-service` to `10.43.0.45`.
3. **Layer 4 Load Balancing via Linux iptables/kube-proxy**:
   * When traffic leaves the container destined for `10.43.0.45`, the Linux kernel's `iptables` / `netfilter` rules intercept the packet.
   * `iptables` rewrites the destination IP (DNAT) to one of the live, healthy Pod IPs (e.g., `10.42.1.12` or `10.42.2.8`), automatically distributing load across all running pod replicas.

---

### 3.5 File-by-File Breakdown of `infra/k8s/`

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
Contains all cluster configuration, declarative definitions, and credentials:
* `foc-common-config`: Exposes cluster-internal microservice hostnames:
  * `USER_SERVICE_URL: "http://user-service:8001"`
  * `SUPPLIER_SERVICE_URL: "http://supplier-service:8002"`
  * `ORDER_SERVICE_URL: "http://order-service:8003"`
  * `CREDIT_SERVICE_URL: "http://credit-service:8004"`
  * `NOTIFICATION_SERVICE_URL: "http://notification-service:8005"`
  * `RABBITMQ_URL: "amqp://foc_user:foc_password@rabbitmq:5672"`
* `foc-secrets`: Securely encodes database passwords, RabbitMQ credentials, and JWT signing keys (Ed25519 public/private keys).
* `postgres-init-script`: Embeds the SQL initialization script (`01-init-databases.sql`) that runs on PostgreSQL's first boot, provisioning all 6 logical databases (`user_db`, `supplier_db`, `order_db`, `credit_db`, `notification_db`, `chat_db`) and granting least-privilege user credentials.
* `rabbitmq-definitions`: Declarative broker topology (`rabbitmq.conf` + `definitions.json`) that preloads the `campus` vhost, least-privilege service accounts (`order_service`, `credit_service`, `user_service`, etc.), quorum queues (`credit-service.events`, `order-service.events`), DLQs, and topic bindings upon broker boot without requiring manual HTTP API calls.
* `debezium-configs`: Configuration properties (`order.properties`, `credit.properties`, `user.properties`) configuring the Quarkus SmallRye Debezium EventRouter SMT to stream PostgreSQL outbox events directly to RabbitMQ topic exchange routing keys.

#### `02-storage.yaml`
Establishes durable persistence by binding Kubernetes to our Amazon EBS volume:
* `foc-ebs-pv`: A 25GB `PersistentVolume` with `storageClassName: local-storage`. Crucially, it defines `nodeAffinity`:
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
  * Mounts `rabbitmq-definitions` to `/etc/rabbitmq/` for idempotent declarative broker bootstrapping.
* **Debezium Server 2.7 CDC Connectors (`debezium-order`, `debezium-credit`, `debezium-user`)**:
  * Deploys 3 lightweight CDC connectors pinned to Node 1.
  * Captures real-time changes from PostgreSQL outbox tables via `pgoutput` logical replication and publishes event streams into RabbitMQ `campus.events` exchange.
  * Mounts subpaths `debezium/order`, `debezium/credit`, and `debezium/user` on the persistent EBS volume to persist WAL replication offsets across restarts.

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
  * **Decoupled Readiness Probe (`GET /health`)**: Probes NGINX's own internal `/health` endpoint instead of `/`. If the probe targeted `/`, NGINX would proxy to `student-app:5173`. When `student-app` restarts or reschedules, the probe would fail with `502 Bad Gateway`, causing Kubernetes to evict all gateway endpoints and triggering a cascading cluster-wide 503 outage. Decoupling ensures robust gateway availability.

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

##### The Two-Tier Gateway Pattern: Traefik (Cluster Ingress) vs. NGINX (Application API Gateway)

Students frequently ask:
> *"If Traefik is an Ingress controller, why do we also deploy an NGINX API Gateway? Doesn't NGINX do routing too?"*

This architecture intentionally implements the **Two-Tier Gateway Pattern**:

1. **Tier 1: Traefik (Kubernetes Infrastructure Ingress)**:
   * Traefik lives at the **cluster boundary**.
   * Its role is Kubernetes infrastructure plumbing: binding to host port 80 via K3s ServiceLB, fulfilling the Kubernetes `Ingress` specification, and safely bringing external HTTP traffic from the AWS ALB into the internal pod overlay network.
   * In `06-ingress.yaml`, Traefik's rule forwards all incoming traffic (`path: /`) straight into the `api-gateway` service.
2. **Tier 2: NGINX (Application API Gateway)**:
   * NGINX lives inside the application layer (`gateway/nginx.conf`).
   * It handles all application-level routing, security controls, and protocol negotiation:
     * Routes `/api/orders` $\to$ `order-service:8003`.
     * Routes `/api/auth` and `/api/users` $\to$ `user-service:8001`.
     * Strictly blocks external access to internal escrow endpoints (`/api/credits/escrow`) with **HTTP 403 Forbidden**.
     * Handles WebSocket protocol upgrades (`/ws/chat/` $\to$ HTTP 101 Switching Protocols).
     * Routes `/admin` to the Admin Portal SPA and `/` to the Student App SPA.
3. **The Engineering Benefit: 100% Local Parity**:
   * In local development, developers run `docker-compose up` without Kubernetes or Traefik.
   * Because all microservice routing, WebSocket upgrades, and security blocks are defined inside NGINX, the application behaves **identically** on a local developer's laptop as it does inside the cloud Kubernetes cluster, eliminating "works on my machine" bugs.

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
    participant OldPods as "Running Pods (v1)"
    participant NewPods as "New Pods (v2)"
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

### 5.1 Where k6 Runs: Local Laptop vs. Cloud Runners (Zero-Cost External Simulation)

Students often ask:
> *"Does k6 run locally on my developer laptop, or is it deployed into AWS alongside the cluster?"*

Our test suite is designed to run **locally from your development laptop**, directing simulated virtual user traffic over the public internet to the **AWS Application Load Balancer (ALB)** endpoint.

```mermaid
flowchart LR
    subgraph LocalMachine["Developer Laptop (Mac / Linux / Windows)"]
        k6["k6 CLI Runner<br/>(tests/k6/*.js)"]
        Term1["Terminal: k6 run ..."]
        Term2["Terminal: kubectl get hpa -w"]
    end

    subgraph AWSCloud["AWS Singapore Region (ap-southeast-1)"]
        ALB["Application Load Balancer<br/>(Public DNS Entrypoint)"]
        subgraph Cluster["K3s Cluster (VPC 10.0.0.0/16)"]
            Ingress["Traefik Ingress Controller"]
            Pods["Microservice Pods<br/>(order-service, credit-service...)"]
        end
    end

    k6 -->|Public Internet Traffic| ALB
    ALB --> Ingress --> Pods
    Term2 -.->|SSM Tunnel / kubectl| Cluster
```

#### Why Local Execution is the Recommended Architecture:
1. **$0.00 Extra Cloud Spend**:
   * Commercial cloud load generators (such as k6 Cloud SaaS or dedicated EC2 stress-testing instances) burn AWS credits and compute hours.
   * Running k6 locally costs **$0.00**, preserving our entire \$50 sandbox credit for continuous 24/7 cluster runtime.
   * **Zero Installation Required**: If `k6` is not installed locally on your Mac/Linux laptop, run it via Docker with zero setup:
     ```bash
     docker run --rm -i \
       -e TARGET_HOST="http://<ALB_DNS>" \
       -v "$PWD/tests/k6:/scripts" \
       grafana/k6 run /scripts/order-claim-race.js
     ```
2. **True End-to-End Client Simulation**:
   * In production, NUS students do not place orders from *inside* the AWS VPC; they browse from student hostels, laptops, and mobile phones across the internet.
   * Running k6 locally simulates genuine external network behavior across the full path:
     `Local Client ➔ Public Internet ➔ AWS Internet Gateway ➔ AWS ALB ➔ Traefik Ingress ➔ Pod Service`
   * In contrast, executing load tests inside the VPC would bypass the public internet and load balancer listeners, masking realistic ingress latency and connection handling.
3. **Interactive Side-by-Side Verification & Grading Demos**:
   * Running locally allows side-by-side terminal verification during Milestone D4 grading presentations:
     * **Terminal 1 (Load Generator)**: Run `TARGET_HOST="http://<ALB_DNS>" k6 run tests/k6/discovery-load.js` (or via Docker)
     * **Terminal 2 (Pod Autoscaling)**: Run `kubectl get hpa -n foc -w` to watch HPA CPU metrics climb and replica count scale from 2 to 5.
     * **Terminal 3 (Pod Placement)**: Run `kubectl get pods -n foc -o wide -w` to watch newly spawned pods schedule dynamically across worker nodes.
     * **Terminal 4 (EC2 Autoscaling)**: Run `aws autoscaling describe-auto-scaling-groups ...` to monitor the AWS EC2 Auto Scaling Group scale under sustained peak load.
4. **When do Enterprises Deploy Cloud Load Runners?**:
   * Enterprise teams only need distributed cloud runners (such as the Kubernetes `k6-operator`) when testing massive industrial scale (e.g., 50,000+ to 100,000+ concurrent Virtual Users) where a single laptop's Wi-Fi bandwidth or operating system file descriptor limits (`ulimit -n`) become saturated.
   * For CS3219 milestone benchmarks (100–300 concurrent Virtual Users), a modern laptop easily drives this load while consuming less than 5% CPU.

---

### 5.2 Why k6 over Apache JMeter or Apache Bench?

In CS3219, verifying Non-Functional Requirements (NFRs) like scalability, concurrency, and latency requires automated load testing.

While older tools like Apache JMeter (heavy XML files and clunky Java GUI) or Apache Bench (basic single-endpoint hammering) are common, modern engineering teams prefer **k6 by Grafana**:
1. **Tests as Code (JavaScript ES6)**: Test scripts are written in readable modern JavaScript, checked into Git, and reviewed in PRs.
2. **Thresholds & Assertions**: Native assertions allow you to enforce strict performance budgets (e.g. `p(95) < 800ms`, `rate < 0.01`).
3. **Distributed Virtual Users (VUs)**: Lightweight Go-based concurrency engine capable of generating thousands of requests from a single test runner.

---

### 5.3 Scenario A: Race Condition Verification (`order-claim-race.js`)

#### The Academic Challenge:
In a campus peer-to-peer errand platform, multiple student couriers may attempt to claim the exact same open errand simultaneously.
* If two couriers claim the same errand, who gets paid?
* How does the system guarantee that **exactly one** courier wins, while all other couriers receive a clean conflict error without database corruption?

```mermaid
sequenceDiagram
    autonumber
    actor Courier1 as "Courier A (VU 1)"
    actor Courier2 as "Courier B (VU 2)"
    participant Svc as order-service
    participant DB as "PostgreSQL 16 (order_db)"

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

### 5.4 Scenario B: Discovery Traffic Spikes & Live Autoscaling (`discovery-load.js`)

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
    
    MetricsServer["K3s Metrics Server"] -.->|Detects CPU over 60%| HPA["Horizontal Pod Autoscaler"]
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

### 5.5 Fulfilling CS3219 Rubric Categories N3 & N4 for Milestone D4

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

### 6.4 Common Kubernetes Troubleshooting Scenarios (`CrashLoopBackOff`, `ImagePullBackOff`, `Pending`)

When operating a Kubernetes cluster, pods may periodically enter error states. The table below lists the most common issues students encounter and their exact resolutions:

| Pod Status / Error | What It Means (Root Cause) | Diagnostic Command | How to Fix It |
| :--- | :--- | :--- | :--- |
| `CrashLoopBackOff` | The application process started inside the container but terminated with a non-zero exit code immediately (e.g. database connection refused, missing environment variable, or uncaught exception). Kubernetes continuously restarts it with an exponential backoff delay. | `kubectl logs -n foc <pod-name> --previous` | Inspect the fatal error stack trace in the logs. If it says `ECONNREFUSED 5432`, ensure the PostgreSQL pod is `Running` and migrations have executed. If a required secret is missing, verify `foc-secrets` in `01-configmaps-secrets.yaml`. |
| `ImagePullBackOff` / `ErrImagePull` | K3s cannot pull the specified container image from Amazon ECR. Either the image tag does not exist, the repository URL is mistyped, or the EC2 node lacks IAM permissions to authenticate with ECR. | `kubectl describe pod -n foc <pod-name>` | 1. Check the `Events` section at the bottom of `describe pod`.<br/>2. Verify the repository URI and tag exist in the AWS ECR console or via `aws ecr describe-images`.<br/>3. Verify the EC2 node's IAM instance profile includes `arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly`. |
| `Pending` | Kubernetes cannot find a node with enough unreserved CPU or RAM to place the pod, or a required PersistentVolumeClaim (PVC) cannot be bound. | `kubectl describe pod -n foc <pod-name>` | Check `Events`: If it says `0/2 nodes are available: 2 Insufficient memory`, your pod resource `requests` exceed node capacity. Either lower the `requests` in `04-stateless-services.yaml` or allow the Auto Scaling Group to launch an additional `t3.small` worker. If it mentions PVC binding, check `kubectl get pvc -n foc`. |
| `OOMKilled` (Exit Code 137) | The container attempted to consume more RAM than its configured `resources.limits.memory` cap, triggering the Linux kernel's Out-Of-Memory Killer. | `kubectl describe pod -n foc <pod-name>` | Look for `Last State: Terminated` with `Reason: OOMKilled`. Increase `resources.limits.memory` in the deployment YAML (e.g., from `256Mi` to `384Mi` or `512Mi`), or inspect your Node.js application for memory leaks. |
| `CreateContainerConfigError` | Kubernetes cannot create the container because a referenced `ConfigMap` or `Secret` key does not exist. | `kubectl describe pod -n foc <pod-name>` | Look at the error message for the missing key name. Ensure `01-configmaps-secrets.yaml` was applied before `03-stateful-data.yaml` and `04-stateless-services.yaml`. |
| `502 Bad Gateway` from ALB | The Application Load Balancer cannot reach the backend pods, or Traefik Ingress cannot reach the `api-gateway` service. | `kubectl get endpoints -n foc` | Verify that the target Kubernetes service has active `Endpoints` (healthy pods). If endpoints are empty (`<none>`), the service's `selector` labels do not match the pod's `labels`. |

#### Universal Triage Sequence
When debugging an unhealthy pod, always execute this three-step sequence:
```bash
# Step 1: Check pod status and restart counts
kubectl get pods -n foc -o wide

# Step 2: Read live or previous crash logs
kubectl logs -n foc <pod-name> --previous --tail=50

# Step 3: Inspect Kubernetes cluster events and failure reasons
kubectl describe pod -n foc <pod-name>
```

---

### 6.5 Preserving the Student Budget (Nightly Stop & Resume)

To preserve the S\$50 SGD student budget, you must stop cluster resources when you finish working.

> [!WARNING]
> **Critical ASG Behavior**: In an AWS Auto Scaling Group, if you directly execute `aws ec2 stop-instances` on worker instances, the Auto Scaling Group's health check will observe that the instances stopped responding, consider them **unhealthy**, terminate them, and immediately launch brand new instances!
> To properly pause an ASG worker tier, you must set its **desired capacity to 0**.

#### Nightly Stop (Cluster Pause):
```bash
# 1. Scale worker Auto Scaling Group to 0 instances (cleanly terminates worker VMs, halting compute charges)
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name $(cd infra/terraform && terraform output -raw worker_asg_name) \
  --desired-capacity 0

# 2. Stop Node 1 (persistent master/data node)
aws ec2 stop-instances --instance-ids \
  $(cd infra/terraform && terraform output -raw master_instance_id)
```
* While paused, you pay **\$0.00** for EC2 compute. You only pay pennies for idle EBS disk storage ($\approx$\$0.10/day).
* All database data, RabbitMQ messages, and configurations remain completely safe on the encrypted EBS volume.

#### Morning Resume (Cluster Wakeup):
```bash
# 1. Start Node 1 (persistent master/data node)
aws ec2 start-instances --instance-ids \
  $(cd infra/terraform && terraform output -raw master_instance_id)

# Wait ~45 seconds for Node 1 K3s control plane to initialize, then:

# 2. Restore worker ASG desired capacity to 1 instance (or 2 for high availability)
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name $(cd infra/terraform && terraform output -raw worker_asg_name) \
  --desired-capacity 1
```
Within 60–90 seconds, the worker instances boot up, automatically execute their bootstrap script, join the K3s cluster, register with the ALB, and K3s schedules all microservice pods across the pool!

---

### 6.6 Clean Teardown (`terraform destroy`)

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
