.PHONY: help prerequisites infra-up infra-down dev build test ci-run \
        k8s-start k8s-deploy k8s-destroy clean all

SHELL := /bin/bash

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
	awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

prerequisites: ## Check and install prerequisites
	@echo "Checking prerequisites..."
	@command -v docker >/dev/null 2>&1 || { echo "Installing Docker..."; curl -fsSL https://get.docker.com | sh; }
	@command -v kubectl >/dev/null 2>&1 || { echo "Installing kubectl..."; curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && chmod +x kubectl && sudo mv kubectl /usr/local/bin/; }
	@command -v minikube >/dev/null 2>&1 || { echo "Installing Minikube..."; curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64 && sudo install minikube-linux-amd64 /usr/local/bin/minikube; }
	@command -v terraform >/dev/null 2>&1 || { echo "Installing Terraform..."; wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor | sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg && echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $$(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list && sudo apt update && sudo apt install terraform; }
	@echo "All prerequisites satisfied."

infra-up: ## Start infrastructure services (Postgres, Redis, Kafka)
	docker compose up -d postgres redis zookeeper kafka

infra-down: ## Stop infrastructure services
	docker compose down

dev: ## Start all services in development mode
	docker compose up -d --build

dev-logs: ## Tail logs from all services
	docker compose logs -f

build: ## Build all Docker images
	docker compose build

test: ## Run tests for all services
	@for dir in src/*/; do \
		if [ -f "$$dir/package.json" ]; then \
			echo "Testing $$dir..."; \
			cd "$$dir" && npm test || true; \
			cd ../..; \
		fi \
	done

clean: ## Clean Docker resources
	docker compose down -v
	docker system prune -f

k8s-start: ## Start Minikube cluster
	minikube start --cpus=4 --memory=8192 --disk-size=20g
	minikube addons enable ingress
	minikube addons enable metrics-server
	minikube addons enable dashboard

k8s-deploy: ## Deploy all services to Kubernetes
	kubectl apply -f deploy/k8s/base/infra/namespace.yaml
	kubectl apply -f deploy/k8s/base/infra/configmap.yaml
	kubectl apply -f deploy/k8s/base/infra/secrets.yaml
	kubectl apply -f deploy/k8s/base/auth/
	kubectl apply -f deploy/k8s/base/user/
	kubectl apply -f deploy/k8s/base/product/
	kubectl apply -f deploy/k8s/base/cart/
	kubectl apply -f deploy/k8s/base/order/
	kubectl apply -f deploy/k8s/base/payment/
	kubectl apply -f deploy/k8s/base/inventory/
	kubectl apply -f deploy/k8s/base/notification/
	kubectl apply -f deploy/k8s/base/gateway/
	kubectl apply -f deploy/k8s/base/frontend/
	kubectl apply -f deploy/k8s/base/infra/

k8s-destroy: ## Destroy Kubernetes deployment
	kubectl delete all --all -n ecommerce
	kubectl delete namespace ecommerce

ci-run: ## Run local CI pipeline
	@echo "Running CI pipeline..."
	@cd ci/jenkins && ./scripts/local-test.sh

terraform-init: ## Initialize Terraform
	cd infra/terraform/environments/dev && terraform init

terraform-plan: ## Plan Terraform deployment
	cd infra/terraform/environments/dev && terraform plan

terraform-apply: ## Apply Terraform deployment
	cd infra/terraform/environments/dev && terraform apply -auto-approve

terraform-destroy: ## Destroy Terraform deployment
	cd infra/terraform/environments/dev && terraform destroy -auto-approve

ansible-ping: ## Test Ansible connectivity
	ansible all -i infra/ansible/inventory/hosts.yml -m ping

ansible-playbook: ## Run Ansible playbook
	ansible-playbook -i infra/ansible/inventory/hosts.yml infra/ansible/playbooks/site.yml

security-scan: ## Run Trivy security scan
	trivy image --severity CRITICAL,HIGH ecommerce-auth:latest
	trivy config .

backup-db: ## Backup PostgreSQL database
	@mkdir -p backup
	docker exec ecommerce-postgres pg_dump -U ecommerce ecommerce > backup/ecommerce_$$(date +%Y%m%d_%H%M%S).sql

restore-db: ## Restore PostgreSQL database
	@echo "Usage: make restore-db FILE=backup.sql"
	docker exec -i ecommerce-postgres psql -U ecommerce ecommerce < $(FILE)

all: prerequisites infra-up build dev k8s-start k8s-deploy ## Full setup
