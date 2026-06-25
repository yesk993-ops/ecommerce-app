#!/bin/bash
# ==============================================================================
# Deployment Verification Script
# Checks that ArgoCD has synced the latest changes to Kubernetes.
# Called after gitops-updater.sh pushes changes to the manifests repo.
# ==============================================================================

set -euo pipefail

ARGOCD_SERVER="${ARGOCD_SERVER:-argocd-server.argocd.svc.cluster.local:443}"
ARGOCD_USERNAME="${ARGOCD_USERNAME:-admin}"
ARGOCD_PASSWORD="${ARGOCD_PASSWORD:-}"
IMAGE_TAG="${1:-latest}"
MAX_RETRIES="${MAX_RETRIES:-12}"
RETRY_INTERVAL="${RETRY_INTERVAL:-10}"

echo "=========================================="
echo " Deployment Verification"
echo "=========================================="
echo " Image Tag:     ${IMAGE_TAG}"
echo " Max Retries:   ${MAX_RETRIES}"
echo " Retry Interval: ${RETRY_INTERVAL}s"
echo "=========================================="

# -------------------------------------------------------------------
# Check if argocd CLI is available
# -------------------------------------------------------------------
if ! command -v argocd &>/dev/null; then
    echo "WARNING: argocd CLI not found. Skipping verification."
    echo "Manual verification:"
    echo "  argocd login <server>"
    echo "  argocd app list"
    echo "  argocd app get ecommerce-services"
    exit 0
fi

# -------------------------------------------------------------------
# Login to ArgoCD
# -------------------------------------------------------------------
login() {
    if [ -n "$ARGOCD_PASSWORD" ]; then
        argocd login "$ARGOCD_SERVER" \
            --username "$ARGOCD_USERNAME" \
            --password "$ARGOCD_PASSWORD" \
            --insecure --grpc-web 2>/dev/null
    else
        # Try core (in-cluster) mode
        argocd login --core 2>/dev/null || true
    fi
}

# -------------------------------------------------------------------
# Check sync status of an application
# -------------------------------------------------------------------
check_app_sync() {
    local app_name="$1"
    local status

    status=$(argocd app get "$app_name" -o json 2>/dev/null | \
        python3 -c "
import sys,json
try:
    d = json.load(sys.stdin)
    sync = d.get('status',{}).get('sync',{}).get('status','unknown')
    health = d.get('status',{}).get('health',{}).get('status','unknown')
    revision = d.get('status',{}).get('sync',{}).get('revision','')[:7]
    print(f'{sync} | health={health} | revision={revision}')
except:
    print('unknown')
" 2>/dev/null) || echo "error"

    echo "$status"
}

# -------------------------------------------------------------------
# Main
# -------------------------------------------------------------------
main() {
    login

    echo ""
    echo "Waiting for ArgoCD to sync applications..."

    # Give ArgoCD time to detect the change
    sleep 5

    for app in ecommerce-infra ecommerce-services ecommerce-monitoring; do
        echo ""
        echo "--- Waiting for ${app} ---"

        for ((i=1; i<=MAX_RETRIES; i++)); do
            status=$(check_app_sync "$app")
            echo "  [${i}/${MAX_RETRIES}] ${status}"

            # Check if synced and healthy
            if echo "$status" | grep -q "Synced" && echo "$status" | grep -q "health=Healthy"; then
                echo "  ✓ ${app} is synced and healthy!"
                break
            fi

            if [ "$i" -eq "$MAX_RETRIES" ]; then
                echo "  ✗ ${app} did not reach synced state in time"
                echo "    Check ArgoCD UI for details"
            fi

            sleep "$RETRY_INTERVAL"
        done
    done

    echo ""
    echo "--- Pod Status ---"
    kubectl get pods -n ecommerce -o wide 2>/dev/null || true

    echo ""
    echo "--- Image Tags in Running Pods ---"
    for pod in $(kubectl get pods -n ecommerce -o name 2>/dev/null); do
        tag=$(kubectl get "$pod" -n ecommerce -o jsonpath='{.spec.containers[0].image}' 2>/dev/null)
        echo "  ${pod}: ${tag}"
    done

    echo ""
    echo "=========================================="
    echo " Verification complete"
    echo "=========================================="
}

main
