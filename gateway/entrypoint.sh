#!/bin/sh
set -e

# Dynamically align NGINX DNS resolver and service upstreams with container's /etc/resolv.conf
# (Supports Kubernetes CoreDNS search domains, Docker Compose, AWS VPC DNS automatically)
if [ -w /etc/nginx/nginx.conf ]; then
    NAMESERVER=$(awk '/nameserver/ {print $2; exit}' /etc/resolv.conf)
    if [ -n "$NAMESERVER" ]; then
        sed -i "s/^[[:space:]]*resolver [0-9.]*/    resolver $NAMESERVER/" /etc/nginx/nginx.conf 2>/dev/null || true
    fi

    SEARCH_DOMAIN=$(awk '/search/ {print $2; exit}' /etc/resolv.conf)
    if [ -n "$SEARCH_DOMAIN" ]; then
        # Append K8s search domain (e.g. foc.svc.cluster.local) so Nginx resolver resolves unqualified names
        sed -i "s/:5173/.$SEARCH_DOMAIN:5173/g" /etc/nginx/nginx.conf 2>/dev/null || true
        sed -i "s/:5174/.$SEARCH_DOMAIN:5174/g" /etc/nginx/nginx.conf 2>/dev/null || true
        sed -i "s/:800/.$SEARCH_DOMAIN:800/g" /etc/nginx/nginx.conf 2>/dev/null || true
    fi
fi
