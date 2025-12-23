# Kubernetes Manifests (Day 26)

This folder contains production-oriented Kubernetes manifests for:

- `inventory-service`
- `auth-service`
- `analytics-service`

It includes:

- Deployments (RollingUpdate, replicas=2, resources, probes)
- Services (ClusterIP)
- Per-service ConfigMaps + Secrets (envFrom)
- NGINX Ingress with path routing + rewrite + basic rate limiting
- HPAs for inventory + analytics (CPU+memory)
- Observability:
  - Prometheus scrape annotations (pods scrape `/metrics` on port 3000)
  - Fluent Bit DaemonSet that tails container logs and outputs to stdout
  - Example Grafana dashboard JSON

## Apply order (recommended)

1. Ensure the `backend` namespace exists.
2. Apply per-service `configmap.yaml` + `secret.yaml`.
3. Apply per-service `deployment.yaml` + `service.yaml`.
4. Apply `hpa.yaml` for services that have HPAs.
5. Apply `ingress.yaml`.
6. Apply `fluent-bit.yaml`.

## Notes on secrets

All Secret values are **base64 placeholders** to prevent plaintext secrets in Git.
Replace them before applying.

## Metrics

Prometheus annotations are included, assuming your services expose a Prometheus-compatible endpoint at `GET /metrics`.

## Logging

Fluent Bit is configured to collect logs from `/var/log/containers/*.log`, enrich with Kubernetes metadata, parse JSON logs when possible, and output to stdout.
