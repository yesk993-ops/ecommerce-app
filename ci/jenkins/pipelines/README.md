# Jenkins CI/CD Pipeline — Two-Repo GitOps

## Files

| File | Purpose |
|------|---------|
| `Jenkinsfile` | Main pipeline: CI + GitOps handoff to manifests repo |
| `scripts/gitops-updater.sh` | Clone manifests repo, update image tags, commit, push |
| `scripts/verify-deployment.sh` | Check ArgoCD sync status after deployment |
| `scripts/gitops-rollback.sh` | Revert manifests repo to previous commit |

## Pipeline Stages

```
1. Checkout           ← App repo source code
2. Code Quality       ← ESLint + SonarQube (parallel)
3. Unit Tests         ← Jest across all services (parallel)
4. Security Scan      ← Trivy FS + Config, npm audit (parallel)
5. Build Images       ← Docker build all 10 services (parallel)
6. Image Scan         ← Trivy on critical images
7. Push Images        ← Docker push (main branch only)
8. GitOps Update      ← Clone manifests repo → update kustomization.yaml
                        → commit → push (main branch only)
9. Verify Sync        ← ArgoCD sync status check
```

## Credentials Required in Jenkins

| Credential ID | Type | Used For |
|---------------|------|----------|
| `docker-hub-creds` | Username with password | `docker push` to Docker Hub |
| `github-pat` | Secret text | Authenticated `git push` to manifests repo |
| `sonarqube-token` | Secret text | SonarQube analysis |

## Local CI Test

```bash
# Run CI tasks locally (without Docker push / GitOps)
make ci-run
```
