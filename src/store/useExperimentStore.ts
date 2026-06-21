import { create } from "zustand";
import type {
  ExperimentParams,
  ExperimentResult,
  CurvePoint,
  SortField,
  SortOrder,
} from "@/types";
import { PRESETS, CURVE_COLORS, PARAM_CONFIGS } from "@/data/presets";
import { generateCurve, calculateMetrics } from "@/utils/curveGenerator";
import { detectAnomalies, getAnomalyNote } from "@/utils/anomalyDetector";

const RATIO_KEYS: (keyof ExperimentParams)[] = ["ratioA", "ratioB", "ratioC"];

function isRatioKey(key: keyof ExperimentParams): boolean {
  return RATIO_KEYS.includes(key);
}

function clampRatioParams(
  params: ExperimentParams,
  locked: Partial<Record<keyof ExperimentParams, boolean>>,
  changedKey: keyof ExperimentParams
): ExperimentParams {
  const result = { ...params };
  const totalRatio = RATIO_KEYS.reduce((sum, k) => sum + result[k], 0);

  if (totalRatio <= 100) return result;

  const unlockedKeys = RATIO_KEYS.filter((k) => k !== changedKey && !locked[k]);

  if (unlockedKeys.length === 0) {
    const ratioConfigs = PARAM_CONFIGS.filter((c) => c.key === changedKey)[0];
    const maxAllowed = 100 - RATIO_KEYS.filter((k) => k !== changedKey).reduce((sum, k) => sum + result[k], 0);
    result[changedKey] = Math.max(ratioConfigs.min, Math.min(ratioConfigs.max, maxAllowed));
    return result;
  }

  const lockedTotal = RATIO_KEYS.filter((k) => k === changedKey || locked[k]).reduce(
    (sum, k) => sum + result[k],
    0
  );
  const remaining = Math.max(0, 100 - lockedTotal);
  const currentUnlockedTotal = unlockedKeys.reduce((sum, k) => sum + result[k], 0);

  if (currentUnlockedTotal > 0 && remaining > 0) {
    const scale = remaining / currentUnlockedTotal;
    for (const key of unlockedKeys) {
      const config = PARAM_CONFIGS.find((c) => c.key === key);
      if (config) {
        result[key] = Math.max(config.min, result[key] * scale);
      }
    }
  } else if (remaining <= 0) {
    for (const key of unlockedKeys) {
      const config = PARAM_CONFIGS.find((c) => c.key === key);
      if (config) {
        result[key] = config.min;
      }
    }
  }

  const finalTotal = RATIO_KEYS.reduce((sum, k) => sum + result[k], 0);
  if (finalTotal > 100 && unlockedKeys.length > 0) {
    const excess = finalTotal - 100;
    const lastKey = unlockedKeys[unlockedKeys.length - 1];
    const config = PARAM_CONFIGS.find((c) => c.key === lastKey);
    if (config) {
      result[lastKey] = Math.max(config.min, result[lastKey] - excess);
    }
  }

  return result;
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

  setParam: (key: keyof ExperimentParams, value: number) => void;
  loadPreset: (presetId: string) => void;
  toggleParamLock: (key: keyof ExperimentParams) => void;
  recalculate: () => void;
  saveCurrentResult: (name?: string) => void;
  deleteResult: (id: string) => void;
  clearResults: () => void;
  toggleComparison: (id: string) => void;
  clearComparison: () => void;
  setSortField: (field: SortField) => void;
  toggleSortOrder: () => void;
  toggleAnomalyMarker: (pointIndex: number) => void;
  getSortedResults: () => ExperimentResult[];
}

const defaultParams = PRESETS[0].params;
const initialCurve = generateCurve(defaultParams);
const initialMetrics = calculateMetrics(defaultParams, initialCurve);
const initialAnomalies = detectAnomalies(initialCurve);

export const useExperimentStore = create<ExperimentState>((set, get) => ({
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

  setParam: (key, value) => {
    const state = get();
    if (state.lockedParams[key]) return;

    let newParams = { ...state.params, [key]: value };

    if (isRatioKey(key)) {
      newParams = clampRatioParams(newParams, state.lockedParams, key);
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

    const ratioTotal = RATIO_KEYS.reduce((sum, k) => sum + newParams[k], 0);
    if (ratioTotal > 100) {
      newParams = clampRatioParams(newParams, state.lockedParams, "ratioA");
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

  saveCurrentResult: (name) => {
    const state = get();
    const id = `exp_${Date.now()}`;
    const colorIndex = state.savedResults.length % CURVE_COLORS.length;

    const curveData = state.currentCurve.map((p, i) => ({
      ...p,
      isAnomaly: state.currentAnomalies.includes(i),
      anomalyNote: state.currentAnomalies.includes(i)
        ? getAnomalyNote(i, state.currentCurve)
        : undefined,
    }));

    const result: ExperimentResult = {
      id,
      name: name || `实验 ${state.savedResults.length + 1}`,
      params: { ...state.params },
      curveData,
      score: state.currentScore,
      yieldRate: state.currentYield,
      stability: state.currentStability,
      createdAt: Date.now(),
      anomalyPoints: [...state.currentAnomalies],
      color: CURVE_COLORS[colorIndex],
    };

    set({
      savedResults: [...state.savedResults, result],
    });
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
}));
