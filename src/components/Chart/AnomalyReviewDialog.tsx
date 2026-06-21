import { useState, useEffect } from "react";
import { X, AlertTriangle, User, FileText, CheckCircle, XCircle, Wrench, Clock } from "lucide-react";
import type { CurvePoint, AnomalyReviewStatus, AnomalyReview } from "@/types";
import { useExperimentStore } from "@/store/useExperimentStore";

interface AnomalyReviewDialogProps {
  open: boolean;
  point: CurvePoint | null;
  pointIndex: number;
  resultId?: string;
  onClose: () => void;
}

const REVIEW_STATUS_OPTIONS: {
  key: AnomalyReviewStatus;
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
}[] = [
  { key: "pending", label: "待复核", color: "text-lab-amber", bg: "bg-lab-amber/10", border: "border-lab-amber/30", icon: <Clock size={12} /> },
  { key: "confirmed", label: "确认异常", color: "text-lab-red", bg: "bg-lab-red/10", border: "border-lab-red/30", icon: <AlertTriangle size={12} /> },
  { key: "rejected", label: "误报标记", color: "text-lab-text-dim", bg: "bg-lab-text-dim/10", border: "border-lab-text-dim/30", icon: <XCircle size={12} /> },
  { key: "fixed", label: "已修复", color: "text-lab-green", bg: "bg-lab-green/10", border: "border-lab-green/30", icon: <Wrench size={12} /> },
];

function formatReviewDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AnomalyReviewDialog({ open, point, pointIndex, resultId, onClose }: AnomalyReviewDialogProps) {
  const { updateAnomalyReview, updateSavedAnomalyReview } = useExperimentStore();
  const [status, setStatus] = useState<AnomalyReviewStatus>("pending");
  const [reason, setReason] = useState("");
  const [reviewer, setReviewer] = useState("");

  useEffect(() => {
    if (open && point) {
      if (point.review) {
        setStatus(point.review.status);
        setReason(point.review.reason);
        setReviewer(point.review.reviewer);
      } else {
        setStatus("pending");
        setReason("");
        setReviewer("");
      }
    }
  }, [open, point]);

  const handleSave = () => {
    if (!point) return;
    const review: AnomalyReview = {
      status,
      reason: reason.trim(),
      reviewer: reviewer.trim(),
      reviewedAt: Date.now(),
    };
    if (resultId) {
      updateSavedAnomalyReview(resultId, pointIndex, review);
    } else {
      updateAnomalyReview(pointIndex, review);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (!open || !point) return null;

  const getStatusStyle = (key: AnomalyReviewStatus) => {
    return REVIEW_STATUS_OPTIONS.find((opt) => opt.key === key) || REVIEW_STATUS_OPTIONS[0];
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      <div
        className="w-[440px] max-w-[90vw] max-h-[90vh] overflow-y-auto lab-panel p-6 animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-lab-amber/20 flex items-center justify-center">
              <AlertTriangle size={16} className="text-lab-amber" />
            </div>
            <h3 className="text-lg font-semibold text-lab-text">异常点复核</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-lab-text-muted hover:text-lab-text hover:bg-lab-panel-light transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-lab-panel-light border border-lab-border">
            <div className="text-xs text-lab-text-muted mb-2">异常点信息</div>
            <div className="grid grid-cols-2 gap-2 text-sm mb-2">
              <div>
                <span className="text-lab-text-muted">时间:</span>
                <span className="ml-1 font-mono text-lab-cyan">{point.x.toFixed(1)}h</span>
              </div>
              <div>
                <span className="text-lab-text-muted">转化率:</span>
                <span className="ml-1 font-mono text-lab-green">{point.y.toFixed(1)}%</span>
              </div>
            </div>
            {point.anomalyNote && (
              <div className="text-xs text-lab-amber bg-lab-amber/10 px-2 py-1 rounded">
                ⚠ {point.anomalyNote}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-lab-text-muted mb-2 block flex items-center gap-1">
              <CheckCircle size={10} />
              处理状态
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {REVIEW_STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setStatus(opt.key)}
                  className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1 ${
                    status === opt.key
                      ? `${opt.bg} ${opt.color} ${opt.border} ring-1 ring-current/30`
                      : "bg-lab-panel-light border-lab-border text-lab-text-dim hover:border-lab-text-muted"
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-lab-text-muted mb-1.5 block flex items-center gap-1">
              <User size={10} />
              复核人
            </label>
            <input
              type="text"
              value={reviewer}
              onChange={(e) => setReviewer(e.target.value)}
              placeholder="姓名或工号"
              className="w-full px-3 py-2 rounded-lg bg-lab-panel-light border border-lab-border
                         text-lab-text text-sm placeholder:text-lab-text-muted
                         focus:outline-none focus:border-lab-cyan/50 focus:ring-1 focus:ring-lab-cyan/30
                         transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-lab-text-muted mb-1.5 block flex items-center gap-1">
              <FileText size={12} />
              复核原因
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请说明异常原因或处理情况..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-lab-panel-light border border-lab-border
                         text-lab-text text-sm placeholder:text-lab-text-muted
                         focus:outline-none focus:border-lab-cyan/50 focus:ring-1 focus:ring-lab-cyan/30
                         transition-colors resize-none"
            />
          </div>

          {point.review && (
            <div className="p-3 rounded-lg bg-lab-panel-light/50 border border-lab-border/50">
              <div className="text-xs text-lab-text-muted mb-2">历史复核记录</div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded border flex items-center gap-0.5 ${
                      getStatusStyle(point.review.status).color
                    } ${getStatusStyle(point.review.status).bg} ${getStatusStyle(point.review.status).border}`}
                  >
                    {getStatusStyle(point.review.status).icon}
                    {getStatusStyle(point.review.status).label}
                  </span>
                  <span className="text-[10px] text-lab-text-muted">
                    {formatReviewDate(point.review.reviewedAt)}
                  </span>
                </div>
                {point.review.reviewer && (
                  <div className="text-xs text-lab-text-dim">
                    复核人: <span className="text-lab-text">{point.review.reviewer}</span>
                  </div>
                )}
                {point.review.reason && (
                  <div className="text-xs text-lab-text-dim leading-relaxed">
                    原因: <span className="text-lab-text">{point.review.reason}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="px-4 lab-btn text-xs">
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex-1 lab-btn-success flex items-center justify-center gap-1.5 text-xs"
          >
            <CheckCircle size={13} />
            保存复核
          </button>
        </div>
      </div>
    </div>
  );
}
