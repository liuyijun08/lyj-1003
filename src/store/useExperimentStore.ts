import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ExperimentParams,
  ExperimentResult,
  CurvePoint,
  SortField,
  SortOrder,
  RiskTag,
} from "@/types";
import { PRESETS, CURVE_COLORS, PARAM_CONFIGS } from "@/data/presets";
import { generateCurve, calculateMetrics } from "@/utils/curveGenerator";
import { detectAnomalies, getAnomalyNote } from "@/utils/anomalyDetector";

const RATIO_KEYS: (keyof ExperimentParams)[] = ["ratioA", "ratioB", "ratioC"];

function isRatioKey(key: keyof ExperimentParams): boolean {
  return RATIO_KEYS.includes(key);
}

function getRatioMin(key: keyof ExperimentParams): number {
  const config = PARAM_CONFIGS.find((c) => c.key === key);
  return config ? config.min : 0;
}

function getRatioMax(key: keyof ExperimentParams): number {
  const config = PARAM_CONFIGS.find((c) => c.key === key);
  return config ? config.max : 100;
}

function normalizeRatios(
  params: ExperimentParams,
  locked: Partial<Record<keyof ExperimentParams, boolean>>,
  changedKey?: keyof ExperimentParams
): ExperimentParams {
  const result = { ...params };

  for (const key of RATIO_KEYS) {
    if (locked[key]) continue;
    const minVal = getRatioMin(key);
    const maxVal = getRatioMax(key);
    result[key] = Math.max(minVal, Math.min(maxVal, result[key]));
  }

  for (const key of RATIO_KEYS) {
    if (result[key] < 0) {
      result[key] = Math.max(0, getRatioMin(key));
    }
  }

  const unlockedKeys = RATIO_KEYS.filter((k) => !locked[k]);
  const lockedTotal = RATIO_KEYS.filter((k) => locked[k]).reduce((sum, k) => sum + result[k], 0);

  if (unlockedKeys.length === 0) {
    if (changedKey && !locked[changedKey]) {
      const othersTotal = RATIO_KEYS.filter((k) => k !== changedKey).reduce((sum, k) => sum + result[k], 0);
      const minVal = getRatioMin(changedKey);
      const maxVal = getRatioMax(changedKey);
      result[changedKey] = Math.max(minVal, Math.min(maxVal, 100 - othersTotal));
    }
    return result;
  }

  const targetUnlockedTotal = Math.max(0, 100 - lockedTotal);
  const currentUnlockedTotal = unlockedKeys.reduce((sum, k) => sum + result[k], 0);

  if (Math.abs(currentUnlockedTotal - targetUnlockedTotal) > 0.01) {
    if (currentUnlockedTotal > 0) {
      const scale = targetUnlockedTotal / currentUnlockedTotal;
      for (const key of unlockedKeys) {
        result[key] = result[key] * scale;
      }
    } else {
      const perKey = targetUnlockedTotal / unlockedKeys.length;
      for (const key of unlockedKeys) {
        result[key] = perKey;
      }
    }
  }

  for (const key of unlockedKeys) {
    const minVal = getRatioMin(key);
    const maxVal = getRatioMax(key);
    result[key] = Math.max(minVal, Math.min(maxVal, result[key]));
  }

  const finalTotal = RATIO_KEYS.reduce((sum, k) => sum + result[k], 0);
  const diff = 100 - finalTotal;
  if (Math.abs(diff) > 0.001 && unlockedKeys.length > 0) {
    let remaining = diff;
    for (let i = unlockedKeys.length - 1; i >= 0 && Math.abs(remaining) > 0.001; i--) {
      const key = unlockedKeys[i];
      const minVal = getRatioMin(key);
      const maxVal = getRatioMax(key);
      const canAdd = maxVal - result[key];
      const canSub = result[key] - minVal;
      const actual = remaining > 0 ? Math.min(remaining, canAdd) : Math.max(remaining, -canSub);
      result[key] = result[key] + actual;
      remaining = remaining - actual;
    }
  }

  for (const key of RATIO_KEYS) {
    result[key] = Math.round(result[key] * 100) / 100;
  }

  return result;
}

