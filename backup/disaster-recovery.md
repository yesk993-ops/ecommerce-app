# Disaster Recovery Strategy

## RPO and RTO Targets

| Tier     | RPO (Recovery Point) | RTO (Recovery Time) |
|----------|---------------------|---------------------|
| Critical | < 15 minutes        | < 1 hour            |
| High     | < 1 hour            | < 4 hours           |
| Medium   | < 24 hours          | < 24 hours          |

## Backup Schedule

| Component       | Frequency      | Retention     | Method                    |
|-----------------|----------------|---------------|---------------------------|
| PostgreSQL      | Every 6 hours  | 30 days       | pg_dump custom format     |
| PostgreSQL WAL  | Continuous     | 7 days        | WAL archiving to S3       |
| Redis           | Every hour     | 7 days        | RDB snapshots             |
| Kubernetes      | Daily          | 90 days       | kubectl get all -o yaml   |
| Persistent Vol  | Daily          | 30 days       | Velero backups            |
| Docker Images   | Per build      | 90 days       | Registry retention policy |
| IaC State       | Per change     | Indefinite    | Terraform state in S3     |

## Recovery Procedures

### Database Recovery

```bash
# Full restore
pg_restore -U ecommerce -d ecommerce --clean --if-exists ecommerce_backup.dump

# Point-in-time recovery
pg_restore -U ecommerce -d ecommerce --clean --if-exists \
  --target-time "2024-06-24 14:30:00" ecommerce_backup.dump
```

### Full Cluster Recovery

```bash
# 1. Restore IaC
cd infra/terraform/environments/prod
terraform init
terraform apply

# 2. Install K3s
ansible-playbook -i infra/ansible/inventory/hosts.yml infra/ansible/playbooks/site.yml

# 3. Deploy ArgoCD
kubectl apply -f deploy/argocd/applications/

# 4. ArgoCD auto-syncs all applications

# 5. Restore database
gunzip -c backup/ecommerce_latest.dump.gz | docker exec -i ecommerce-postgres psql -U ecommerce ecommerce
```

## Disaster Scenarios

### Scenario 1: Pod/Node Failure
- **Impact**: Service degradation for a single service
- **Response**: Kubernetes auto-restarts; HPA scales new pods
- **RTO**: < 2 minutes (automatic)

### Scenario 2: Database Corruption
- **Impact**: Data loss, services unable to operate
- **Response**:
  1. Stop all services
  2. Restore from latest backup
  3. Apply WAL for point-in-time
  4. Verify data integrity
  5. Resume services
- **RTO**: < 1 hour

### Scenario 3: Full Region Outage
- **Impact**: Complete platform unavailability
- **Response**:
  1. Activate DR region
  2. Restore Terraform state
  3. Provision infrastructure
  4. Restore database from S3 cross-region backup
  5. Deploy applications via ArgoCD
  6. Update DNS failover
- **RTO**: < 4 hours
- **RPO**: < 15 minutes

### Scenario 4: Security Breach
- **Impact**: Compromised credentials or data
- **Response**:
  1. Rotate all secrets in Vault
  2. Revoke compromised certificates
  3. Restore from pre-breach backup
  4. Audit logs in ELK
  5. Run security scans
  6. Patch vulnerabilities

## Testing

- Monthly: Automated restore test to staging
- Quarterly: Full DR drill
- Annual: Tabletop exercise with team

## Tools

- **Velero**: Kubernetes backup/restore
- **pg_dump/pg_restore**: PostgreSQL
- **Rclone/S3**: Offsite storage
- **Ansible**: Automated recovery playbooks
