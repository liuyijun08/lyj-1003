import { useState, useEffect } from "react";
import {
  X,
  CheckCircle,
  XCircle,
  FileText,
  User,
  AlertTriangle,
  Thermometer,
  Gauge,
  Clock,
  Beaker,
} from "lucide-react";
import type { ExperimentChangeOrder, ParamChange } from "@/types";
import { useExperimentStore } from "@/store/useExperimentStore";

const CHANGE_TYPE_LABELS: Record<string, { label: string; icon: typeof Thermometer; color: string }> = {
  temperature: { label: "温度", icon: Thermometer, color: "text-lab-red" },
  pressure: { label: "压力", icon: Gauge, color: "text-lab-cyan" },
  ratio: { label: "配比", icon: Beaker, color: "text-lab-amber" },
  reactionTime: { label: "反应时间", icon: Clock, color: "text-lab-green" },
};

function formatChangeValue(oldVal: number, newVal: number, unit: string): string {
  const diff = newVal - oldVal;
  const diffStr = diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2);
  return `${oldVal.toFixed(2)} ${unit} → ${newVal.toFixed(2)} ${unit} (${diffStr} ${unit})`;
}

interface ChangeOrderApprovalDialogProps {
  open: boolean;
  order?: ExperimentChangeOrder | null;
  onClose: () => void;
}

