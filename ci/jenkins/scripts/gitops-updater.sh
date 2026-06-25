#!/bin/bash
# ==============================================================================
# GitOps Manifest Updater
# Called by Jenkins CI to update the manifests repo with new Docker image tags.
# Usage:
#   ./gitops-updater.sh <image-tag> <git-commit> <manifests-repo-url> <branch>
#
# Example:
#   ./gitops-updater.sh "42-abc123" "abc123def456" \
#     "https://github.com/yourorg/ecommerce-manifests.git" "main"
# ==============================================================================

set -euo pipefail

# -------------------------------------------------------------------
# Validate inputs
# -------------------------------------------------------------------
if [ $# -lt 4 ]; then
    echo "ERROR: Missing arguments"
    echo "Usage: $0 <image-tag> <git-commit> <manifests-repo-url> <branch>"
    exit 1
fi

IMAGE_TAG="$1"
GIT_COMMIT="$2"
MANIFESTS_REPO_URL="$3"
MANIFESTS_BRANCH="$4"
MANIFESTS_DIR="/tmp/ecommerce-manifests-${BUILD_NUMBER:-$$}"

GITHUB_TOKEN="${GITHUB_TOKEN:-}"
CI_PIPELINE_URL="${BUILD_URL:-https://jenkins.local/job/unknown}"

echo "=========================================="
echo " GitOps Manifest Updater"
echo "=========================================="
echo " Image Tag:      ${IMAGE_TAG}"
echo " Commit:         ${GIT_COMMIT}"
echo " Manifests Repo: ${MANIFESTS_REPO_URL}"
echo " Branch:         ${MANIFESTS_BRANCH}"
echo "=========================================="

# -------------------------------------------------------------------
# Helper: Clone repo with auth
# -------------------------------------------------------------------
clone_repo() {
    local repo_url="$1"
    local target_dir="$2"
    local branch="$3"

    rm -rf "$target_dir"

    if [ -n "$GITHUB_TOKEN" ]; then
        # Authenticated clone via token
        authed_url=$(echo "$repo_url" | sed "s|https://|https://x-access-token:${GITHUB_TOKEN}@|")
        git clone --depth 1 -b "$branch" "$authed_url" "$target_dir"
    else
        git clone --depth 1 -b "$branch" "$repo_url" "$target_dir"
    fi

    cd "$target_dir"
    git config user.email "jenkins@ecommerce.local"
    git config user.name "Jenkins CI"
}

# -------------------------------------------------------------------
# Helper: Update image tags in kustomization.yaml
# -------------------------------------------------------------------
update_image_tags() {
    local kustomization_file="$1"
    local new_tag="$2"

    if [ ! -f "$kustomization_file" ]; then
        echo "ERROR: Kustomization file not found: $kustomization_file"
        return 1
    fi

    # Get old tag for logging
    local old_tag
    old_tag=$(grep 'newTag:' "$kustomization_file" | head -1 | awk '{print $2}')
    echo "Updating image tags: ${old_tag:-unknown} → ${new_tag}"

    # Replace all newTag values
    sed -i "s/newTag: .*/newTag: ${new_tag}/g" "$kustomization_file"
}

# -------------------------------------------------------------------
# Helper: Update a single service's image in kustomization.yaml
# -------------------------------------------------------------------
update_service_image() {
    local kustomization_file="$1"
    local service_name="$2"
    local new_tag="$3"

    if [ ! -f "$kustomization_file" ]; then
        echo "ERROR: Kustomization file not found: $kustomization_file"
        return 1
    fi

    echo "  Updating ${service_name} → tag: ${new_tag}"

    # Update both name and tag for this specific service
    sed -i \
        -e "/name: .*\/${service_name}$/!b" \
        -e "/name: .*\/${service_name}$/,/newTag:/s/newTag: .*/newTag: ${new_tag}/" \
        "$kustomization_file"
}

# -------------------------------------------------------------------
# Helper: Update Helm values file if used
# -------------------------------------------------------------------
update_helm_values() {
    local values_file="$1"
    local new_tag="$2"

    if [ -f "$values_file" ]; then
        echo "  Updating Helm values: ${values_file}"
        sed -i "s/tag: .*/tag: ${new_tag}/g" "$values_file"
    fi
}

# -------------------------------------------------------------------
# Helper: Write a deployment record for audit trail
# -------------------------------------------------------------------
write_deployment_record() {
    local manifests_dir="$1"
    local new_tag="$2"
    local commit="$3"

    local records_dir="${manifests_dir}/deploy/records"
    mkdir -p "$records_dir"

    local record_file="${records_dir}/deployment-$(date +%Y%m%d-%H%M%S).json"

    cat > "$record_file" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "imageTag": "${new_tag}",
  "commit": "${commit}",
  "pipeline": "${CI_PIPELINE_URL}",
  "deployedBy": "Jenkins CI",
  "services": [
    "auth-service", "user-service", "product-service", "cart-service",
    "order-service", "payment-service", "inventory-service",
    "notification-service", "api-gateway", "frontend"
  ]
}
EOF

    echo "  Deployment record written: ${record_file}"
}

# -------------------------------------------------------------------
# Main execution
# -------------------------------------------------------------------
main() {
    echo ""
    echo "Step 1: Cloning manifests repo..."
    clone_repo "$MANIFESTS_REPO_URL" "$MANIFESTS_DIR" "$MANIFESTS_BRANCH"

    echo ""
    echo "Step 2: Updating image tags..."
    KUSTOMIZATION_FILE="${MANIFESTS_DIR}/deploy/k8s/overlays/prod/kustomization.yaml"
    update_image_tags "$KUSTOMIZATION_FILE" "$IMAGE_TAG"

    # Also update dev overlay if it exists
    DEV_KUSTOMIZATION="${MANIFESTS_DIR}/deploy/k8s/overlays/dev/kustomization.yaml"
    if [ -f "$DEV_KUSTOMIZATION" ]; then
        echo "  Also updating dev overlay..."
        update_image_tags "$DEV_KUSTOMIZATION" "$IMAGE_TAG"
    fi

    echo ""
    echo "Step 3: Writing deployment record..."
    write_deployment_record "$MANIFESTS_DIR" "$IMAGE_TAG" "$GIT_COMMIT"

    echo ""
    echo "Step 4: Checking for changes..."
    cd "$MANIFESTS_DIR"
    if git diff --quiet; then
        echo "  No changes to commit."
        echo "  (Image tag ${IMAGE_TAG} may already be current)"
        return 0
    fi

    echo "  Changed files:"
    git diff --stat

    echo ""
    echo "Step 5: Committing and pushing..."
    git add .
    git commit -m "chore: update image tags to ${IMAGE_TAG}

    Automated deployment triggered by Jenkins CI.
    - App commit: ${GIT_COMMIT}
    - Pipeline: ${CI_PIPELINE_URL}
    - Services: auth-service, user-service, product-service, cart-service,
                order-service, payment-service, inventory-service,
                notification-service, api-gateway, frontend

    [skip ci]"

    git push origin "$MANIFESTS_BRANCH"

    echo ""
    echo "Step 6: Cleanup..."
    rm -rf "$MANIFESTS_DIR"

    echo ""
    echo "=========================================="
    echo " SUCCESS: Manifests repo updated!"
    echo " Image tag ${IMAGE_TAG} pushed to ${MANIFESTS_REPO_URL}"
    echo " ArgoCD will auto-sync to cluster."
    echo "=========================================="
}

main
