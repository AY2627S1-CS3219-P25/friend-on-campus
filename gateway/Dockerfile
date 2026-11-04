FROM nginx:1.31.7-alpine3.24@sha256:42c36dfd0b3503b7966771550a91521262b4750665929821abf5069715610e20

COPY gateway/nginx.conf /etc/nginx/nginx.conf
COPY gateway/entrypoint.sh /docker-entrypoint.d/40-dns-resolver.sh
COPY data/images /usr/share/nginx/html/images

RUN chmod +x /docker-entrypoint.d/40-dns-resolver.sh

EXPOSE 80