export function validateRatios(params: ExperimentParams): {
  isValid: boolean;
  total: number;
  allPositive: boolean;
  allInRange: boolean;
} {
  const total = RATIO_KEYS.reduce((sum, k) => sum + params[k], 0);
  const allPositive = RATIO_KEYS.every((k) => params[k] > 0);
  const allInRange = RATIO_KEYS.every((k) => {
    const minVal = getRatioMin(k);
    const maxVal = getRatioMax(k);
    return params[k] >= minVal && params[k] <= maxVal;
  });
  return {
    isValid: Math.abs(total - 100) < 0.02 && allPositive && allInRange,
    total,
    allPositive,
    allInRange,
  };
}

interface SaveOptions {
  name?: string;
  batch?: string;
  purpose?: string;
  riskTag?: RiskTag;
}

interface ExperimentState {
  params: ExperimentParams;
  currentCurve: CurvePoint[];
  currentAnomalies: number[];
  currentScore: number;
  currentYield: number;
  currentStability: number;
  savedResults: ExperimentResult[];
  comparisonIds: string[];
  sortField: SortField;
  sortOrder: SortOrder;
  lockedParams: Partial<Record<keyof ExperimentParams, boolean>>;
  filterRiskTag: RiskTag | null;

  setParam: (key: keyof ExperimentParams, value: number) => void;
  loadPreset: (presetId: string) => void;
  toggleParamLock: (key: keyof ExperimentParams) => void;
  recalculate: () => void;
  saveCurrentResult: (options?: SaveOptions) => void;
  deleteResult: (id: string) => void;
  clearResults: () => void;
  toggleComparison: (id: string) => void;
  clearComparison: () => void;
  setSortField: (field: SortField) => void;
  toggleSortOrder: () => void;
  toggleAnomalyMarker: (pointIndex: number) => void;
  getSortedResults: () => ExperimentResult[];
  setFilterRiskTag: (tag: RiskTag | null) => void;
  getFilteredResults: () => ExperimentResult[];
}

const defaultParams = PRESETS[0].params;
const initialCurve = generateCurve(defaultParams);
const initialMetrics = calculateMetrics(defaultParams, initialCurve);
const initialAnomalies = detectAnomalies(initialCurve);

