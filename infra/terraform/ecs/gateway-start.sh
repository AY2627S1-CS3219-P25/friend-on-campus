# AI Assistance Disclosure:
# Tool: Codex (model: GPT-6), date: 2026-11-08
# Scope: Resolve Service Connect aliases through the task hosts file before starting NGINX.
# Author review: <to be completed by the author>

# AI-generated (edited by ngkhengyang)
for service in student-app admin-portal user-service supplier-service order-service credit-service notification-service chat-service; do
    address=$(getent hosts "$service" | awk 'NR == 1 { print $1 }')
    test -n "$address"
    sed -i "s|http://$service:|http://$address:|g" /etc/nginx/nginx.conf
done
exec nginx -g 'daemon off;'
