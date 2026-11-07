# Performance measurement methodology

**Measurements are observations under a specific workload and environment.** A single result cannot establish a system's production capacity.

## Workload models

- `constant-vus`: closed-loop; VUs execute requests as quickly as responses permit.
- `constant-arrival-rate`: open-loop; attempts a constant number of iterations/s independently of server responses, bounded by available VUs.
- `dropped_iterations > 0` indicates the load generator could not sustain the intended arrival rate; report this separately from server errors.

## KPIs

- P50/P95/P99 are request latency percentiles in milliseconds, not proof of end-user latency.
- RPS is delivered HTTP request throughput; request count and failure rate come from k6 metrics.
- A passing threshold is not enough: compare to a baseline and record the environment.

## Baseline

Matching target, method, model, duration, VUs and arrival rate is mandatory. Mismatched platform/architecture/CPU count or fewer than 100 requests returns **inconclusive**.

The current v0.1.0 heuristic flags a regression for P95 worse by both >10% and >5ms, errors >2 percentage points, or throughput worse than 10%. It does **not** adjust for warm-up, sampling noise or confidence intervals. Do not treat the result as a statistical quality gate.

## Safe performance practice

Use a disposable local server, isolated database, realistic but synthetic datasets and known resource limits. Prefer a dedicated load generator to avoid self-interference. Document runtime versions and machine load. Never use high-volume traffic against third-party systems without authorization.
