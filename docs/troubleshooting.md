# Common Production Issues & Troubleshooting

## 1. Pod CrashLoopBackOff

**Symptoms**: Pod restarting repeatedly, `CrashLoopBackOff` status

**Diagnostics**:
```bash
kubectl describe pod <pod-name> -n ecommerce
kubectl logs <pod-name> -n ecommerce --previous
kubectl exec -it <pod-name> -n ecommerce -- sh
```

**Common Causes**:
- Missing environment variables or secrets
- Database connection refused
- Port already in use
- OOMKilled (memory limit exceeded)

**Resolution**:
1. Check `ConfigMap` and `Secret` bindings
2. Verify database is running: `kubectl exec -it postgres -- pg_isready`
3. Increase resource limits if OOM
4. Check readiness probe endpoint

## 2. Database Connection Pool Exhaustion

**Symptoms**: Slow queries, timeouts, error 500s from services

**Diagnostics**:
```bash
kubectl exec -it postgres -- psql -U ecommerce -c "SELECT count(*) FROM pg_stat_activity;"
kubectl exec -it postgres -- psql -U ecommerce -c "SELECT state, count(*) FROM pg_stat_activity GROUP BY state;"
```

**Resolution**:
1. Increase `max` pool size in service config
2. Add connection pooling with PgBouncer
3. Check for slow queries: `pg_stat_statements`
4. Scale service replicas horizontally

## 3. Kafka Consumer Lag

**Symptoms**: Delayed order processing, inventory sync issues

**Diagnostics**:
```bash
kubectl exec -it kafka -- kafka-consumer-groups --bootstrap-server localhost:9092 --group <group> --describe
```

**Resolution**:
1. Increase consumer concurrency (more partitions)
2. Scale notification service replicas
3. Check for failing consumers in logs
4. Increase `max.poll.records` configuration

## 4. Redis Memory Pressure

**Symptoms**: Cache misses increase, `OOM command not allowed` errors

**Diagnostics**:
```bash
kubectl exec -it redis -- redis-cli INFO memory
kubectl exec -it redis -- redis-cli -a $REDIS_PASSWORD MEMORY STATS
```

**Resolution**:
1. Reduce TTL on cached items
2. Configure `maxmemory-policy allkeys-lru`
3. Scale up Redis instance size
4. Add Redis cluster for sharding

## 5. API Gateway 502 Errors

**Symptoms**: Browser shows 502 Bad Gateway

**Diagnostics**:
```bash
kubectl logs -l app=api-gateway --tail=100
kubectl get endpoints -n ecommerce
```

**Common Causes**:
- Backend service not ready (readiness probe failing)
- Network policy blocking traffic
- Service DNS resolution failure
- NGINX worker connections exhausted

**Resolution**:
1. Check backend service endpoints are populated
2. Verify network policies allow ingress traffic
3. Restart NGINX: `kubectl rollout restart deployment api-gateway`
4. Increase `worker_connections` in nginx.conf

## 6. Disk Space Full

**Symptoms**: Pods stuck in `ContainerCreating`, logs not writing

**Diagnostics**:
```bash
kubectl top node
df -h /var/lib/docker
docker system df
```

**Resolution**:
1. Clean old Docker images: `docker image prune -a`
2. Clear unused volumes: `docker volume prune`
3. Configure log rotation in Docker daemon
4. Add persistent volume with larger size
5. Set up automated cleanup CronJob

## 7. JWT Token Expired

**Symptoms**: Users redirected to login, API returns 401

**Diagnostics**:
```bash
# Decode JWT to check expiry
echo <token> | cut -d. -f2 | base64 -d
```

**Resolution**:
1. Check `JWT_SECRET` matches across services
2. Verify client refresh token logic works
3. Increase access token expiry (currently 15min)
4. Check Redis session store is populated

## 8. ArgoCD Sync Failure

**Symptoms**: Application out of sync, sync stuck

**Diagnostics**:
```bash
argocd app get ecommerce-services
argocd app logs ecommerce-services
kubectl get events -n argocd --sort-by='.lastTimestamp'
```

**Resolution**:
1. Force refresh: `argocd app sync ecommerce-services --force`
2. Check Git repository access
3. Verify manifests are valid: `kustomize build .`
4. Delete stuck resources: `argocd app terminate-op`

## 9. Monitoring Stack Issues

### Prometheus Not Scraping

```bash
kubectl port-forward svc/prometheus 9090:9090 -n monitoring
# Check targets at http://localhost:9090/targets
```

### Grafana "No Data"

1. Verify Prometheus datasource URL
2. Check metric names match dashboard queries
3. Ensure time range is correct

### Elasticsearch Yellow Status

```bash
curl http://elasticsearch:9200/_cluster/health
curl http://elasticsearch:9200/_cat/shards
```

## 10. Performance Checklist

```bash
# Check CPU/memory usage
kubectl top pods -n ecommerce
kubectl top nodes

# Check network performance
kubectl run -it --rm debug --image=nicolaka/netshoot -- /bin/bash
# Inside: curl -o /dev/null -s -w "Time: %{time_total}s\n" http://auth-service:4001/health

# Database query performance
kubectl exec -it postgres -- psql -U ecommerce -c "SELECT query, calls, total_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"

# Redis performance
kubectl exec -it redis -- redis-cli INFO stats | grep hits
