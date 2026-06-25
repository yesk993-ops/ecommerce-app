#!/bin/bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backup}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BUCKET:-ecommerce-backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

cleanup_old_backups() {
    log "Cleaning up backups older than ${RETENTION_DAYS} days..."
    find "${BACKUP_DIR}" -name "*.sql" -type f -mtime "+${RETENTION_DAYS}" -delete
    find "${BACKUP_DIR}" -name "*.tar.gz" -type f -mtime "+${RETENTION_DAYS}" -delete
    log "Cleanup complete"
}

backup_postgresql() {
    log "Starting PostgreSQL backup..."
    
    DB_HOST="${DB_HOST:-postgres}"
    DB_PORT="${DB_PORT:-5432}"
    DB_USER="${DB_USER:-ecommerce}"
    DB_NAME="${DB_NAME:-ecommerce}"
    
    PGPASSWORD="${DB_PASSWORD}" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --format=custom \
        --verbose \
        --file="${BACKUP_DIR}/ecommerce_${TIMESTAMP}.dump" 2>&1 | tee -a "$LOG_FILE"
    
    gzip "${BACKUP_DIR}/ecommerce_${TIMESTAMP}.dump"
    log "PostgreSQL backup completed: ecommerce_${TIMESTAMP}.dump.gz"
}

backup_redis() {
    log "Starting Redis backup..."
    REDIS_HOST="${REDIS_HOST:-redis}"
    REDIS_PASSWORD="${REDIS_PASSWORD:-redis_pass}"
    
    redis-cli -h "$REDIS_HOST" -a "$REDIS_PASSWORD" SAVE
    cp /data/dump.rdb "${BACKUP_DIR}/redis_${TIMESTAMP}.rdb"
    gzip "${BACKUP_DIR}/redis_${TIMESTAMP}.rdb"
    log "Redis backup completed: redis_${TIMESTAMP}.rdb.gz"
}

backup_kubernetes_resources() {
    log "Starting Kubernetes resources backup..."
    
    kubectl get all --all-namespaces -o yaml > "${BACKUP_DIR}/k8s_all_resources_${TIMESTAMP}.yaml"
    kubectl get configmap --all-namespaces -o yaml > "${BACKUP_DIR}/k8s_configmaps_${TIMESTAMP}.yaml"
    kubectl get secret --all-namespaces -o yaml > "${BACKUP_DIR}/k8s_secrets_${TIMESTAMP}.yaml"
    kubectl get pv --all-namespaces -o yaml > "${BACKUP_DIR}/k8s_pv_${TIMESTAMP}.yaml"
    kubectl get pvc --all-namespaces -o yaml > "${BACKUP_DIR}/k8s_pvc_${TIMESTAMP}.yaml"
    
    tar -czf "${BACKUP_DIR}/k8s_backup_${TIMESTAMP}.tar.gz" \
        "${BACKUP_DIR}/k8s_all_resources_${TIMESTAMP}.yaml" \
        "${BACKUP_DIR}/k8s_configmaps_${TIMESTAMP}.yaml" \
        "${BACKUP_DIR}/k8s_secrets_${TIMESTAMP}.yaml" \
        "${BACKUP_DIR}/k8s_pv_${TIMESTAMP}.yaml" \
        "${BACKUP_DIR}/k8s_pvc_${TIMESTAMP}.yaml"
    
    rm "${BACKUP_DIR}/k8s_all_resources_${TIMESTAMP}.yaml" \
       "${BACKUP_DIR}/k8s_configmaps_${TIMESTAMP}.yaml" \
       "${BACKUP_DIR}/k8s_secrets_${TIMESTAMP}.yaml" \
       "${BACKUP_DIR}/k8s_pv_${TIMESTAMP}.yaml" \
       "${BACKUP_DIR}/k8s_pvc_${TIMESTAMP}.yaml"
    
    log "Kubernetes resources backup completed"
}

upload_to_s3() {
    if command -v aws &> /dev/null && [ -n "$S3_BUCKET" ]; then
        log "Uploading backups to S3 bucket: ${S3_BUCKET}"
        aws s3 sync "${BACKUP_DIR}" "s3://${S3_BUCKET}/backups/$(date +%Y/%m/%d)/" --exclude "*.log"
        log "S3 upload completed"
    else
        log "AWS CLI not configured, skipping S3 upload"
    fi
}

verify_backup() {
    log "Verifying backup integrity..."
    local latest_dump=$(ls -t "${BACKUP_DIR}"/*.dump.gz 2>/dev/null | head -1)
    if [ -n "$latest_dump" ]; then
        gunzip -t "$latest_dump" && log "Backup integrity verified: ${latest_dump}" || log "Backup integrity check FAILED: ${latest_dump}"
    fi
}

main() {
    mkdir -p "${BACKUP_DIR}"
    log "=== Backup Started: ${TIMESTAMP} ==="
    
    backup_postgresql
    backup_redis
    backup_kubernetes_resources
    upload_to_s3
    verify_backup
    cleanup_old_backups
    
    log "=== Backup Completed Successfully ==="
}

main "$@"
