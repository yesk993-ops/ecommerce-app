# E-Commerce Microservices Architecture

## High-Level Design

### System Context (C4 Level 1)

The e-commerce platform serves customers who browse products, manage carts, and place orders. Administrators manage inventory, products, and users. The system integrates with payment gateways, notification services, and monitoring infrastructure.

### Container Diagram (C4 Level 2)

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway (NGINX)                       │
│                  Port 80 - Reverse Proxy & Load Balancer          │
└────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┘
     │    │    │    │    │    │    │    │    │    │    │    │
     ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼
┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐
│Auth││User││Prod││Cart││Ord ││Pay ││Inv ││Notif││Front││ ...│
└──┬─┘└──┬─┘└──┬─┘└──┬─┘└──┬─┘└──┬─┘└──┬─┘└──┬─┘└──┬─┘
   │     │     │     │     │     │     │     │     │
   └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘
                        │
              ┌─────────▼─────────┐
              │   PostgreSQL 16    │
              └───────────────────┘
              ┌───────────────────┐
              │     Redis 7       │
              └───────────────────┘
              ┌───────────────────┐
              │  Kafka + ZK       │
              └───────────────────┘
```

### Deployment Diagram

```
External LB → NGINX Ingress → Services
                              ├── Pods (2-10 replicas per service)
                              ├── HPA (CPU/Memory based)
                              ├── PDB (Pod Disruption Budgets)
                              └── Network Policies
```

## Key Architecture Decisions

### Service Communication

| Pattern         | Implementation     | Use Case                    |
|-----------------|-------------------|-----------------------------|
| Synchronous     | HTTP REST via GW  | CRUD operations             |
| Asynchronous    | Kafka Events       | Order processing, Inventory |
| Cache-Aside     | Redis              | Product catalog, Sessions   |

### Database per Service

Each service has its own schema within shared PostgreSQL cluster (for this project scale). Production at scale would use dedicated instances per service.

### Event-Driven Flow for Orders

```
1. Frontend → API Gateway → Order Service (creates order, publishes event)
2. Order Service → Kafka: order.created
3. Payment Service (consumes → processes payment → publishes payment.completed)
4. Inventory Service (consumes → reserves stock → publishes stock.reserved)
5. Notification Service (consumes → sends email notification)
```

## Security Architecture

- **Authentication**: JWT (access + refresh tokens)
- **Authorization**: Role-based (customer, admin)
- **Network**: Zero-trust with network policies
- **Secrets**: Vault with dynamic secrets
- **Image Security**: Trivy scanning in CI
- **Code Quality**: SonarQube analysis
- **Container Runtime**: Non-root users, read-only root filesystem
