# rush-t

Ticket booking system with microservices architecture.

## Structure

```
rush-t/
├── core-service/         # Go backend service
├── database/             # SQL schemas and seed data
├── deployments/          # Docker and orchestration
├── docs/                 # Documentation
├── scripts/              # Build and test scripts
└── tests/                # Load tests (k6)
```

## Quick Start

```bash
cd deployments
docker-compose up -d
```

Core service: http://localhost:3000
Kafka UI: http://localhost:8080

## Documentation

See `docs/` for architecture and design docs.

