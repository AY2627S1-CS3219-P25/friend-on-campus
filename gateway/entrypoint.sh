#!/bin/sh
set -e

# Dynamically align NGINX DNS resolver with container's /etc/resolv.conf nameserver
# (Supports Kubernetes CoreDNS, Docker Compose, AWS VPC DNS automatically)
if [ -w /etc/nginx/nginx.conf ]; then
    NAMESERVER=$(awk '/nameserver/ {print $2; exit}' /etc/resolv.conf)
    if [ -n "$NAMESERVER" ]; then
        sed -i "s/^[[:space:]]*resolver [0-9.]*/    resolver $NAMESERVER/" /etc/nginx/nginx.conf 2>/dev/null || true
    fi
fi
