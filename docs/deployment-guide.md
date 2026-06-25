# Deployment Guide

## Local Development (Docker Compose)

### Prerequisites

```bash
# Ubuntu 24.04
sudo apt update && sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker $USER
newgrp docker
```

### Quick Start

```bash
# Clone and enter
git clone <repo-url> && cd ecommerce-service-project

# Start all services
make dev

# Verify
curl http://localhost/health
curl http://localhost/api/products
```

### Access Points

| Service    | URL                        |
|------------|----------------------------|
| Frontend   | http://localhost:3000       |
| API        | http://localhost/api        |
| Prometheus | http://localhost:9090       |
| Grafana    | http://localhost:3030       |
| Kibana     | http://localhost:5601       |
| Jaeger     | http://localhost:16686      |
| MailHog    | http://localhost:8025       |
| SonarQube  | http://localhost:9000       |

## Kubernetes (K3s/Minikube)

### Minikube Setup

```bash
make k8s-start
```

### Deploy

```bash
# Deploy infrastructure (Postgres, Redis, Kafka)
kubectl apply -f deploy/k8s/base/infra/namespace.yaml
kubectl apply -f deploy/k8s/base/infra/postgres.yaml
kubectl apply -f deploy/k8s/base/infra/redis.yaml
kubectl apply -f deploy/k8s/base/infra/kafka.yaml

# Deploy services
make k8s-deploy

# Access
minikube service api-gateway -n ecommerce
```

### Enable Ingress

```bash
minikube addons enable ingress
# Add to /etc/hosts:
echo "$(minikube ip) ecommerce.local grafana.ecommerce.local prometheus.ecommerce.local" | sudo tee -a /etc/hosts
```

## Production (AWS EKS)

### Terraform

```bash
cd infra/terraform/environments/prod
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

### Ansible

```bash
ansible-playbook -i infra/ansible/inventory/hosts.yml \
  infra/ansible/playbooks/site.yml \
  --ask-vault-pass
```

### ArgoCD

```bash
# Install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Apply applications
kubectl apply -f deploy/argocd/applications/
```

## CI/CD Pipeline

### Jenkins Setup

```bash
# Deploy Jenkins
docker run -d --name jenkins \
  -p 8080:8080 -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  jenkins/jenkins:lts

# Configure
# 1. Install plugins: Docker, Kubernetes, SonarQube, ArgoCD
# 2. Add credentials (Docker Hub, GitHub, SonarQube)
# 3. Create pipeline: ci/jenkins/pipelines/Jenkinsfile
```

### Local CI Test

```bash
make ci-run
```

## Monitoring Setup

### Prometheus + Grafana

```bash
# Deploy monitoring stack
kubectl apply -f monitoring/prometheus/prometheus.yml -n monitoring
kubectl apply -f monitoring/grafana/ -n monitoring

# Import dashboards
# Grafana → Import → Upload monitoring/grafana/dashboards/json/ecommerce-microservices.json
```

### ELK Stack

```bash
# Deploy Filebeat as DaemonSet
kubectl apply -f monitoring/elk/filebeat/
```

## Security Hardening

### Vault Setup

```bash
# Deploy Vault
kubectl apply -f security/vault/vault-config.json -n ecommerce-infra

# Initialize Vault
vault operator init
vault operator unseal

# Configure Kubernetes auth
vault auth enable kubernetes
vault write auth/kubernetes/config token_reviewer_jwt="$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)"
```

### Trivy Scanning

```bash
# Scan all images
make security-scan

# CI integration (already in Jenkinsfile)
trivy image --severity CRITICAL,HIGH ecommerce/auth-service:latest
trivy config deploy/k8s/
```

## Backup & Restore

### Automated Backup

```bash
# Run manual backup
bash backup/backup.sh

# Schedule with Cron
0 */6 * * * /opt/ecommerce/backup/backup.sh
```

### Restore

See [backup/disaster-recovery.md](backup/disaster-recovery.md)
