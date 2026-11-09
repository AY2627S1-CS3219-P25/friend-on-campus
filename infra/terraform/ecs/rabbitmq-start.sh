#!/bin/sh
# AI Assistance Disclosure:
# Tool: Codex (model: GPT-6), date: 2026-11-08
# Scope: Configure cluster discovery and import generated RabbitMQ credentials.
# Author review: <to be completed by the author>

# AI-generated (edited by ngkhengyang)
set -eu
umask 077
printf '%s' "$BROKER_COOKIE" >/var/lib/rabbitmq/.erlang.cookie
chown rabbitmq:rabbitmq /var/lib/rabbitmq/.erlang.cookie
chmod 400 /var/lib/rabbitmq/.erlang.cookie
printf '%s' "$BROKER_DEFINITIONS" >/etc/rabbitmq/ecs-definitions.json
chown rabbitmq:rabbitmq /etc/rabbitmq/ecs-definitions.json
unset BROKER_COOKIE BROKER_DEFINITIONS

if [ "$BROKER_SLOT" != 1 ] && [ ! -f "/var/lib/rabbitmq/mnesia/$RABBITMQ_NODENAME/schema.DAT" ]; then
    for attempt in $(seq 1 90); do
        nc -z -w 2 "broker-1.$BROKER_ZONE" 5672 && break
        sleep 2
    done
    nc -z -w 2 "broker-1.$BROKER_ZONE" 5672
fi

cat >/etc/rabbitmq/rabbitmq.conf <<EOF
cluster_formation.peer_discovery_backend = classic_config
cluster_formation.classic_config.nodes.1 = rabbit@broker-1.$BROKER_ZONE
cluster_formation.classic_config.nodes.2 = rabbit@broker-2.$BROKER_ZONE
cluster_formation.classic_config.nodes.3 = rabbit@broker-3.$BROKER_ZONE
definitions.import_backend = local_filesystem
definitions.local.path = /etc/rabbitmq/ecs-definitions.json
definitions.skip_if_unchanged = true
vm_memory_high_watermark.absolute = 1200MiB
EOF
chmod 644 /etc/rabbitmq/rabbitmq.conf
exec /usr/local/bin/docker-entrypoint.sh rabbitmq-server
