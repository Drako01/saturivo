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

## SSRF / DNS / redirects

For a loopback target given as `localhost`, the generated k6 workload
pins the name to `127.0.0.1` and never uses DNS results from a
possibly modified hosts file. Literal `127/8` and `::1` targets need
no DNS resolution. URLs with credentials or fragments are forbidden,
redirects are disabled, and remote targets require both application-level
opt-in and explicit authorization confirmation. Profile capture is even
stricter: it requires a literal local loopback HTTP IP and rejects redirects.
This is defense-in-depth, not a general approval to test a third party.


## Optional Go GC and allocation observations (Phase 2)

If the owner explicitly authorizes a local Go timeline, Saturivo may query
`/debug/vars` on the **same literal-loopback Go pprof origin** during before/during/after
sampling. Only four standard Go expvar `memstats` numeric counters are used:
`NumGC`, `TotalAlloc`, `HeapAlloc`, and `PauseTotalNs`. Other application expvar
keys, code, paths, or secrets are never included in the derived report. A missing,
oversized or invalid endpoint produces `NOT_SUPPORTED`, never fabricated zeroes.

Counter deltas are monotonic, process-wide **observations**. They may include other
application activity and cannot prove GC caused a latency change, nor substitute for
a controlled with/without-profiling overhead experiment. The GC read uses an explicit
local HTTP GET, bounded by 64 KiB and 3 seconds, no redirects and no proxies.
