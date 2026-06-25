FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.26-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN mkdir -p /var/cache/nginx && chown -R appuser:appgroup /var/cache/nginx /usr/share/nginx/html /etc/nginx && \
    sed -i 's|^pid .*|pid /tmp/nginx.pid;|' /etc/nginx/nginx.conf
USER appuser
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
