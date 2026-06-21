import { useState, useEffect } from "react";
import {
  X,
  CheckCircle,
  XCircle,
  FileText,
  User,
  Calendar,
  Flag,
} from "lucide-react";
import type { ExperimentResult, ApprovalStatus, Priority } from "@/types";
import { useExperimentStore } from "@/store/useExperimentStore";

interface ApprovalDialogProps {
  open: boolean;
  result: ExperimentResult | null;
  onClose: () => void;
}

const APPROVAL_STYLES: Record<ApprovalStatus, { label: string; color: string; bg: string; border: string }> = {
  pending: { label: "待审批", color: "text-lab-amber", bg: "bg-lab-amber/10", border: "border-lab-amber/30" },
  approved: { label: "已通过", color: "text-lab-green", bg: "bg-lab-green/10", border: "border-lab-green/30" },
  rejected: { label: "已驳回", color: "text-lab-red", bg: "bg-lab-red/10", border: "border-lab-red/30" },
};

const PRIORITY_OPTIONS: { key: Priority; label: string; color: string; bgColor: string }[] = [
  { key: "low", label: "低", color: "text-lab-text-dim", bgColor: "bg-lab-text-dim/10 border-lab-text-dim/30" },
  { key: "normal", label: "普通", color: "text-lab-cyan", bgColor: "bg-lab-cyan/10 border-lab-cyan/30" },
  { key: "high", label: "高", color: "text-lab-amber", bgColor: "bg-lab-amber/10 border-lab-amber/30" },
  { key: "urgent", label: "紧急", color: "text-lab-red", bgColor: "bg-lab-red/10 border-lab-red/30" },
];

function formatDateForInput(ts: number | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseDateToTimestamp(s: string): number | null {
  if (!s) return null;
  const t = Date.parse(s);
  return isNaN(t) ? null : t;
}

export function ApprovalDialog({ open, result, onClose }: ApprovalDialogProps) {
  const { approveResult, rejectResult, updateResultMeta } = useExperimentStore();
  const [approvalNote, setApprovalNote] = useState("");
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [approver, setApprover] = useState("");
  const [deadlineStr, setDeadlineStr] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");

  useEffect(() => {
    if (open && result) {
      setApprovalNote(result.approvalNote || "");
      setAction(null);
      setApprover(result.approver || "");
      setDeadlineStr(formatDateForInput(result.deadline));
      setPriority(result.priority || "normal");
    }
  }, [open, result]);

  const persistMeta = () => {
    if (!result) return;
    updateResultMeta(result.id, {
      approver: approver.trim(),
      deadline: parseDateToTimestamp(deadlineStr),
      priority,
    });
  };

  const handleApprove = () => {
    if (!result) return;
    persistMeta();
    approveResult(result.id, approvalNote.trim());
    onClose();
  };

  const handleReject = () => {
    if (!result) return;
    persistMeta();
    rejectResult(result.id, approvalNote.trim());
    onClose();
  };

  const handleMetaSaveOnly = () => {
    persistMeta();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (!open || !result) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      <div
        className="w-[480px] max-w-[90vw] max-h-[90vh] overflow-y-auto lab-panel p-6 animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-lab-cyan/20 flex items-center justify-center">
              <FileText size={16} className="text-lab-cyan" />
            </div>
            <h3 className="text-lg font-semibold text-lab-text">方案审批</h3>
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
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: result.color, boxShadow: `0 0 6px ${result.color}60` }}
              />
              <span className="font-medium text-lab-text">{result.name}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-lab-text-muted">评分:</span>
                <span className="ml-1 font-mono font-semibold text-lab-cyan">{result.score}</span>
              </div>
              <div>
                <span className="text-lab-text-muted">产率:</span>
                <span className="ml-1 font-mono text-lab-green">{result.yieldRate}%</span>
              </div>
              <div>
                <span className="text-lab-text-muted">稳定性:</span>
                <span className="ml-1 font-mono text-lab-amber">{result.stability}</span>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded border ${APPROVAL_STYLES[result.approvalStatus].color} ${APPROVAL_STYLES[result.approvalStatus].bg} ${APPROVAL_STYLES[result.approvalStatus].border}`}
              >
                {APPROVAL_STYLES[result.approvalStatus].label}
              </span>
              {result.batch && (
                <span className="text-[10px] font-mono text-lab-text-dim bg-lab-panel/50 px-1.5 py-0.5 rounded">
                  {result.batch}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-lab-text-muted mb-1.5 block flex items-center gap-1">
                <User size={10} />
                审批人
              </label>
              <input
                type="text"
                value={approver}
                onChange={(e) => setApprover(e.target.value)}
                placeholder="姓名或工号"
                className="w-full px-3 py-2 rounded-lg bg-lab-panel-light border border-lab-border
                           text-lab-text text-sm placeholder:text-lab-text-muted
                           focus:outline-none focus:border-lab-cyan/50 focus:ring-1 focus:ring-lab-cyan/30
                           transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-lab-text-muted mb-1.5 block flex items-center gap-1">
                <Calendar size={10} />
                截止时间
              </label>
              <input
                type="datetime-local"
                value={deadlineStr}
                onChange={(e) => setDeadlineStr(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-lab-panel-light border border-lab-border
                           text-lab-text text-sm placeholder:text-lab-text-muted
                           focus:outline-none focus:border-lab-cyan/50 focus:ring-1 focus:ring-lab-cyan/30
                           transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-lab-text-muted mb-2 flex items-center gap-1">
              <Flag size={10} />
              优先级
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setPriority(opt.key)}
                  className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all ${
                    priority === opt.key
                      ? `${opt.bgColor} ${opt.color} ring-1 ring-current/30`
                      : "bg-lab-panel-light border-lab-border text-lab-text-dim hover:border-lab-text-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-lab-text-muted mb-1.5 block flex items-center gap-1">
              <FileText size={12} />
              审批备注
            </label>
            <textarea
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              placeholder="请输入审批意见或备注信息..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-lab-panel-light border border-lab-border
                         text-lab-text text-sm placeholder:text-lab-text-muted
                         focus:outline-none focus:border-lab-cyan/50 focus:ring-1 focus:ring-lab-cyan/30
                         transition-colors resize-none"
              autoFocus
            />
          </div>

          {result.approvalNote && !action && (
            <div className="p-3 rounded-lg bg-lab-panel-light/50 border border-lab-border/50">
              <div className="text-xs text-lab-text-muted mb-1">历史审批备注</div>
              <div className="text-sm text-lab-text-dim">{result.approvalNote}</div>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={handleMetaSaveOnly} className="px-4 lab-btn text-xs">
            仅保存信息
          </button>
          <div className="flex-1 flex gap-2">
            <button
              onClick={handleReject}
              className="flex-1 lab-btn-danger flex items-center justify-center gap-1.5 text-xs"
            >
              <XCircle size={13} />
              驳回
            </button>
            <button
              onClick={handleApprove}
              className="flex-1 lab-btn-success flex items-center justify-center gap-1.5 text-xs"
            >
              <CheckCircle size={13} />
              通过
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
