# ADR-002: Node.js/Express for Microservices

## Status
Accepted

## Context
Choose backend framework: Spring Boot vs Node.js.

## Decision
Use Node.js with Express for:
- Faster development velocity
- Shared types with frontend (TypeScript optional)
- Lighter resource footprint
- Better async I/O for I/O-bound services
- Consistent language across stack

## Consequences
- CPU-bound services may underperform vs JVM
- TypeScript added for type safety
- pm2 or clustering for multi-core utilization
