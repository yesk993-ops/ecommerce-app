#!/bin/bash
# ==============================================================================
# GitOps Rollback Script
# Reverts the manifests repo to a previous commit to trigger ArgoCD rollback.
# Usage:
#   ./gitops-rollback.sh <manifests-repo-url> <target-commit>
#
# Example:
#   ./gitops-rollback.sh "https://github.com/yourorg/ecommerce-manifests.git" abc123
# ==============================================================================

set -euo pipefail

if [ $# -lt 2 ]; then
    echo "Usage: $0 <manifests-repo-url> <target-commit>"
    echo "Example: $0 https://github.com/yourorg/ecommerce-manifests.git abc123def"
    exit 1
fi

MANIFESTS_REPO_URL="$1"
TARGET_COMMIT="$2"
MANIFESTS_BRANCH="${3:-main}"
MANIFESTS_DIR="/tmp/ecommerce-rollback-$$"

GITHUB_TOKEN="${GITHUB_TOKEN:-}"

echo "=========================================="
echo " GitOps Rollback"
echo "=========================================="
echo " Target Commit: ${TARGET_COMMIT}"
echo " Repo:          ${MANIFESTS_REPO_URL}"
echo " Branch:        ${MANIFESTS_BRANCH}"
echo "=========================================="

echo ""
echo "Step 1: Cloning manifests repo..."
rm -rf "$MANIFESTS_DIR"
if [ -n "$GITHUB_TOKEN" ]; then
    authed_url=$(echo "$MANIFESTS_REPO_URL" | sed "s|https://|https://x-access-token:${GITHUB_TOKEN}@|")
    git clone "$authed_url" "$MANIFESTS_DIR"
else
    git clone "$MANIFESTS_REPO_URL" "$MANIFESTS_DIR"
fi

cd "$MANIFESTS_DIR"
git config user.email "jenkins@ecommerce.local"
git config user.name "Jenkins CI"

echo ""
echo "Step 2: Checking if target commit exists..."
if git cat-file -e "${TARGET_COMMIT}^{commit}" 2>/dev/null; then
    echo "  Commit found: ${TARGET_COMMIT}"
else
    echo "ERROR: Commit ${TARGET_COMMIT} not found in repository."
    echo "Available recent commits:"
    git log --oneline -10
    rm -rf "$MANIFESTS_DIR"
    exit 1
fi

echo ""
echo "Step 3: Reverting to target commit..."
# Get the current state
echo "  Current HEAD: $(git log --oneline -1)"
echo "  Target:       ${TARGET_COMMIT}"

# Use git revert for a safer rollback (creates new commits instead of rewriting history)
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
git checkout -b rollback-$(date +%Y%m%d%H%M%S)
git revert --no-commit HEAD..${TARGET_COMMIT} 2>/dev/null || {
    echo "  Revert conflicts detected. Trying hard reset instead..."
    # Force reset to target (this rewrites history — use with caution)
    git checkout "$CURRENT_BRANCH"
    git reset --hard "$TARGET_COMMIT"
}

echo ""
echo "Step 4: Committing rollback..."
git add .
git commit -m "rollback: revert to commit ${TARGET_COMMIT}

    Triggered by $USER
    Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)

    [skip ci]"

echo ""
echo "Step 5: Pushing rollback..."
git push origin "$CURRENT_BRANCH" --force-with-lease

echo ""
echo "Step 6: Cleanup..."
rm -rf "$MANIFESTS_DIR"

echo ""
echo "=========================================="
echo " Rollback complete!"
echo " ArgoCD will detect the change and sync."
echo "=========================================="
