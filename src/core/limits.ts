/** Shared workload bounds: input, history and editor must agree. */
export const LIMITS = {
  duration: { min: 5, max: 120 },
  virtualUsers: { min: 1, max: 100 },
  arrivalRate: { min: 1, max: 500 },
  maxRequests: { min: 100, max: 100000, default: 10000 },
  stageCount: { min: 2, max: 8 },
  stageDuration: { min: 1 },
  phases: { min: 0, max: 30, minMeasured: 5 },
  maxP95Ms: { min: 0, max: 120000 },
} as const;
