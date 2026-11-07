#!/usr/bin/env bash
# AI Assistance Disclosure:
# Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-07
# Scope: Wrote this helper. It runs one shell command on a cluster node via SSM Run Command (no TTY and no Session Manager plugin needed).
# Author review: <to be completed by Reallyeasy1>
#
# AI-generated (edited by <name>)
# Usage: bash .claude/skills/cloud-access/ssm-run.sh [-i <instance-id>] "<shell command>"
# Default target: the running instance tagged Name=foc-production-k3s-master.
set -euo pipefail
PROFILE=891498120071_nusisb_IsbUsersPS
REGION=ap-southeast-1
AWS="aws --profile $PROFILE --region $REGION"

TARGET=""
if [ "${1:-}" = "-i" ]; then TARGET="$2"; shift 2; fi
[ $# -eq 1 ] || { echo "usage: $0 [-i <instance-id>] \"<command>\"" >&2; exit 2; }

if [ -z "$TARGET" ]; then
  TARGET=$($AWS ec2 describe-instances \
    --filters Name=tag:Name,Values=foc-production-k3s-master Name=instance-state-name,Values=running \
    --query 'Reservations[0].Instances[0].InstanceId' --output text)
  [ "$TARGET" != "None" ] || { echo "master instance not found or not running" >&2; exit 1; }
fi

# JSON-encode the command so quotes and backslashes survive; node is always present in this repo.
PARAMS=$(node -e 'process.stdout.write(JSON.stringify({commands:[process.argv[1]]}))' -- "$1")

CMD_ID=$($AWS ssm send-command --instance-ids "$TARGET" --document-name AWS-RunShellScript \
  --comment "cloud-access skill" --parameters "$PARAMS" --query 'Command.CommandId' --output text)
echo "target=$TARGET command=$CMD_ID" >&2

# ponytail: `wait` polls every 5s for up to ~10 min; run longer jobs detached on the node (nohup) and poll their log.
$AWS ssm wait command-executed --command-id "$CMD_ID" --instance-id "$TARGET" || true
$AWS ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$TARGET" --output json \
  | node -e 'const r=JSON.parse(require("fs").readFileSync(0,"utf8")); console.log("status: "+r.Status); process.stdout.write(r.StandardOutputContent||""); if(r.StandardErrorContent){console.error("--- stderr ---"); process.stderr.write(r.StandardErrorContent);} process.exitCode = r.Status==="Success"?0:1;'
