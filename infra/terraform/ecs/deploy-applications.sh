#!/bin/bash
# AI Assistance Disclosure:
# Tool: Codex (model: GPT-6), date: 2026-11-09
# Scope: Run release migrations before rollout and preserve deployed images during infrastructure updates.
# Author review: <to be completed by the author>
#
# Tool: Codex (model: GPT-6), date: 2026-11-08
# Scope: Deploy digest-pinned application images using the latest Terraform task templates and verify each rollout.
# Author review: <to be completed by the author>

# AI-generated (edited by ngkhengyang)
set -euo pipefail
cluster=foc-ecs
account=$(aws sts get-caller-identity --query Account --output text)
registry="$account.dkr.ecr.ap-southeast-1.amazonaws.com"
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
mapfile -t services < <(jq -er '.[]' <<< "${SERVICES:?Set SERVICES to a JSON array of application names}")
test "${#services[@]}" -gt 0

# Check the whole selected release before updating its first service.
for service in "${services[@]}"; do
    aws ecs describe-services --cluster "$cluster" --services "$service" > "$work/service.json"
    jq -e '.failures | length == 0' "$work/service.json" >/dev/null
    jq -e '.services | length == 1 and (.[0].status == "ACTIVE" and .[0].desiredCount > 0)' "$work/service.json" >/dev/null
    aws ecs describe-task-definition --task-definition "$cluster-$service" > "$work/$service.json"
    jq -e --arg service "$service" '.taskDefinition.containerDefinitions | map(select(.name == $service)) | length == 1' "$work/$service.json" >/dev/null
    if [[ -n "${IMAGE_TAG:-}" ]]; then
        digest=$(aws ecr describe-images --repository-name "foc/$service" --image-ids "imageTag=$IMAGE_TAG" --query 'imageDetails[0].imageDigest' --output text)
        [[ "$digest" =~ ^sha256:[a-f0-9]{64}$ ]]
        image="$registry/foc/$service@$digest"
    else
        current=$(jq -er '.services[0].taskDefinition' "$work/service.json")
        aws ecs describe-task-definition --task-definition "$current" > "$work/current.json"
        image=$(jq -er --arg service "$service" '.taskDefinition.containerDefinitions[] | select(.name == $service) | .image' "$work/current.json")
    fi
    jq --arg service "$service" --arg image "$image" '
      .taskDefinition
      | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy, .deregisteredAt)
      | (.containerDefinitions[] | select(.name == $service) | .image) = $image
    ' "$work/$service.json" > "$work/$service-register.json"

    if [[ -n "${IMAGE_TAG:-}" && "$service" == *-service ]]; then
        aws ecs describe-task-definition --task-definition "$cluster-migrate-${service%-service}" > "$work/migrate.json"
        jq -e '.taskDefinition.containerDefinitions | map(select(.name == "migrate")) | length == 1' "$work/migrate.json" >/dev/null
        jq --arg image "$image" '
          .taskDefinition
          | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy, .deregisteredAt)
          | (.containerDefinitions[] | select(.name == "migrate") | .image) = $image
          | (.containerDefinitions[] | select(.name == "migrate") | .command) = ["migrate"]
        ' "$work/migrate.json" > "$work/$service-migrate-register.json"
    fi
done

# Apply every selected schema migration before replacing application tasks.
for service in "${services[@]}"; do
    if [[ ! -f "$work/$service-migrate-register.json" ]]; then
        continue
    fi
    migration=$(aws ecs register-task-definition --cli-input-json "file://$work/$service-migrate-register.json" --query 'taskDefinition.taskDefinitionArn' --output text)
    aws ecs run-task --cluster "$cluster" --launch-type EC2 --count 1 --task-definition "$migration" > "$work/migration-run.json"
    jq -e '(.failures | length == 0) and (.tasks | length == 1)' "$work/migration-run.json" >/dev/null
    task=$(jq -er '.tasks[0].taskArn' "$work/migration-run.json")
    aws ecs wait tasks-stopped --cluster "$cluster" --tasks "$task"
    aws ecs describe-tasks --cluster "$cluster" --tasks "$task" > "$work/migration-result.json"
    jq -e '
      (.failures | length == 0) and (.tasks | length == 1) and
      (.tasks[0] | .lastStatus == "STOPPED" and
        (.containers | map(select(.name == "migrate")) | length == 1 and .[0].exitCode == 0))
    ' "$work/migration-result.json" >/dev/null
    printf '%s migrations completed as %s\n' "$service" "$task" >> "$GITHUB_STEP_SUMMARY"
done

for service in "${services[@]}"; do
    revision=$(aws ecs register-task-definition --cli-input-json "file://$work/$service-register.json" --query 'taskDefinition.taskDefinitionArn' --output text)
    aws ecs update-service --cluster "$cluster" --service "$service" --task-definition "$revision" --query 'service.serviceName' --output text
    aws ecs wait services-stable --cluster "$cluster" --services "$service"
    aws ecs describe-services --cluster "$cluster" --services "$service" > "$work/service.json"
    jq -e --arg revision "$revision" '
      (.failures | length == 0) and
      (.services[0] | .taskDefinition == $revision and .desiredCount > 0 and .runningCount == .desiredCount and
        (.deployments | length == 1 and .[0].rolloutState == "COMPLETED"))
    ' "$work/service.json" >/dev/null
    printf '%s deployed as %s\n' "$service" "$revision" >> "$GITHUB_STEP_SUMMARY"
done
