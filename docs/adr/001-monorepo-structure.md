# ADR-001: Monorepo Structure

## Status
Accepted

## Context
Need to choose between monorepo and multi-repo for 10 microservices.

## Decision
Use monorepo with clear directory structure for:
- Simplified CI/CD (single pipeline)
- Shared libraries without package publishing
- Atomic commits across services
- Easier local development

## Consequences
- Requires disciplined code ownership
- CI must be optimized to avoid building all services
- Larger clone size, mitigated by sparse checkout in CI
