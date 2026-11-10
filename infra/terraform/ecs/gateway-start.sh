# AI Assistance Disclosure:
# Tool: Google Antigravity Agent; Codex (model: GPT-6), date: 2026-11-08 to 2026-11-09
# Scope: Resolve Service Connect aliases through the task hosts file before starting NGINX; updated across 3 AI-assisted revisions through D4 wrap-up (issue #253: Also substitute Service Connect host addresses in nginx `server <service>:<port>` upstream directives).
# Author review: I validated correctness, edited for style, and verified with automated tests.

for service in student-app admin-portal user-service supplier-service order-service credit-service notification-service chat-service; do
    address=$(awk -v service="$service" '
        $1 !~ /:/ {
            for (i = 2; i <= NF && $i !~ /^#/; i++) {
                if ($i == service) {
                    print $1
                    exit
                }
            }
        }
    ' /etc/hosts)
    test -n "$address"
    sed -i -e "s|http://$service:|http://$address:|g" -e "s|server $service:|server $address:|g" /etc/nginx/nginx.conf
done
exec nginx -g 'daemon off;'
