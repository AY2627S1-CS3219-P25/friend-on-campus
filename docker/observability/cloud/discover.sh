#!/bin/sh
# AI Assistance Disclosure:
# Tool: Codex (model: GPT-6), date: 2026-11-09
# Scope: Discover ECS bridge host ports for Prometheus without credentials in output files.
# Author review: <to be completed by yanhwee>
# AI-generated (edited by yanhwee)
set -eu
export AWS_DEFAULT_REGION=ap-southeast-1
mkdir -p /config/discovery
while :; do
  if aws ecs list-tasks --cluster "$OBS_CLUSTER" --desired-status RUNNING > /tmp/task-list.json; then
    tasks=$(jq -r '.taskArns[]' /tmp/task-list.json)
    if [ -n "$tasks" ]; then
      # This project has fewer than 100 tasks. Reject unexpected scale rather than silently truncate targets.
      count=$(jq '.taskArns | length' /tmp/task-list.json)
      if [ "$count" -le 100 ] && aws ecs describe-tasks --cluster "$OBS_CLUSTER" --tasks $tasks > /tmp/tasks.json; then
        instances=$(jq -r '[.tasks[].containerInstanceArn | select(. != null)] | unique[]' /tmp/tasks.json)
        if [ -n "$instances" ] && aws ecs describe-container-instances --cluster "$OBS_CLUSTER" --container-instances $instances > /tmp/container-instances.json; then
          ids=$(jq -r '.containerInstances[].ec2InstanceId' /tmp/container-instances.json)
          if aws ec2 describe-instances --instance-ids $ids > /tmp/instances.json; then
            jq --slurpfile ci /tmp/container-instances.json --slurpfile ec2 /tmp/instances.json '
              ($ec2[0].Reservations | map(.Instances[]) | map({key: .InstanceId, value: .PrivateIpAddress}) | from_entries) as $ips |
              ($ci[0].containerInstances | map({key: .containerInstanceArn, value: $ips[.ec2InstanceId]}) | from_entries) as $hosts |
              [.tasks[] as $task | $task.containers[] | .networkBindings[]? | select(.containerPort == 9404) |
               {targets: [($hosts[$task.containerInstanceArn] + ":" + (.hostPort|tostring))], labels: {connector: ($task.group|ltrimstr("service:cdc-"))}}]
            ' /tmp/tasks.json > /config/discovery/debezium.json.tmp && mv /config/discovery/debezium.json.tmp /config/discovery/debezium.json
            jq --slurpfile ci /tmp/container-instances.json --slurpfile ec2 /tmp/instances.json '
              ($ec2[0].Reservations | map(.Instances[]) | map({key: .InstanceId, value: .PrivateIpAddress}) | from_entries) as $ips |
              ($ci[0].containerInstances | map({key: .containerInstanceArn, value: $ips[.ec2InstanceId]}) | from_entries) as $hosts |
              [.tasks[] as $task | $task.containers[] | .networkBindings[]? | select((.containerPort >= 8001 and .containerPort <= 8006) or .containerPort == 80) |
               {targets: [("http://" + $hosts[$task.containerInstanceArn] + ":" + (.hostPort|tostring) + (if .containerPort == 80 then "/health" else "/ready" end))], labels: {service: ($task.group|ltrimstr("service:"))}}]
            ' /tmp/tasks.json > /config/discovery/readiness.json.tmp && mv /config/discovery/readiness.json.tmp /config/discovery/readiness.json
          fi
        fi
      fi
    fi
  fi
  [ "${OBS_DISCOVERY_ONCE:-false}" != true ] || break
  sleep 30
done
