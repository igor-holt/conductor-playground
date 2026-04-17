export const retrainingConfig = {
  convergence: { standardCycles: 3, escalatedCycles: 5 },
  eval: {
    lenientPassRatio: 0.75,
    lenientAverage: 0.85,
    targetWords: 100,
  },
  metaprompt: {
    model: "gpt-5",
    minImprovementFloor: 0.02,
    maxRetries: 3,
  },
  regressionWatchdog: {
    windowCycles: 3,
    degradeThreshold: 0.85,
    degradeCountRequired: 3,
    residualDriftThreshold: 0.02,
  },
  modelCandidates: ["gpt-5", "gpt-5-mini"],
} as const;
