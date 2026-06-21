import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ExperimentParams,
  ExperimentResult,
  CurvePoint,
  SortField,
  SortOrder,
  RiskTag,
  ApprovalStatus,
  Priority,
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
  approver?: string;
  deadline?: number | null;
  priority?: Priority;
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
  filterApprovalStatus: ApprovalStatus | null;
  filterBatches: string[];
  filterPurposes: string[];
  searchKeyword: string;

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
  setFilterApprovalStatus: (status: ApprovalStatus | null) => void;
  setSearchKeyword: (keyword: string) => void;
  toggleFilterBatch: (batch: string) => void;
  toggleFilterPurpose: (purpose: string) => void;
  clearAllFilters: () => void;
  getFilteredResults: () => ExperimentResult[];
  getUniqueBatches: () => string[];
  getUniquePurposes: () => string[];
  approveResult: (id: string, note?: string) => void;
  rejectResult: (id: string, note?: string) => void;
  updateResultMeta: (
    id: string,
    meta: Partial<Pick<ExperimentResult, "approver" | "deadline" | "priority">>
  ) => void;
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
      filterApprovalStatus: null,
      filterBatches: [],
      filterPurposes: [],
      searchKeyword: "",

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
          approvalStatus: "pending",
          approvalNote: "",
          approver: options?.approver || "",
          deadline: options?.deadline ?? null,
          priority: options?.priority || "normal",
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
        const PRIORITY_RANK: Record<Priority, number> = {
          urgent: 4,
          high: 3,
          normal: 2,
          low: 1,
        };
        return [...state.savedResults].sort((a, b) => {
          const order = state.sortOrder === "desc" ? -1 : 1;
          if (state.sortField === "priority") {
            return (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]) * order;
          }
          if (state.sortField === "deadline") {
            const ad = a.deadline ?? Number.MAX_SAFE_INTEGER;
            const bd = b.deadline ?? Number.MAX_SAFE_INTEGER;
            return (ad - bd) * order;
          }
          return ((a[state.sortField] as number) - (b[state.sortField] as number)) * order;
        });
      },

      setFilterRiskTag: (tag) => {
        set({ filterRiskTag: tag });
      },

      setFilterApprovalStatus: (status) => {
        set({ filterApprovalStatus: status });
      },

      setSearchKeyword: (keyword) => {
        set({ searchKeyword: keyword });
      },

      toggleFilterBatch: (batch) => {
        set((state) => {
          const exists = state.filterBatches.includes(batch);
          return {
            filterBatches: exists
              ? state.filterBatches.filter((b) => b !== batch)
              : [...state.filterBatches, batch],
          };
        });
      },

      toggleFilterPurpose: (purpose) => {
        set((state) => {
          const exists = state.filterPurposes.includes(purpose);
          return {
            filterPurposes: exists
              ? state.filterPurposes.filter((p) => p !== purpose)
              : [...state.filterPurposes, purpose],
          };
        });
      },

      clearAllFilters: () => {
        set({
          filterRiskTag: null,
          filterApprovalStatus: null,
          filterBatches: [],
          filterPurposes: [],
          searchKeyword: "",
        });
      },

      getUniqueBatches: () => {
        const state = get();
        const batches = new Set<string>();
        state.savedResults.forEach((r) => {
          if (r.batch && r.batch.trim()) {
            batches.add(r.batch.trim());
          }
        });
        return Array.from(batches).sort();
      },

      getUniquePurposes: () => {
        const state = get();
        const purposes = new Set<string>();
        state.savedResults.forEach((r) => {
          if (r.purpose && r.purpose.trim()) {
            purposes.add(r.purpose.trim());
          }
        });
        return Array.from(purposes).sort();
      },

      getFilteredResults: () => {
        const state = get();
        const keyword = state.searchKeyword.trim().toLowerCase();
        const PRIORITY_RANK: Record<Priority, number> = {
          urgent: 4,
          high: 3,
          normal: 2,
          low: 1,
        };

        let results = state.savedResults;

        if (state.filterBatches.length > 0) {
          results = results.filter((r) => state.filterBatches.includes(r.batch || ""));
        }

        if (state.filterPurposes.length > 0) {
          results = results.filter((r) => state.filterPurposes.includes(r.purpose || ""));
        }

        if (state.filterRiskTag) {
          results = results.filter((r) => r.riskTag === state.filterRiskTag);
        }

        if (state.filterApprovalStatus) {
          results = results.filter((r) => r.approvalStatus === state.filterApprovalStatus);
        }

        if (keyword) {
          results = results.filter((r) => {
            const nameMatch = r.name.toLowerCase().includes(keyword);
            const batchMatch = (r.batch || "").toLowerCase().includes(keyword);
            const purposeMatch = (r.purpose || "").toLowerCase().includes(keyword);
            return nameMatch || batchMatch || purposeMatch;
          });
        }

        return [...results].sort((a, b) => {
          const order = state.sortOrder === "desc" ? -1 : 1;
          if (state.sortField === "priority") {
            return (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]) * order;
          }
          if (state.sortField === "deadline") {
            const ad = a.deadline ?? Number.MAX_SAFE_INTEGER;
            const bd = b.deadline ?? Number.MAX_SAFE_INTEGER;
            return (ad - bd) * order;
          }
          return ((a[state.sortField] as number) - (b[state.sortField] as number)) * order;
        });
      },

      approveResult: (id, note) => {
        set((state) => ({
          savedResults: state.savedResults.map((r) =>
            r.id === id
              ? {
                  ...r,
                  approvalStatus: "approved",
                  approvalNote: note || r.approvalNote,
                  approvedAt: Date.now(),
                }
              : r
          ),
        }));
      },

      rejectResult: (id, note) => {
        set((state) => ({
          savedResults: state.savedResults.map((r) =>
            r.id === id
              ? {
                  ...r,
                  approvalStatus: "rejected",
                  approvalNote: note || r.approvalNote,
                }
              : r
          ),
        }));
      },

      updateResultMeta: (id, meta) => {
        set((state) => ({
          savedResults: state.savedResults.map((r) =>
            r.id === id
              ? {
                  ...r,
                  approver: meta.approver ?? r.approver,
                  deadline: "deadline" in meta ? meta.deadline ?? null : r.deadline,
                  priority: meta.priority ?? r.priority,
                }
              : r
          ),
        }));
      },
    }),
    {
      name: "experiment-storage",
      version: 4,
      migrate: (persistedState, version) => {
        const state = persistedState as {
          savedResults?: ExperimentResult[];
          comparisonIds?: string[];
          filterRiskTag?: RiskTag | null;
          filterApprovalStatus?: ApprovalStatus | null;
          filterBatches?: string[];
          filterPurposes?: string[];
          searchKeyword?: string;
        };
        if (version < 1 && state.savedResults) {
          state.savedResults = state.savedResults.map((r) => ({
            ...r,
            batch: (r as { batch?: string }).batch || "",
            purpose: (r as { purpose?: string }).purpose || "",
            riskTag: (r as { riskTag?: RiskTag }).riskTag || "medium",
          }));
        }
        if (version < 2 && state.savedResults) {
          state.savedResults = state.savedResults.map((r) => ({
            ...r,
            approvalStatus: (r as { approvalStatus?: ApprovalStatus }).approvalStatus || "pending",
            approvalNote: (r as { approvalNote?: string }).approvalNote || "",
          }));
          state.filterApprovalStatus = null;
        }
        if (version < 3) {
          state.filterBatches = [];
          state.filterPurposes = [];
        }
        if (version < 4 && state.savedResults) {
          state.savedResults = state.savedResults.map((r) => ({
            ...r,
            approver: (r as { approver?: string }).approver || "",
            deadline: (r as { deadline?: number | null }).deadline ?? null,
            priority: (r as { priority?: Priority }).priority || "normal",
          }));
        }
        return state as {
          savedResults: ExperimentResult[];
          comparisonIds: string[];
          filterRiskTag: RiskTag | null;
          filterApprovalStatus: ApprovalStatus | null;
          filterBatches: string[];
          filterPurposes: string[];
          searchKeyword: string;
        };
      },
      partialize: (state) => ({
        savedResults: state.savedResults,
        comparisonIds: state.comparisonIds,
        filterRiskTag: state.filterRiskTag,
        filterApprovalStatus: state.filterApprovalStatus,
        filterBatches: state.filterBatches,
        filterPurposes: state.filterPurposes,
        searchKeyword: state.searchKeyword,
      }),
    }
  )
);
