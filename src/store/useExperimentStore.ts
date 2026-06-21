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
  AnomalyReview,
  QualityEvent,
  EventLevel,
  EventStatus,
  ExperimentChangeOrder,
  ChangeOrderStatus,
  ParamChange,
  ParamChangeType,
  ApprovalRecord,
  ApprovalAction,
  EnergyCostConfig,
  CostCalculationResult,
  CostBudget,
  CostSortField,
  CostSortOrder,
} from "@/types";
import { PRESETS, CURVE_COLORS, PARAM_CONFIGS } from "@/data/presets";
import { generateCurve, calculateMetrics } from "@/utils/curveGenerator";
import { detectAnomalies, getAnomalyNote } from "@/utils/anomalyDetector";
import {
  calculateEnergyCost,
  DEFAULT_ENERGY_COST_CONFIG,
  DEFAULT_COST_BUDGET,
} from "@/utils/costCalculator";

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
  updateAnomalyReview: (pointIndex: number, review: AnomalyReview) => void;
  updateSavedAnomalyReview: (resultId: string, pointIndex: number, review: AnomalyReview) => void;
  getUnreviewedCount: (resultId?: string) => number;
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

  qualityEvents: QualityEvent[];
  eventFilterLevel: EventLevel | null;
  eventFilterStatus: EventStatus | null;
  eventFilterHandler: string;
  eventSearchKeyword: string;
  createQualityEvent: (event: Omit<QualityEvent, "id" | "createdAt" | "resolvedAt" | "escalationCount" | "verified" | "verifiedBy" | "verifiedAt" | "resolutionNote">) => void;
  updateQualityEvent: (id: string, updates: Partial<QualityEvent>) => void;
  resolveQualityEvent: (id: string, resolutionNote: string) => void;
  verifyQualityEvent: (id: string, verifiedBy: string) => void;
  deleteQualityEvent: (id: string) => void;
  escalateOverdueEvents: () => void;
  setEventFilterLevel: (level: EventLevel | null) => void;
  setEventFilterStatus: (status: EventStatus | null) => void;
  setEventFilterHandler: (handler: string) => void;
  setEventSearchKeyword: (keyword: string) => void;
  clearEventFilters: () => void;
  getFilteredQualityEvents: () => QualityEvent[];
  getUniqueHandlers: () => string[];
  getOverdueEventCount: () => number;
  getEventStats: () => { total: number; open: number; inProgress: number; resolved: number; overdue: number; escalated: number };

  changeOrders: ExperimentChangeOrder[];
  currentChangeOrder: ExperimentChangeOrder | null;
  changeOrderFilterStatus: ChangeOrderStatus | null;
  changeOrderFilterPriority: Priority | null;
  changeOrderSearchKeyword: string;

  createChangeOrderFromResult: (resultId: string, createdBy: string) => ExperimentChangeOrder;
  updateChangeOrderParams: (orderId: string, key: keyof ExperimentParams, value: number) => void;
  updateChangeOrderReason: (orderId: string, reason: string) => void;
  updateChangeOrderTempPressureReason: (orderId: string, reason: string) => void;
  submitChangeOrder: (orderId: string, operator: string, note?: string) => void;
  approveChangeOrder: (orderId: string, approver: string, note?: string) => void;
  rejectChangeOrder: (orderId: string, approver: string, note?: string) => void;
  deleteChangeOrder: (orderId: string) => void;
  setCurrentChangeOrder: (order: ExperimentChangeOrder | null) => void;
  setChangeOrderFilterStatus: (status: ChangeOrderStatus | null) => void;
  setChangeOrderFilterPriority: (priority: Priority | null) => void;
  setChangeOrderSearchKeyword: (keyword: string) => void;
  clearChangeOrderFilters: () => void;
  getFilteredChangeOrders: () => ExperimentChangeOrder[];
  getChangeOrderStats: () => { total: number; draft: number; pending: number; approved: number; rejected: number };
  hasTemperaturePressureChange: (order: ExperimentChangeOrder) => boolean;
  hasRatioChange: (order: ExperimentChangeOrder) => boolean;

  energyCostConfig: EnergyCostConfig;
  costBudget: CostBudget;
  costSortField: CostSortField;
  costSortOrder: CostSortOrder;
  costShowOverBudgetOnly: boolean;

  setEnergyCostConfig: (config: Partial<EnergyCostConfig>) => void;
  setCostBudget: (budget: Partial<CostBudget>) => void;
  setCostSortField: (field: CostSortField) => void;
  toggleCostSortOrder: () => void;
  toggleCostShowOverBudgetOnly: (show: boolean) => void;
  calculateResultCost: (result: ExperimentResult) => CostCalculationResult;
  calculateCurrentCost: () => CostCalculationResult;
  getCostSortedResults: () => Array<ExperimentResult & { cost: CostCalculationResult; overBudget: boolean }>;
}