export function ChangeOrderApprovalDialog({ open, onClose }: ChangeOrderApprovalDialogProps) {
  const {
    currentChangeOrder,
    approveChangeOrder,
    rejectChangeOrder,
    hasTemperaturePressureChange,
    hasRatioChange,
  } = useExperimentStore();

  const [approvalNote, setApprovalNote] = useState("");
  const [approver, setApprover] = useState("");
  const [action, setAction] = useState<"approve" | "reject" | null>(null);

  useEffect(() => {
    if (open && currentChangeOrder) {
      setApprovalNote(currentChangeOrder.approvalNote || "");
      setApprover("");
      setAction(null);
    }
  }, [open, currentChangeOrder]);

  if (!open || !currentChangeOrder) return null;

  const hasTempPressure = hasTemperaturePressureChange(currentChangeOrder);
  const hasRatio = hasRatioChange(currentChangeOrder);
  const needsTempPressureReason = hasTempPressure || hasRatio;

  const canApprove = action === "approve" && approver.trim().length > 0;
  const canReject = action === "reject" && approver.trim().length > 0 && approvalNote.trim().length > 0;

  const handleApprove = () => {
    if (!canApprove) return;
    approveChangeOrder(currentChangeOrder.id, approver.trim(), approvalNote.trim());
    onClose();
  };

  const handleReject = () => {
    if (!canReject) return;
    rejectChangeOrder(currentChangeOrder.id, approver.trim(), approvalNote.trim());
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  const groupedChanges = currentChangeOrder.paramChanges.reduce((acc, change) => {
    if (!acc[change.changeType]) {
      acc[change.changeType] = [];
    }
    acc[change.changeType].push(change);
    return acc;
  }, {} as Record<string, ParamChange[]>);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      <div
        className="w-[560px] max-w-[95vw] max-h-[90vh] overflow-y-auto lab-panel p-6 animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-lab-amber/20 flex items-center justify-center">
              <AlertTriangle size={16} className="text-lab-amber" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-lab-text">审批变更单</h3>
              <p className="text-xs text-lab-text-muted font-mono">{currentChangeOrder.orderNo}</p>
            </div>
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
              <span className="font-medium text-lab-text">{currentChangeOrder.sourceResultName}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-lab-text-muted">创建人:</span>
                <span className="ml-1 text-lab-text-dim">{currentChangeOrder.createdBy}</span>
              </div>
              <div>
                <span className="text-lab-text-muted">参数变更:</span>
                <span className="ml-1 font-mono text-lab-cyan">{currentChangeOrder.paramChanges.length} 项</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-lab-text flex items-center gap-2">
              <AlertTriangle size={14} className="text-lab-amber" />
              参数变更列表
            </div>
            {Object.entries(groupedChanges).map(([type, changes]) => {
              const typeInfo = CHANGE_TYPE_LABELS[type];
              const TypeIcon = typeInfo.icon;
              return (
                <div
                  key={type}
                  className="p-3 rounded-lg bg-lab-panel-light border border-lab-border"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <TypeIcon size={14} className={typeInfo.color} />
                    <span className={`text-sm font-medium ${typeInfo.color}`}>
                      {typeInfo.label}变更
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {changes.map((change, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs pl-6"
                      >
                        <span className="text-lab-text-muted">{change.label}</span>
                        <span className="font-mono text-lab-text">
                          {formatChangeValue(change.oldValue, change.newValue, change.unit)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {currentChangeOrder.changeReason && (
            <div className="p-3 rounded-lg bg-lab-panel-light border border-lab-border">
              <div className="text-xs text-lab-text-muted mb-1 flex items-center gap-1">
                <FileText size={10} />
                变更原因
              </div>
              <div className="text-sm text-lab-text-dim">{currentChangeOrder.changeReason}</div>
            </div>
          )}

          {needsTempPressureReason && currentChangeOrder.temperaturePressureChangeReason && (
            <div className="p-3 rounded-lg bg-lab-amber/5 border border-lab-amber/30">
              <div className="text-xs text-lab-amber mb-1 flex items-center gap-1">
                <AlertTriangle size={10} />
                温压配比变更原因
              </div>
              <div className="text-sm text-lab-text-dim">{currentChangeOrder.temperaturePressureChangeReason}</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-lab-text-muted mb-1.5 block flex items-center gap-1">
                <User size={10} />
                审批人
                <span className="text-lab-red">*</span>
              </label>
              <input
                type="text"
                value={approver}
                onChange={(e) => setApprover(e.target.value)}
                placeholder="请输入审批人姓名或工号"
                className="w-full px-3 py-2 rounded-lg bg-lab-panel-light border border-lab-border
                           text-lab-text text-sm placeholder:text-lab-text-muted
                           focus:outline-none focus:border-lab-cyan/50 focus:ring-1 focus:ring-lab-cyan/30
                           transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-lab-text-muted mb-1.5 block flex items-center gap-1">
              <FileText size={12} />
              审批意见
              {action === "reject" && <span className="text-lab-red">*</span>}
            </label>
            <textarea
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              placeholder={action === "reject" ? "请填写驳回原因..." : "请输入审批意见（可选）..."}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-lab-panel-light border border-lab-border
                         text-lab-text text-sm placeholder:text-lab-text-muted
                         focus:outline-none focus:border-lab-cyan/50 focus:ring-1 focus:ring-lab-cyan/30
                         transition-colors resize-none"
              autoFocus
            />
          </div>

          {action === null && (
            <div className="p-3 rounded-lg bg-lab-panel-light/50 border border-lab-border/50">
              <div className="text-xs text-lab-text-muted mb-2">请选择审批结果</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setAction("approve")}
                  className="flex-1 lab-btn-success flex items-center justify-center gap-1.5 text-xs"
                >
                  <CheckCircle size={13} />
                  通过
                </button>
                <button
                  onClick={() => setAction("reject")}
                  className="flex-1 lab-btn-danger flex items-center justify-center gap-1.5 text-xs"
                >
                  <XCircle size={13} />
                  驳回
                </button>
              </div>
            </div>
          )}

          {action !== null && (
            <div className="flex gap-2">
              <button
                onClick={() => setAction(null)}
                className="flex-1 lab-btn text-xs"
              >
                返回
              </button>
              {action === "reject" ? (
                <button
                  onClick={handleReject}
                  disabled={!canReject}
                  className="flex-1 lab-btn-danger flex items-center justify-center gap-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle size={13} />
                  确认驳回
                </button>
              ) : (
                <button
                  onClick={handleApprove}
                  disabled={!canApprove}
                  className="flex-1 lab-btn-success flex items-center justify-center gap-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle size={13} />
                  确认通过
                </button>
              )}
            </div>
          )}

          {action === "reject" && !canReject && (
            <p className="text-xs text-lab-amber">
              驳回操作必须填写审批意见和审批人
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
