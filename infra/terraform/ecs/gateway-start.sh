# AI Assistance Disclosure:
# Tool: Codex (model: GPT-6), date: 2026-11-09
# Scope: Activate optional private telemetry ingestion and structured gateway logs.
# Author review: <to be completed by yanhwee>
#
# Tool: Codex (model: GPT-6), date: 2026-11-08
# Scope: Resolve Service Connect aliases through the task hosts file before starting NGINX.
# Author review: <to be completed by the author>

# AI-generated (edited by ngkhengyang)
for service in student-app admin-portal user-service supplier-service order-service credit-service notification-service chat-service; do
    address=$(getent hosts "$service" | awk 'NR == 1 { print $1 }')
    test -n "$address"
    sed -i "s|http://$service:|http://$address:|g" /etc/nginx/nginx.conf
done
if [ "${OBSERVABILITY_ENABLED:-false}" = true ]; then
    mkdir -p /etc/nginx/observability
    cp -R /opt/observability/nginx/* /etc/nginx/observability/
    sed -i "s|http://otel-collector:4318|http://$OBS_BACKEND_HOST:4318|g" /etc/nginx/observability/server/observability.conf
    # Host DNS must resolve the private Route53 backend; Docker's embedded resolver is local-only.
    sed -i 's|resolver 127.0.0.11 valid=10s ipv6=off;|resolver 169.254.169.253 valid=10s ipv6=off;|' /etc/nginx/nginx.conf
fi
exec nginx -g 'daemon off;'
