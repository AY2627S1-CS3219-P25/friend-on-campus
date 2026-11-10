# AI Assistance Disclosure:
# Tool: Google Antigravity Agent, date: 2026-11-09
# Scope: Issue #253: Also substitute Service Connect host addresses in nginx `server <service>:<port>` upstream directives.
# Author review: I validated correctness, edited for style, and verified with automated tests.
#
# Tool: Codex (model: GPT-6), date: 2026-11-09
# Scope: Select IPv4 Service Connect hosts entries for the IPv4 bridge network.
# Author review: <to be completed by the author>
#
# Tool: Codex (model: GPT-6), date: 2026-11-08
# Scope: Resolve Service Connect aliases through the task hosts file before starting NGINX.
# Author review: <to be completed by the author>

# AI-generated (edited by ngkhengyang)
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
