# E-Commerce Microservices Platform — App Repository

**This is the Application Code Repository.**  
Kubernetes manifests and GitOps configs live in the separate [Manifests Repository](#manifests-repository).

## Architecture Overview

Production-grade microservices e-commerce platform with 10 services demonstrating real-world DevOps practices.

### Two-Repo GitOps Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     GIT REPOSITORIES (Two-Repo GitOps)                      │
├───────────────────────────────┬─────────────────────────────────────────────┤
│   REPO 1: ecommerce-app       │   REPO 2: ecommerce-manifests               │
│   (THIS REPO)                 │   (github.com/yourorg/ecommerce-manifests)   │
│                               │                                             │
│   src/auth-service/           │   deploy/k8s/base/                          │
│   src/user-service/           │   deploy/k8s/overlays/                      │
│   src/product-service/        │   deploy/argocd/                            │
│   src/cart-service/           │   monitoring/                               │
│   src/order-service/          │   security/                                 │
│   src/payment-service/        │   infra/terraform/                          │
│   src/inventory-service/      │   infra/ansible/                            │
│   src/notification-service/   │   backup/                                   │
│   src/api-gateway/            │                                             │
│   src/frontend/               │   ARGOCD SOURCE OF TRUTH                    │
│   ci/jenkins/                 │     (ArgoCD watches this repo)              │
│   tests/                      │                                             │
└───────────────┬───────────────┴─────────────────────┬───────────────────────┘
                │                                     │
                │ 1. Push code                        │ 3. ArgoCD detects
                ▼                                     │    drift & syncs
        ┌───────────────┐                             │
        │  Jenkins CI   │──── 2. Update image tags ───┘
        │  (Pipeline)   │        in kustomization.yaml
        │               │──── and commits + pushes ───┘
        └───────────────┘                             │
                                                      ▼
                                            ┌──────────────────┐
                                            │  Kubernetes      │
                                            │  Cluster (K3s)   │
                                            └──────────────────┘
```

### System Architecture

```
                          ┌─────────────┐
                          │   Frontend   │
                          │   (React)    │
                          └──────┬──────┘
                                 │ HTTP
                          ┌──────▼──────┐
                          │ API Gateway  │
                          │  (NGINX)     │
                          └──┬───┬───┬──┘
                             │   │   │
              ┌──────────────┘   │   └──────────────┐
         ┌────▼────┐       ┌────▼────┐        ┌────▼────┐
         │   Auth   │       │   User  │        │ Product  │
         │ Service  │       │ Service │        │ Service  │
         └────┬─────┘       └────┬────┘        └────┬────┘
              │                  │                   │
         ┌────▼────┐       ┌────▼────┐        ┌────▼────┐
         │   Cart   │       │  Order  │        │ Payment  │
         │ Service  │       │ Service │        │ Service  │
         └────┬─────┘       └────┬────┘        └────┬────┘
              │                  │                   │
         ┌────▼────┐       ┌────▼────┐        ┌────▼────┐
         │Inventory │       │Notification          │
         │ Service  │       │ Service   │        │
         └──────────┘       └───────────┘        └──────────┘
```

### Data Flow

```
User → Frontend → API Gateway → Auth (JWT) → Services → PostgreSQL
                                     ↓
                               Redis (Cache)
                                     ↓
                              Kafka (Async)
                                     ↓
                        Inventory/Notification
```

### Tech Stack

| Layer          | Technology                           |
|----------------|--------------------------------------|
| Backend        | Node.js / Express                    |
| Frontend       | React + Material UI                  |
| Database       | PostgreSQL 16                        |
| Cache          | Redis 7                              |
| Messaging      | Kafka 3.6 + Zookeeper               |
| API Gateway    | NGINX / Kong                         |
| Container      | Docker + Docker Compose              |
| Orchestration  | Kubernetes (K3s)                     |
| CI/CD          | Jenkins                              |
| GitOps         | ArgoCD                               |
| IaC            | Terraform                            |
| Config Mgmt    | Ansible                              |
| Monitoring     | Prometheus + Grafana                 |
| Logging        | ELK Stack (Elasticsearch, Logstash, Kibana) |
| Security       | Vault, Trivy, SonarQube              |

### Service Communication

- **Synchronous**: HTTP REST between services via API Gateway
- **Asynchronous**: Kafka events for eventual consistency
- **Caching**: Redis for session store, product cache, rate limiting
- **Auth**: JWT-based authentication with refresh tokens

### Port Mapping

| Service       | Port |
|---------------|------|
| API Gateway   | 80   |
| Frontend      | 3000 |
| Auth Service  | 4001 |
| User Service  | 4002 |
| Product Srv   | 4003 |
| Cart Service  | 4004 |
| Order Service | 4005 |
| Payment Srv   | 4006 |
| Inventory Srv | 4007 |
| Notification  | 4008 |
| PostgreSQL    | 5432 |
| Redis         | 6379 |
| Kafka         | 9092 |
| Prometheus    | 9090 |
| Grafana       | 3030 |
| Kibana        | 5601 |

## Manifests Repository

Kubernetes manifests, ArgoCD Application definitions, monitoring config, and IaC live in a **separate repository**:

```
https://github.com/yourorg/ecommerce-manifests
├── deploy/
│   ├── k8s/base/         # K8s manifests per service
│   ├── k8s/overlays/     # Kustomize overlays (dev/staging/prod)
│   └── argocd/           # ArgoCD AppProject + Applications
├── monitoring/           # Prometheus, Grafana, ELK config
├── security/             # Vault, Trivy, SonarQube config
├── backup/               # Backup scripts & DR docs
└── infra/                # Terraform & Ansible
```

**ArgoCD watches this repo.** When Jenkins updates image tags here, ArgoCD auto-syncs to Kubernetes.

## Repository Structure (This Repo)

```
ecommerce-service-project/        # git remote: ecommerce-app
├── src/                           # Source code (10 microservices)
│   ├── auth-service/              # Authentication service
│   ├── user-service/              # User management service
│   ├── product-service/           # Product catalog service
│   ├── cart-service/              # Shopping cart service
│   ├── order-service/             # Order management service
│   ├── payment-service/           # Mock payment service
│   ├── inventory-service/         # Inventory management service
│   ├── notification-service/      # Notification service
│   ├── api-gateway/               # NGINX API gateway
│   └── frontend/                  # React frontend
├── ci/                            # CI/CD configuration
│   └── jenkins/
│       ├── pipelines/Jenkinsfile  # Main CI pipeline
│       └── scripts/               # GitOps helper scripts
├── tests/                         # Integration tests
├── docker-compose.yml            # Local development
└── Makefile                      # Automation targets
```

## Quick Start (Local Dev)

```bash
# Prerequisites
make prerequisites

# Start infrastructure (Postgres, Redis, Kafka)
make infra-up

# Build and start all services
make dev

# Verify
curl http://localhost/health
```

## CI/CD Pipeline (Two-Repo GitOps)

```
Developer pushes to main branch of ecommerce-app
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  Jenkins CI Pipeline (Jenkinsfile)                          │
│                                                             │
│  Stage 1: Checkout app code                                │
│  Stage 2: Code Quality (ESLint + SonarQube)                │
│  Stage 3: Unit Tests (parallel across services)            │
│  Stage 4: Security Scan (Trivy + npm audit + secrets)      │
│  Stage 5: Build Docker Images (parallel)                   │
│  Stage 6: Scan Built Images (Trivy)                        │
│  Stage 7: Push Images to Registry                          │
│  Stage 8: UPDATE MANIFESTS REPO  ← GitOps handoff           │
│             (clone → update kustomization.yaml              │
│              → commit → push to ecommerce-manifests)        │
│  Stage 9: Verify ArgoCD Sync                                │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  ArgoCD (watches ecommerce-manifests repo)                  │
│                                                             │
│  Detects drift → auto-syncs to K8s                         │
│  App of Apps pattern:                                       │
│    root-app (manages child apps)                            │
│    ├── ecommerce-infra (Postgres, Redis, Kafka)             │
│    ├── ecommerce-services (10 microservices)                │
│    └── ecommerce-monitoring (Prometheus, Grafana)           │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  Kubernetes Cluster (K3s)                                   │
│  Converges to desired state                                 │
└─────────────────────────────────────────────────────────────┘
```

## Setup Jenkins CI

```bash
# 1. Configure credentials in Jenkins:
#    - docker-hub-creds (Docker Hub username/password)
#    - github-pat (GitHub Personal Access Token with repo scope)
#    - sonarqube-token (SonarQube auth token)

# 2. Create pipeline in Jenkins:
#    - New Item → Pipeline
#    - Definition: Pipeline script from SCM
#    - SCM: Git
#    - Repository URL: https://github.com/yourorg/ecommerce-app.git
#    - Script Path: ci/jenkins/pipelines/Jenkinsfile
```

## Architecture Decision Records

See [docs/adr](docs/adr) for key architectural decisions.
