export interface ExperimentParams {
  temperature: number;
  pressure: number;
  reactionTime: number;
  ratioA: number;
  ratioB: number;
  ratioC: number;
}

export type AnomalyReviewStatus = "pending" | "confirmed" | "rejected" | "fixed";

export interface AnomalyReview {
  status: AnomalyReviewStatus;
  reason: string;
  reviewer: string;
  reviewedAt: number;
}

export interface CurvePoint {
  x: number;
  y: number;
  isAnomaly?: boolean;
  anomalyNote?: string;
  review?: AnomalyReview;
}

export type RiskTag = "low" | "medium" | "high" | "critical";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type Priority = "low" | "normal" | "high" | "urgent";

export interface ExperimentResult {
  id: string;
  name: string;
  params: ExperimentParams;
  curveData: CurvePoint[];
  score: number;
  yieldRate: number;
  stability: number;
  createdAt: number;
  anomalyPoints: number[];
  color: string;
  batch: string;
  purpose: string;
  riskTag: RiskTag;
  approvalStatus: ApprovalStatus;
  approvalNote: string;
  approvedAt?: number;
  approver: string;
  deadline: number | null;
  priority: Priority;
}

export interface Preset {
  id: string;
  name: string;
  category: string;
  params: ExperimentParams;
}

export type SortField = "score" | "yieldRate" | "stability" | "createdAt" | "priority" | "deadline";
export type SortOrder = "asc" | "desc";

export type EventLevel = "minor" | "major" | "critical" | "catastrophic";

export type EventStatus = "open" | "in_progress" | "resolved" | "closed" | "escalated";

export interface QualityEvent {
  id: string;
  title: string;
  sourceResultId: string | null;
  sourceResultName: string;
  pointIndex: number;
  pointX: number;
  pointY: number;
  anomalyNote: string;
  level: EventLevel;
  reason: string;
  handler: string;
  status: EventStatus;
  createdAt: number;
  deadline: number | null;
  resolvedAt: number | null;
  escalationCount: number;
  resolutionNote: string;
  verified: boolean;
  verifiedBy: string;
  verifiedAt: number | null;
}

export interface ParamConfig {
  key: keyof ExperimentParams;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  color: string;
}

export type ChangeOrderStatus = "draft" | "pending" | "approved" | "rejected";

export type ParamChangeType = "temperature" | "pressure" | "ratio" | "reactionTime";

export interface ParamChange {
  key: keyof ExperimentParams;
  label: string;
  oldValue: number;
  newValue: number;
  unit: string;
  changeType: ParamChangeType;
}

export type ApprovalAction = "submit" | "approve" | "reject" | "modify";

export interface ApprovalRecord {
  id: string;
  action: ApprovalAction;
  operator: string;
  timestamp: number;
  note: string;
}

export interface ExperimentChangeOrder {
  id: string;
  orderNo: string;
  sourceResultId: string;
  sourceResultName: string;
  originalParams: ExperimentParams;
  modifiedParams: ExperimentParams;
  paramChanges: ParamChange[];
  changeReason: string;
  temperaturePressureChangeReason: string;
  status: ChangeOrderStatus;
  createdBy: string;
  createdAt: number;
  approver: string;
  approvedAt?: number;
  approvalNote: string;
  auditTrail: ApprovalRecord[];
  priority: Priority;
}

export interface EnergyCostConfig {
  electricityPrice: number;
  carbonFactor: number;
  basePower: number;
  tempPowerCoefficient: number;
  pressurePowerCoefficient: number;
}

export interface CostCalculationResult {
  electricityConsumption: number;
  electricityCost: number;
  carbonEmission: number;
  carbonCost: number;
  totalCost: number;
}

export interface CostBudget {
  electricityBudget: number;
  carbonBudget: number;
  totalBudget: number;
}

export type CostSortField = "electricityCost" | "carbonEmission" | "totalCost" | "score";
export type CostSortOrder = "asc" | "desc";
