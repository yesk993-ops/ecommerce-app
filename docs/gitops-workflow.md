# GitOps Workflow — Two-Repo Approach

## Overview

This project uses a **two-repo GitOps** model:

| Repo | URL | Contents | Watched By |
|------|-----|----------|------------|
| **App Repo** | `github.com/yourorg/ecommerce-app` | Source code, CI pipeline, tests, Dockerfiles | Jenkins |
| **Manifests Repo** | `github.com/yourorg/ecommerce-manifests` | K8s manifests, ArgoCD apps, monitoring, infra | ArgoCD |

## Workflow

```
┌─────────────┐
│  Developer  │
│  git push   │
└──────┬──────┘
       │ main branch
       ▼
┌──────────────────────────────────────────────────┐
│  App Repo (ecommerce-app)                        │
│  ───────────────────────                         │
│  Triggers Jenkins Pipeline                       │
│  1. Checkout                                     │
│  2. ESLint + SonarQube                           │
│  3. Unit tests (parallel)                        │
│  4. Trivy security scan                          │
│  5. Docker build (10 images, parallel)           │
│  6. Image security scan                          │
│  7. Push images to Docker Hub                    │
│  8. GitOps: clone manifests repo                 │
│     update image tags → commit → push             │
│  9. Verify ArgoCD sync status                    │
└──────────────────────┬───────────────────────────┘
                       │ Updated image tags
                       ▼
┌──────────────────────────────────────────────────┐
│  Manifests Repo (ecommerce-manifests)             │
│  ──────────────────────────                      │
│  deploy/k8s/overlays/prod/kustomization.yaml      │
│    images:                                        │
│      - name: auth-service                         │
│        newTag: 42-abc123   ◄─── Updated by Jenkins│
│      - name: frontend                             │
│        newTag: 42-abc123   ◄─── Updated by Jenkins│
└──────────────────────┬───────────────────────────┘
                       │ ArgoCD detects drift
                       ▼
┌──────────────────────────────────────────────────┐
│  ArgoCD                                           │
│  ───────                                          │
│  App-of-Apps pattern:                             │
│  root-app                                         │
│    ├── ecommerce-infra   (Postgres, Redis, Kafka) │
│    ├── ecommerce-services (10 microservices)      │
│    └── ecommerce-monitoring (Prometheus, Grafana) │
│                                                   │
│  Sync Policy: automated, prune, self-heal         │
└──────────────────────┬───────────────────────────┘
                       │ kubectl apply
                       ▼
┌──────────────────────────────────────────────────┐
│  Kubernetes Cluster (K3s / EKS)                   │
│  ────────────────────────────                    │
│  Rolling update with new image tags              │
│  HPA manages scaling                             │
│  Health checks ensure zero-downtime              │
└──────────────────────────────────────────────────┘
```

## Why Two Repos?

### Separation of Concerns
- **App developers** only interact with the app repo
- **Platform engineers** manage the manifests repo
- **ArgoCD** only needs access to manifests repo (least privilege)

### Security
- ArgoCD only needs read access to manifests repo
- No need to expose app source to ArgoCD
- Pipeline credentials (Docker Hub) stay in Jenkins

### Rollback
- Rolling back is a `git revert` in the manifests repo
- No need to rebuild Docker images
- ArgoCD auto-syncs the revert

### Audit Trail
- Manifests repo shows exact deployment history
- Each deployment commit references the app commit and pipeline URL
- Deployment records are written as JSON artifacts

## GitOps Scripts

Located in `ci/jenkins/scripts/`:

| Script | Purpose |
|--------|---------|
| `gitops-updater.sh` | Clones manifests repo, updates image tags, commits, pushes |
| `verify-deployment.sh` | Checks ArgoCD sync status after deployment |
| `gitops-rollback.sh` | Reverts manifests repo to a previous commit |

## ArgoCD Setup

### Prerequisites
1. Create the manifests repo: `github.com/yourorg/ecommerce-manifests`
2. Push the contents of the manifests-repo directory to it
3. Ensure the K8s cluster has ArgoCD installed

### Bootstrap

```bash
# 1. Push manifests to their repo
cd manifests-repo
git init && git add . && git commit -m "initial commit"
git remote add origin https://github.com/yourorg/ecommerce-manifests.git
git push -u origin main

# 2. Install ArgoCD on the cluster
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 3. Wait for ArgoCD to be ready
kubectl wait --for=condition=available --timeout=300s -n argocd deployment/argocd-server

# 4. Apply the AppProject
kubectl apply -f deploy/argocd/projects/ecommerce-project.yaml

# 5. Bootstrap root app (App of Apps)
kubectl apply -f deploy/argocd/applications/root-app.yaml

# 6. Verify
argocd app list
```

### Jenkins Configuration

Configure these credentials in Jenkins:

| ID | Type | Purpose |
|----|------|---------|
| `docker-hub-creds` | Username with password | Push Docker images |
| `github-pat` | Secret text | Clone + push manifests repo |
| `sonarqube-token` | Secret text | SonarQube analysis |

## Rolling Back

```bash
# Option 1: git revert in manifests repo
cd manifests-repo
git revert HEAD
git push origin main
# → ArgoCD auto-syncs the revert

# Option 2: Use the rollback script
./ci/jenkins/scripts/gitops-rollback.sh \
  https://github.com/yourorg/ecommerce-manifests.git \
  <target-commit-hash>
# → ArgoCD auto-syncs
```

## Verification

```bash
# Check ArgoCD app status
argocd app get ecommerce-services

# Check which image tags are running
kubectl get pods -n ecommerce -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[0].image}{"\n"}{end}'

# Manual verification script
./ci/jenkins/scripts/verify-deployment.sh
```
