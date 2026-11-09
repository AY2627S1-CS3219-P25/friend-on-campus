#!/bin/bash
# AI Assistance Disclosure:
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
mapfile -t services < <(jq -er '.[]' <<< "$SERVICES")
test "${#services[@]}" -gt 0

# Check the whole selected release before updating its first service.
for service in "${services[@]}"; do
    aws ecs describe-services --cluster "$cluster" --services "$service" > "$work/service.json"
    jq -e '.failures | length == 0' "$work/service.json" >/dev/null
    jq -e '.services | length == 1 and (.[0].status == "ACTIVE" and .[0].desiredCount > 0)' "$work/service.json" >/dev/null
    aws ecs describe-task-definition --task-definition "$cluster-$service" > "$work/$service.json"
    jq -e --arg service "$service" '.taskDefinition.containerDefinitions | map(select(.name == $service)) | length == 1' "$work/$service.json" >/dev/null
    digest=$(aws ecr describe-images --repository-name "foc/$service" --image-ids "imageTag=$IMAGE_TAG" --query 'imageDetails[0].imageDigest' --output text)
    [[ "$digest" =~ ^sha256:[a-f0-9]{64}$ ]]
    jq --arg service "$service" --arg image "$registry/foc/$service@$digest" '
      .taskDefinition
      | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy, .deregisteredAt)
      | (.containerDefinitions[] | select(.name == $service) | .image) = $image
    ' "$work/$service.json" > "$work/$service-register.json"
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