const defaultParams = PRESETS[0].params;
const initialCurveRaw = generateCurve(defaultParams);
const initialMetrics = calculateMetrics(defaultParams, initialCurveRaw);
const initialAnomalies = detectAnomalies(initialCurveRaw);
const initialCurve = initialCurveRaw.map((p, i) => ({
  ...p,
  isAnomaly: initialAnomalies.includes(i),
  anomalyNote: initialAnomalies.includes(i) ? getAnomalyNote(i, initialCurveRaw) : undefined,
}));

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

      qualityEvents: [],
      eventFilterLevel: null,
      eventFilterStatus: null,
      eventFilterHandler: "",
      eventSearchKeyword: "",

      changeOrders: [],
      currentChangeOrder: null,
      changeOrderFilterStatus: null,
      changeOrderFilterPriority: null,
      changeOrderSearchKeyword: "",

      energyCostConfig: { ...DEFAULT_ENERGY_COST_CONFIG },
      costBudget: { ...DEFAULT_COST_BUDGET },
      costSortField: "totalCost",
      costSortOrder: "desc",
      costShowOverBudgetOnly: false,

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

        const mergedCurve = curve.map((p, i) => {
          const existing = state.currentCurve[i];
          const isAnomaly = anomalies.includes(i);
          if (existing?.review) {
            return {
              ...p,
              isAnomaly,
              anomalyNote: isAnomaly ? getAnomalyNote(i, curve) : undefined,
              review: existing.review,
            };
          }
          return {
            ...p,
            isAnomaly,
            anomalyNote: isAnomaly ? getAnomalyNote(i, curve) : undefined,
          };
        });

        set({
          params: newParams,
          currentCurve: mergedCurve,
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

        const mergedCurve = curve.map((p, i) => {
          const existing = state.currentCurve[i];
          const isAnomaly = anomalies.includes(i);
          if (existing?.review) {
            return {
              ...p,
              isAnomaly,
              anomalyNote: isAnomaly ? getAnomalyNote(i, curve) : undefined,
              review: existing.review,
            };
          }
          return {
            ...p,
            isAnomaly,
            anomalyNote: isAnomaly ? getAnomalyNote(i, curve) : undefined,
          };
        });

        set({
          params: newParams,
          currentCurve: mergedCurve,
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

        const mergedCurve = curve.map((p, i) => {
          const existing = state.currentCurve[i];
          const isAnomaly = anomalies.includes(i);
          if (existing?.review) {
            return {
              ...p,
              isAnomaly,
              anomalyNote: isAnomaly ? getAnomalyNote(i, curve) : undefined,
              review: existing.review,
            };
          }
          return {
            ...p,
            isAnomaly,
            anomalyNote: isAnomaly ? getAnomalyNote(i, curve) : undefined,
          };
        });

        set({
          currentCurve: mergedCurve,
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

        const curveData = curve.map((p, i) => {
          const existingPoint = state.currentCurve[i];
          return {
            ...p,
            isAnomaly: anomalies.includes(i),
            anomalyNote: anomalies.includes(i)
              ? getAnomalyNote(i, curve)
              : undefined,
            review: existingPoint?.review,
          };
        });

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
          const newAnomalies = exists
            ? state.currentAnomalies.filter((i) => i !== pointIndex)
            : [...state.currentAnomalies, pointIndex];
          const newCurve = state.currentCurve.map((p, i) => {
            if (i === pointIndex) {
              const newPoint = { ...p, isAnomaly: !exists };
              if (exists) {
                delete newPoint.anomalyNote;
                delete newPoint.review;
              } else {
                newPoint.anomalyNote = getAnomalyNote(pointIndex, state.currentCurve);
              }
              return newPoint;
            }
            return p;
          });
          return {
            currentAnomalies: newAnomalies,
            currentCurve: newCurve,
          };
        });
      },

      updateAnomalyReview: (pointIndex, review) => {
        set((state) => ({
          currentCurve: state.currentCurve.map((p, i) =>
            i === pointIndex ? { ...p, review } : p
          ),
        }));
      },

      updateSavedAnomalyReview: (resultId, pointIndex, review) => {
        set((state) => ({
          savedResults: state.savedResults.map((r) =>
            r.id === resultId
              ? {
                  ...r,
                  curveData: r.curveData.map((p, i) =>
                    i === pointIndex ? { ...p, review } : p
                  ),
                }
              : r
          ),
        }));
      },

      getUnreviewedCount: (resultId) => {
        const state = get();
        if (resultId) {
          const result = state.savedResults.find((r) => r.id === resultId);
          if (!result) return 0;
          return result.curveData.filter(
            (p) => p.isAnomaly && (!p.review || p.review.status === "pending")
          ).length;
        }
        return state.currentCurve.filter(
          (p) => p.isAnomaly && (!p.review || p.review.status === "pending")
        ).length;
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

      createQualityEvent: (event) => {
        const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const newEvent: QualityEvent = {
          ...event,
          id,
          createdAt: Date.now(),
          resolvedAt: null,
          escalationCount: 0,
          verified: false,
          verifiedBy: "",
          verifiedAt: null,
          resolutionNote: "",
        };
        set((state) => ({
          qualityEvents: [newEvent, ...state.qualityEvents],
        }));
      },

      updateQualityEvent: (id, updates) => {
        set((state) => ({
          qualityEvents: state.qualityEvents.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        }));
      },

      resolveQualityEvent: (id, resolutionNote) => {
        set((state) => ({
          qualityEvents: state.qualityEvents.map((e) =>
            e.id === id
              ? { ...e, status: "resolved" as EventStatus, resolvedAt: Date.now(), resolutionNote }
              : e
          ),
        }));
      },

      verifyQualityEvent: (id, verifiedBy) => {
        set((state) => ({
          qualityEvents: state.qualityEvents.map((e) =>
            e.id === id
              ? { ...e, verified: true, verifiedBy, verifiedAt: Date.now(), status: "closed" as EventStatus }
              : e
          ),
        }));
      },

      deleteQualityEvent: (id) => {
        set((state) => ({
          qualityEvents: state.qualityEvents.filter((e) => e.id !== id),
        }));
      },

      escalateOverdueEvents: () => {
        const now = Date.now();
        const LEVEL_ORDER: EventLevel[] = ["minor", "major", "critical", "catastrophic"];
        set((state) => ({
          qualityEvents: state.qualityEvents.map((e) => {
            if ((e.status === "open" || e.status === "in_progress" || e.status === "escalated") && e.deadline && e.deadline < now) {
              const currentIdx = LEVEL_ORDER.indexOf(e.level);
              const nextLevel = currentIdx < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[currentIdx + 1] : e.level;
              return {
                ...e,
                level: nextLevel,
                status: "escalated" as EventStatus,
                escalationCount: e.escalationCount + 1,
              };
            }
            return e;
          }),
        }));
      },

      setEventFilterLevel: (level) => {
        set({ eventFilterLevel: level });
      },

      setEventFilterStatus: (status) => {
        set({ eventFilterStatus: status });
      },

      setEventFilterHandler: (handler) => {
        set({ eventFilterHandler: handler });
      },

      setEventSearchKeyword: (keyword) => {
        set({ eventSearchKeyword: keyword });
      },

      clearEventFilters: () => {
        set({
          eventFilterLevel: null,
          eventFilterStatus: null,
          eventFilterHandler: "",
          eventSearchKeyword: "",
        });
      },

      getFilteredQualityEvents: () => {
        const state = get();
        let events = state.qualityEvents;
        if (state.eventFilterLevel) {
          events = events.filter((e) => e.level === state.eventFilterLevel);
        }
        if (state.eventFilterStatus) {
          events = events.filter((e) => e.status === state.eventFilterStatus);
        }
        if (state.eventFilterHandler.trim()) {
          const handler = state.eventFilterHandler.trim().toLowerCase();
          events = events.filter((e) => e.handler.toLowerCase().includes(handler));
        }
        if (state.eventSearchKeyword.trim()) {
          const keyword = state.eventSearchKeyword.trim().toLowerCase();
          events = events.filter((e) =>
            e.title.toLowerCase().includes(keyword) ||
            e.reason.toLowerCase().includes(keyword) ||
            e.handler.toLowerCase().includes(keyword) ||
            e.sourceResultName.toLowerCase().includes(keyword) ||
            e.anomalyNote.toLowerCase().includes(keyword)
          );
        }
        return events;
      },

      getUniqueHandlers: () => {
        const state = get();
        const handlers = new Set<string>();
        state.qualityEvents.forEach((e) => {
          if (e.handler.trim()) handlers.add(e.handler.trim());
        });
        return Array.from(handlers).sort();
      },

      getOverdueEventCount: () => {
        const state = get();
        const now = Date.now();
        return state.qualityEvents.filter(
          (e) => (e.status === "open" || e.status === "in_progress" || e.status === "escalated") && e.deadline && e.deadline < now
        ).length;
      },

      getEventStats: () => {
        const state = get();
        const now = Date.now();
        const events = state.qualityEvents;
        return {
          total: events.length,
          open: events.filter((e) => e.status === "open").length,
          inProgress: events.filter((e) => e.status === "in_progress").length,
          resolved: events.filter((e) => e.status === "resolved" || e.status === "closed").length,
          overdue: events.filter(
            (e) => (e.status === "open" || e.status === "in_progress" || e.status === "escalated") && e.deadline && e.deadline < now
          ).length,
          escalated: events.filter((e) => e.status === "escalated").length,
        };
      },

      hasTemperaturePressureChange: (order) => {
        return order.paramChanges.some(
          (c) => c.changeType === "temperature" || c.changeType === "pressure"
        );
      },

      hasRatioChange: (order) => {
        return order.paramChanges.some((c) => c.changeType === "ratio");
      },

      createChangeOrderFromResult: (resultId, createdBy) => {
        const state = get();
        const result = state.savedResults.find((r) => r.id === resultId);
        if (!result) throw new Error("Result not found");

        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 10);
        const id = `co_${timestamp}_${randomStr}`;
        const date = new Date();
        const orderNo = `CO${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;

        const auditRecord: ApprovalRecord = {
          id: `ar_${timestamp}_${randomStr}`,
          action: "submit" as ApprovalAction,
          operator: createdBy,
          timestamp,
          note: "创建变更单",
        };

        const order: ExperimentChangeOrder = {
          id,
          orderNo,
          sourceResultId: resultId,
          sourceResultName: result.name,
          originalParams: { ...result.params },
          modifiedParams: { ...result.params },
          paramChanges: [],
          changeReason: "",
          temperaturePressureChangeReason: "",
          status: "draft" as ChangeOrderStatus,
          createdBy,
          createdAt: Date.now(),
          approver: "",
          approvalNote: "",
          auditTrail: [auditRecord],
          priority: "normal" as Priority,
        };

        set((state) => ({
          changeOrders: [...state.changeOrders, order],
          currentChangeOrder: order,
        }));

        return order;
      },

      updateChangeOrderParams: (orderId, key, value) => {
        const state = get();
        const order = state.changeOrders.find((o) => o.id === orderId);
        if (!order || order.status !== "draft") return;

        const paramConfig = PARAM_CONFIGS.find((c) => c.key === key);
        if (!paramConfig) return;

        let newModifiedParams = { ...order.modifiedParams, [key]: value };

        if (isRatioKey(key)) {
          const locked: Partial<Record<keyof ExperimentParams, boolean>> = {};
          newModifiedParams = normalizeRatios(newModifiedParams, locked, key);
        }

        const paramChanges: ParamChange[] = [];
        (Object.keys(newModifiedParams) as (keyof ExperimentParams)[]).forEach((k) => {
          const config = PARAM_CONFIGS.find((c) => c.key === k);
          if (!config) return;
          const oldVal = order.originalParams[k];
          const newVal = newModifiedParams[k];
          if (Math.abs(oldVal - newVal) > 0.01) {
            let changeType: ParamChangeType = "reactionTime";
            if (k === "temperature") changeType = "temperature";
            else if (k === "pressure") changeType = "pressure";
            else if (isRatioKey(k)) changeType = "ratio";
            paramChanges.push({
              key: k,
              label: config.label,
              oldValue: oldVal,
              newValue: newVal,
              unit: config.unit,
              changeType,
            });
          }
        });

        const hasTempPressureChange = paramChanges.some(
          (c) => c.changeType === "temperature" || c.changeType === "pressure"
        );

        set((state) => ({
          changeOrders: state.changeOrders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  modifiedParams: newModifiedParams,
                  paramChanges,
                  temperaturePressureChangeReason: hasTempPressureChange
                    ? o.temperaturePressureChangeReason
                    : "",
                }
              : o
          ),
          currentChangeOrder:
            state.currentChangeOrder?.id === orderId
              ? {
                  ...state.currentChangeOrder,
                  modifiedParams: newModifiedParams,
                  paramChanges,
                  temperaturePressureChangeReason: hasTempPressureChange
                    ? state.currentChangeOrder.temperaturePressureChangeReason
                    : "",
                }
              : state.currentChangeOrder,
        }));
      },

      updateChangeOrderReason: (orderId, reason) => {
        set((state) => ({
          changeOrders: state.changeOrders.map((o) =>
            o.id === orderId ? { ...o, changeReason: reason } : o
          ),
          currentChangeOrder:
            state.currentChangeOrder?.id === orderId
              ? { ...state.currentChangeOrder, changeReason: reason }
              : state.currentChangeOrder,
        }));
      },

      updateChangeOrderTempPressureReason: (orderId, reason) => {
        set((state) => ({
          changeOrders: state.changeOrders.map((o) =>
            o.id === orderId
              ? { ...o, temperaturePressureChangeReason: reason }
              : o
          ),
          currentChangeOrder:
            state.currentChangeOrder?.id === orderId
              ? { ...state.currentChangeOrder, temperaturePressureChangeReason: reason }
              : state.currentChangeOrder,
        }));
      },

      submitChangeOrder: (orderId, operator, note) => {
        const state = get();
        const order = state.changeOrders.find((o) => o.id === orderId);
        if (!order || order.status !== "draft") return;

        const hasParamChanges = order.paramChanges.length > 0;
        const hasChangeReason = order.changeReason.trim().length > 0;
        const hasOperator = operator.trim().length > 0;

        const hasTempPressureChange = state.hasTemperaturePressureChange(order);
        const hasRatioChange = state.hasRatioChange(order);
        const needsTempPressureReason = hasTempPressureChange || hasRatioChange;
        const hasTempPressureReason = !needsTempPressureReason || order.temperaturePressureChangeReason.trim().length > 0;

        if (!hasParamChanges || !hasChangeReason || !hasOperator || !hasTempPressureReason) {
          return;
        }

        const auditRecord: ApprovalRecord = {
          id: `ar_${Date.now()}`,
          action: "submit" as ApprovalAction,
          operator,
          timestamp: Date.now(),
          note: note || "提交审批",
        };

        set((state) => ({
          changeOrders: state.changeOrders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: "pending" as ChangeOrderStatus,
                  auditTrail: [...o.auditTrail, auditRecord],
                }
              : o
          ),
          currentChangeOrder:
            state.currentChangeOrder?.id === orderId
              ? {
                  ...state.currentChangeOrder,
                  status: "pending" as ChangeOrderStatus,
                  auditTrail: [...state.currentChangeOrder.auditTrail, auditRecord],
                }
              : state.currentChangeOrder,
        }));
      },

      approveChangeOrder: (orderId, approver, note) => {
        const state = get();
        const order = state.changeOrders.find((o) => o.id === orderId);
        if (!order || order.status !== "pending") return;

        const hasApprover = approver.trim().length > 0;
        if (!hasApprover) return;

        const auditRecord: ApprovalRecord = {
          id: `ar_${Date.now()}`,
          action: "approve" as ApprovalAction,
          operator: approver,
          timestamp: Date.now(),
          note: note || "审批通过",
        };

        set((state) => ({
          changeOrders: state.changeOrders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: "approved" as ChangeOrderStatus,
                  approver,
                  approvedAt: Date.now(),
                  approvalNote: note || o.approvalNote,
                  auditTrail: [...o.auditTrail, auditRecord],
                }
              : o
          ),
          currentChangeOrder:
            state.currentChangeOrder?.id === orderId
              ? {
                  ...state.currentChangeOrder,
                  status: "approved" as ChangeOrderStatus,
                  approver,
                  approvedAt: Date.now(),
                  approvalNote: note || state.currentChangeOrder.approvalNote,
                  auditTrail: [...state.currentChangeOrder.auditTrail, auditRecord],
                }
              : state.currentChangeOrder,
        }));
      },

      rejectChangeOrder: (orderId, approver, note) => {
        const state = get();
        const order = state.changeOrders.find((o) => o.id === orderId);
        if (!order || order.status !== "pending") return;

        const hasApprover = approver.trim().length > 0;
        const hasNote = note && note.trim().length > 0;
        if (!hasApprover || !hasNote) return;

        const auditRecord: ApprovalRecord = {
          id: `ar_${Date.now()}`,
          action: "reject" as ApprovalAction,
          operator: approver,
          timestamp: Date.now(),
          note: note || "审批驳回",
        };

        set((state) => ({
          changeOrders: state.changeOrders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: "rejected" as ChangeOrderStatus,
                  approver,
                  approvalNote: note || o.approvalNote,
                  auditTrail: [...o.auditTrail, auditRecord],
                }
              : o
          ),
          currentChangeOrder:
            state.currentChangeOrder?.id === orderId
              ? {
                  ...state.currentChangeOrder,
                  status: "rejected" as ChangeOrderStatus,
                  approver,
                  approvalNote: note || state.currentChangeOrder.approvalNote,
                  auditTrail: [...state.currentChangeOrder.auditTrail, auditRecord],
                }
              : state.currentChangeOrder,
        }));
      },

      deleteChangeOrder: (orderId) => {
        set((state) => ({
          changeOrders: state.changeOrders.filter((o) => o.id !== orderId),
          currentChangeOrder:
            state.currentChangeOrder?.id === orderId
              ? null
              : state.currentChangeOrder,
        }));
      },

      setCurrentChangeOrder: (order) => {
        set({ currentChangeOrder: order });
      },

      setChangeOrderFilterStatus: (status) => {
        set({ changeOrderFilterStatus: status });
      },

      setChangeOrderFilterPriority: (priority) => {
        set({ changeOrderFilterPriority: priority });
      },

      setChangeOrderSearchKeyword: (keyword) => {
        set({ changeOrderSearchKeyword: keyword });
      },

      clearChangeOrderFilters: () => {
        set({
          changeOrderFilterStatus: null,
          changeOrderFilterPriority: null,
          changeOrderSearchKeyword: "",
        });
      },

      getFilteredChangeOrders: () => {
        const state = get();
        let orders = state.changeOrders;

        if (state.changeOrderFilterStatus) {
          orders = orders.filter((o) => o.status === state.changeOrderFilterStatus);
        }

        if (state.changeOrderFilterPriority) {
          orders = orders.filter((o) => o.priority === state.changeOrderFilterPriority);
        }

        const keyword = state.changeOrderSearchKeyword.trim().toLowerCase();
        if (keyword) {
          orders = orders.filter((o) =>
            o.orderNo.toLowerCase().includes(keyword) ||
            o.sourceResultName.toLowerCase().includes(keyword) ||
            o.createdBy.toLowerCase().includes(keyword) ||
            o.changeReason.toLowerCase().includes(keyword)
          );
        }

        return [...orders].sort((a, b) => b.createdAt - a.createdAt);
      },

      getChangeOrderStats: () => {
        const state = get();
        const orders = state.changeOrders;
        return {
          total: orders.length,
          draft: orders.filter((o) => o.status === "draft").length,
          pending: orders.filter((o) => o.status === "pending").length,
          approved: orders.filter((o) => o.status === "approved").length,
          rejected: orders.filter((o) => o.status === "rejected").length,
        };
      },

      setEnergyCostConfig: (config) => {
        set((state) => ({
          energyCostConfig: { ...state.energyCostConfig, ...config },
        }));
      },

      setCostBudget: (budget) => {
        set((state) => ({
          costBudget: { ...state.costBudget, ...budget },
        }));
      },

      setCostSortField: (field) => {
        set({ costSortField: field });
      },

      toggleCostSortOrder: () => {
        set((state) => ({
          costSortOrder: state.costSortOrder === "desc" ? "asc" : "desc",
        }));
      },

      toggleCostShowOverBudgetOnly: (show) => {
        set({ costShowOverBudgetOnly: show });
      },

      calculateResultCost: (result) => {
        const state = get();
        return calculateEnergyCost(result.params, state.energyCostConfig);
      },

      calculateCurrentCost: () => {
        const state = get();
        return calculateEnergyCost(state.params, state.energyCostConfig);
      },

      getCostSortedResults: () => {
        const state = get();
        const results = state.savedResults;
        const budget = state.costBudget;
        const config = state.energyCostConfig;

        const withCost = results.map((r) => {
          const cost = calculateEnergyCost(r.params, config);
          const overBudget =
            cost.electricityCost > budget.electricityBudget ||
            cost.carbonEmission > budget.carbonBudget ||
            cost.totalCost > budget.totalBudget;
          return { ...r, cost, overBudget };
        });

        let filtered = withCost;
        if (state.costShowOverBudgetOnly) {
          filtered = withCost.filter((r) => r.overBudget);
        }

        const order = state.costSortOrder === "desc" ? -1 : 1;
        const sortField = state.costSortField;

        return [...filtered].sort((a, b) => {
          if (sortField === "score") {
            return (a.score - b.score) * order;
          }
          if (sortField === "electricityCost") {
            return (a.cost.electricityCost - b.cost.electricityCost) * order;
          }
          if (sortField === "carbonEmission") {
            return (a.cost.carbonEmission - b.cost.carbonEmission) * order;
          }
          return (a.cost.totalCost - b.cost.totalCost) * order;
        });
      },
    }),
    {
      name: "experiment-storage",
      version: 8,
      migrate: (persistedState, version) => {
        const state = persistedState as {
          savedResults?: ExperimentResult[];
          comparisonIds?: string[];
          filterRiskTag?: RiskTag | null;
          filterApprovalStatus?: ApprovalStatus | null;
          filterBatches?: string[];
          filterPurposes?: string[];
          searchKeyword?: string;
          currentCurve?: CurvePoint[];
          currentAnomalies?: number[];
          changeOrders?: ExperimentChangeOrder[];
          currentChangeOrder?: ExperimentChangeOrder | null;
          changeOrderFilterStatus?: ChangeOrderStatus | null;
          changeOrderFilterPriority?: Priority | null;
          changeOrderSearchKeyword?: string;
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
        if (version < 5 && state.savedResults) {
          state.savedResults = state.savedResults.map((r) => ({
            ...r,
            curveData: r.curveData.map((p, i) => {
              const isAnomaly = r.anomalyPoints.includes(i);
              const existingReview = (p as { review?: unknown }).review as AnomalyReview | undefined;
              return {
                ...p,
                isAnomaly,
                anomalyNote: isAnomaly ? getAnomalyNote(i, r.curveData) : undefined,
                review: existingReview,
              };
            }),
          }));
        }
        if (version < 6) {
          (state as Record<string, unknown>).qualityEvents = [];
          (state as Record<string, unknown>).eventFilterLevel = null;
          (state as Record<string, unknown>).eventFilterStatus = null;
          (state as Record<string, unknown>).eventFilterHandler = "";
          (state as Record<string, unknown>).eventSearchKeyword = "";
        }
        if (version < 7) {
          (state as Record<string, unknown>).changeOrders = [];
          (state as Record<string, unknown>).currentChangeOrder = null;
          (state as Record<string, unknown>).changeOrderFilterStatus = null;
          (state as Record<string, unknown>).changeOrderFilterPriority = null;
          (state as Record<string, unknown>).changeOrderSearchKeyword = "";
        }
        if (version < 8) {
          (state as Record<string, unknown>).energyCostConfig = { ...DEFAULT_ENERGY_COST_CONFIG };
          (state as Record<string, unknown>).costBudget = { ...DEFAULT_COST_BUDGET };
          (state as Record<string, unknown>).costSortField = "totalCost";
          (state as Record<string, unknown>).costSortOrder = "desc";
          (state as Record<string, unknown>).costShowOverBudgetOnly = false;
        }
        return state as {
          savedResults: ExperimentResult[];
          comparisonIds: string[];
          filterRiskTag: RiskTag | null;
          filterApprovalStatus: ApprovalStatus | null;
          filterBatches: string[];
          filterPurposes: string[];
          searchKeyword: string;
          currentCurve: CurvePoint[];
          currentAnomalies: number[];
          qualityEvents: QualityEvent[];
          eventFilterLevel: EventLevel | null;
          eventFilterStatus: EventStatus | null;
          eventFilterHandler: string;
          eventSearchKeyword: string;
          changeOrders: ExperimentChangeOrder[];
          currentChangeOrder: ExperimentChangeOrder | null;
          changeOrderFilterStatus: ChangeOrderStatus | null;
          changeOrderFilterPriority: Priority | null;
          changeOrderSearchKeyword: string;
          energyCostConfig: EnergyCostConfig;
          costBudget: CostBudget;
          costSortField: CostSortField;
          costSortOrder: CostSortOrder;
          costShowOverBudgetOnly: boolean;
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
        currentCurve: state.currentCurve,
        currentAnomalies: state.currentAnomalies,
        qualityEvents: state.qualityEvents,
        eventFilterLevel: state.eventFilterLevel,
        eventFilterStatus: state.eventFilterStatus,
        eventFilterHandler: state.eventFilterHandler,
        eventSearchKeyword: state.eventSearchKeyword,
        changeOrders: state.changeOrders,
        currentChangeOrder: state.currentChangeOrder,
        changeOrderFilterStatus: state.changeOrderFilterStatus,
        changeOrderFilterPriority: state.changeOrderFilterPriority,
        changeOrderSearchKeyword: state.changeOrderSearchKeyword,
        energyCostConfig: state.energyCostConfig,
        costBudget: state.costBudget,
        costSortField: state.costSortField,
        costSortOrder: state.costSortOrder,
        costShowOverBudgetOnly: state.costShowOverBudgetOnly,
      }),
    }
  )
);
