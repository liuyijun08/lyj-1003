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

export interface ParamConfig {
  key: keyof ExperimentParams;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  color: string;
}
