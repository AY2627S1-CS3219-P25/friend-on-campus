---
name: cloud-access
description: Use when the author asks to check, inspect, debug, or run something on the AWS deployment (the k3s cluster on EC2, the ALB, ECR, SSM), or when any aws command fails with an expired SSO token, "Unable to locate credentials", or "Missing the following required SSO configuration values".
---
<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-07
Scope: Wrote this skill from the SSO/SSM access path worked out in-session (static keys replaced by an SSO profile, device-code login, Run Command instead of interactive sessions) and from infra/terraform, infra/k8s/README.md and docs/cloud-deployment-and-devops-guide.md section 6.
Author review: <to be completed by Reallyeasy1>
-->

# cloud-access

The agent reaches AWS only through the AWS CLI in its shell. No plugin or MCP server is needed; `deploy-on-aws` and `aws-serverless` are on the forbidden list in `.claude/PLUGINS.md`.

Fixed facts. Verify with step 1 and never hardcode instance IDs: workers are replaced by the Auto Scaling Group.

| What | Value |
|---|---|
| Profile | `891498120071_nusisb_IsbUsersPS` (SSO session `nusisb`; the role has AdministratorAccess) |
| Region | `ap-southeast-1` |
| Master node tag | `Name=foc-production-k3s-master` (control plane plus Postgres/RabbitMQ data) |
| Worker ASG | `foc-production-k3s-worker-asg` |
| Kubernetes namespace | `foc` |
| Public entry | ALB `foc-production-alb`, HTTP only; URL from `terraform output alb_url` |

## 1. Check credentials first

```bash
aws sts get-caller-identity --profile 891498120071_nusisb_IsbUsersPS
```

If it fails with an expired or missing SSO token, refresh in the background and hand the author the link and code it prints:

```bash
# Bash tool with run_in_background: true; <scratchpad> is the session scratchpad path from the environment block
aws sso login --profile 891498120071_nusisb_IsbUsersPS --use-device-code > "<scratchpad>/sso-login.log" 2>&1
cat "<scratchpad>/sso-login.log"   # URL plus a code like ABCD-WXYZ; the author approves it in Chrome
```

Wait for the background task to finish, then re-run step 1. The device-code flow stays valid for about ten minutes. Do not use the plain `--no-browser` flow: it relies on a local-port callback and expired before approval in testing.

The agent's shell has no TTY. Never run `aws configure sso`, `aws configure`, or any other prompting command, and do not try `Start-Process` to open a window (it starts hidden). If the profile itself is broken, write it non-interactively with `aws configure set <key> <value> --profile ...` or append to `~/.aws/config`. The working layout is `[sso-session nusisb]` with `sso_start_url = https://nus-aws-cloud.awsapps.com/start` and `sso_region = ap-southeast-1`, plus `[profile 891498120071_nusisb_IsbUsersPS]` with `sso_session`, `sso_account_id`, `sso_role_name = nusisb_IsbUsersPS`, `region`. A static key block under the same profile name in `~/.aws/credentials` shadows the SSO profile; remove it (back the file up first).

## 2. Run commands on a node

Port 22 is closed and the Session Manager plugin is not installed locally, so `ssh` and `aws ssm start-session` do not work from the agent's shell. Use SSM Run Command, which needs neither:

```bash
bash .claude/skills/cloud-access/ssm-run.sh "k3s kubectl get nodes -o wide"
bash .claude/skills/cloud-access/ssm-run.sh "k3s kubectl get pods -n foc -o wide"
bash .claude/skills/cloud-access/ssm-run.sh "k3s kubectl logs deploy/order-service -n foc --tail=100"
bash .claude/skills/cloud-access/ssm-run.sh -i i-0123456789abcdef0 "sudo journalctl -u k3s-agent --no-pager -n 50"
```

The script looks the master up by tag, sends the command, waits, and prints status, stdout and stderr. On the master, `kubectl` is `k3s kubectl` and the kubeconfig is `/etc/rancher/k3s/k3s.yaml`. Worker instance IDs come from the `describe-instances` query below or from `aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names foc-production-k3s-worker-asg`.

"Node is healthy" means all three agree: EC2 state `running`, SSM ping `Online`, and `k3s kubectl get nodes` showing `Ready`.

Read-only account queries need no wrapper:

```bash
aws ec2 describe-instances --profile 891498120071_nusisb_IsbUsersPS --region ap-southeast-1 \
  --filters Name=tag:Name,Values='foc-production-*' \
  --query 'Reservations[].Instances[].{Id:InstanceId,Name:Tags[?Key==`Name`]|[0].Value,State:State.Name,Ip:PublicIpAddress}' --output table
aws ssm describe-instance-information --profile 891498120071_nusisb_IsbUsersPS --region ap-southeast-1 \
  --query 'InstanceInformationList[].{Id:InstanceId,Ping:PingStatus}' --output table
```

## 3. What needs the author's explicit go-ahead in that prompt

Anything that changes cloud state: `kubectl apply`, `set image`, `delete`, `scale`, `rollout restart`, patching secrets, `aws autoscaling set-desired-capacity`, `aws ec2 stop-instances`, `start-instances`, `terminate-instances`, `terraform apply`, `terraform destroy`, ECR pushes. Code deploys normally happen through `.github/workflows/deploy.yml` on merge to `main`, not by hand. The session permission gate may also block read commands against production. When it does, give the exact command to the author to run with the `!` prefix instead of working around it.

## 4. Where the detail lives

- Runbook (triage, nightly stop and resume, secrets, teardown): `docs/cloud-deployment-and-devops-guide.md` section 6. Its `start-session` examples are for a human terminal with the plugin installed.
- Terraform outputs and helper commands: `infra/terraform/outputs.tf`.
- Manifests and the day-1/day-2 apply flow: `infra/k8s/README.md`.
- Deploy pipeline (OIDC role, ECR, SSM rollout): `.github/workflows/deploy.yml`.

## Common mistakes

| Symptom | Cause and fix |
|---|---|
| `Missing the following required SSO configuration values` on `aws sso login` | Profile exists only as static keys in `~/.aws/credentials`; see step 1 |
| `stdin is not a tty` or `Found xterm-256color, while expecting a Windows console` | Interactive command in the agent shell or via `!`; use the non-interactive form |
| `SessionManagerPlugin is not found` | Expected; use `ssm-run.sh` (Run Command) |
| `taskkill /PID` becomes `C:/Program Files/Git/PID` | Git Bash path conversion; write `//PID` |
| Instance ID from an old note is gone | Workers are ASG-managed; look up by tag or ASG name |

Log the prompt in `ai/usage-log.md` as usual. Edits to `~/.aws/*` are outside the repo and go in the entry text, not under files changed.
