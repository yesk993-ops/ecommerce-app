FROM nginx:1.26-alpine

RUN apk add --no-cache curl

RUN addgroup -S nginxgroup && adduser -S nginxuser -G nginxgroup

COPY nginx.conf /etc/nginx/nginx.conf

RUN chown -R nginxuser:nginxgroup /etc/nginx /var/log/nginx /var/cache/nginx

USER nginxuser

EXPOSE 80
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=3 \
  CMD curl --fail http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