export const useExperimentStore = create<ExperimentState>()(
  persist(
    (set, get) => ({
      params: defaultParams,
      currentCurve: initialCurve,
      currentAnomalies: initialAnomalies,
      currentScore: initialMetrics.score,
      currentYield: initialMetrics.yieldRate,
      currentStability: initialMetrics.stability,
      savedResults: [],
      comparisonIds: [],
      sortField: "score",
      sortOrder: "desc",
      lockedParams: {},
      filterRiskTag: null,

      setParam: (key, value) => {
        const state = get();
        if (state.lockedParams[key]) return;

        let newParams = { ...state.params, [key]: value };

        if (isRatioKey(key)) {
          newParams = normalizeRatios(newParams, state.lockedParams, key);
        }

        const curve = generateCurve(newParams);
        const metrics = calculateMetrics(newParams, curve);
        const anomalies = detectAnomalies(curve);

        set({
          params: newParams,
          currentCurve: curve,
          currentAnomalies: anomalies,
          currentScore: metrics.score,
          currentYield: metrics.yieldRate,
          currentStability: metrics.stability,
        });
      },

      loadPreset: (presetId) => {
        const preset = PRESETS.find((p) => p.id === presetId);
        if (!preset) return;

        const state = get();
        let newParams = { ...preset.params };

        for (const key of Object.keys(state.lockedParams) as (keyof ExperimentParams)[]) {
          if (state.lockedParams[key]) {
            newParams[key] = state.params[key];
          }
        }

        newParams = normalizeRatios(newParams, state.lockedParams);

        const curve = generateCurve(newParams);
        const metrics = calculateMetrics(newParams, curve);
        const anomalies = detectAnomalies(curve);

        set({
          params: newParams,
          currentCurve: curve,
          currentAnomalies: anomalies,
          currentScore: metrics.score,
          currentYield: metrics.yieldRate,
          currentStability: metrics.stability,
        });
      },

      toggleParamLock: (key) => {
        set((state) => ({
          lockedParams: {
            ...state.lockedParams,
            [key]: !state.lockedParams[key],
          },
        }));
      },

      recalculate: () => {
        const state = get();
        const curve = generateCurve(state.params);
        const metrics = calculateMetrics(state.params, curve);
        const anomalies = detectAnomalies(curve);

        set({
          currentCurve: curve,
          currentAnomalies: anomalies,
          currentScore: metrics.score,
          currentYield: metrics.yieldRate,
          currentStability: metrics.stability,
        });
      },

      saveCurrentResult: (options) => {
        const state = get();
        const id = `exp_${Date.now()}`;
        const colorIndex = state.savedResults.length % CURVE_COLORS.length;

        const savedParams = normalizeRatios(state.params, state.lockedParams);

        const needRecalc =
          savedParams.ratioA !== state.params.ratioA ||
          savedParams.ratioB !== state.params.ratioB ||
          savedParams.ratioC !== state.params.ratioC;

        const curve = needRecalc ? generateCurve(savedParams) : state.currentCurve;
        const metrics = needRecalc ? calculateMetrics(savedParams, curve) : null;
        const anomalies = needRecalc ? detectAnomalies(curve) : state.currentAnomalies;

        const curveData = curve.map((p, i) => ({
          ...p,
          isAnomaly: anomalies.includes(i),
          anomalyNote: anomalies.includes(i)
            ? getAnomalyNote(i, curve)
            : undefined,
        }));

        const result: ExperimentResult = {
          id,
          name: options?.name || `实验 ${state.savedResults.length + 1}`,
          params: { ...savedParams },
          curveData,
          score: metrics ? metrics.score : state.currentScore,
          yieldRate: metrics ? metrics.yieldRate : state.currentYield,
          stability: metrics ? metrics.stability : state.currentStability,
          createdAt: Date.now(),
          anomalyPoints: [...anomalies],
          color: CURVE_COLORS[colorIndex],
          batch: options?.batch || "",
          purpose: options?.purpose || "",
          riskTag: options?.riskTag || "medium",
        };

        if (needRecalc) {
          set({
            params: savedParams,
            currentCurve: curve,
            currentAnomalies: anomalies,
            currentScore: metrics ? metrics.score : state.currentScore,
            currentYield: metrics ? metrics.yieldRate : state.currentYield,
            currentStability: metrics ? metrics.stability : state.currentStability,
            savedResults: [...state.savedResults, result],
          });
        } else {
          set({
            savedResults: [...state.savedResults, result],
          });
        }
      },

      deleteResult: (id) => {
        set((state) => ({
          savedResults: state.savedResults.filter((r) => r.id !== id),
          comparisonIds: state.comparisonIds.filter((c) => c !== id),
        }));
      },

      clearResults: () => {
        set({ savedResults: [], comparisonIds: [] });
      },

      toggleComparison: (id) => {
        set((state) => {
          const exists = state.comparisonIds.includes(id);
          return {
            comparisonIds: exists
              ? state.comparisonIds.filter((c) => c !== id)
              : [...state.comparisonIds, id],
          };
        });
      },

      clearComparison: () => {
        set({ comparisonIds: [] });
      },

      setSortField: (field) => {
        set({ sortField: field });
      },

      toggleSortOrder: () => {
        set((state) => ({
          sortOrder: state.sortOrder === "desc" ? "asc" : "desc",
        }));
      },

      toggleAnomalyMarker: (pointIndex) => {
        set((state) => {
          const exists = state.currentAnomalies.includes(pointIndex);
          return {
            currentAnomalies: exists
              ? state.currentAnomalies.filter((i) => i !== pointIndex)
              : [...state.currentAnomalies, pointIndex],
          };
        });
      },

      getSortedResults: () => {
        const state = get();
        return [...state.savedResults].sort((a, b) => {
          const order = state.sortOrder === "desc" ? -1 : 1;
          return (a[state.sortField] - b[state.sortField]) * order;
        });
      },

      setFilterRiskTag: (tag) => {
        set({ filterRiskTag: tag });
      },

      getFilteredResults: () => {
        const state = get();
        const filtered = state.filterRiskTag
          ? state.savedResults.filter((r) => r.riskTag === state.filterRiskTag)
          : state.savedResults;
        return [...filtered].sort((a, b) => {
          const order = state.sortOrder === "desc" ? -1 : 1;
          return (a[state.sortField] - b[state.sortField]) * order;
        });
      },
    }),
    {
      name: "experiment-storage",
      partialize: (state) => ({
        savedResults: state.savedResults,
        comparisonIds: state.comparisonIds,
        filterRiskTag: state.filterRiskTag,
      }),
    }
  )
);
