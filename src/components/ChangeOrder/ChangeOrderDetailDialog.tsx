import { useState, useEffect } from "react";
import {
  X,
  FileText,
  AlertTriangle,
  Send,
  History,
  ArrowRight,
  Thermometer,
  Gauge,
  Clock,
  Beaker,
  CheckCircle,
  XCircle,
  User,
} from "lucide-react";
import type { ExperimentChangeOrder, ParamChange } from "@/types";
import { useExperimentStore } from "@/store/useExperimentStore";
import { PARAM_CONFIGS } from "@/data/presets";

const CHANGE_TYPE_LABELS: Record<string, { label: string; icon: typeof Thermometer; color: string }> = {
  temperature: { label: "温度", icon: Thermometer, color: "text-lab-red" },
  pressure: { label: "压力", icon: Gauge, color: "text-lab-cyan" },
  ratio: { label: "配比", icon: Beaker, color: "text-lab-amber" },
  reactionTime: { label: "反应时间", icon: Clock, color: "text-lab-green" },
};

const APPROVAL_ACTION_LABELS: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  submit: { label: "提交", color: "text-lab-cyan", icon: Send },
  approve: { label: "通过", color: "text-lab-green", icon: CheckCircle },
  reject: { label: "驳回", color: "text-lab-red", icon: XCircle },
  modify: { label: "修改", color: "text-lab-amber", icon: FileText },
};

function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatChangeValue(oldVal: number, newVal: number, unit: string): string {
  const diff = newVal - oldVal;
  const diffStr = diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2);
  return `${oldVal.toFixed(2)} ${unit} → ${newVal.toFixed(2)} ${unit} (${diffStr} ${unit})`;
}

interface ChangeOrderDetailDialogProps {
  open: boolean;
  order?: ExperimentChangeOrder | null;
  onClose: () => void;
}

export function ChangeOrderDetailDialog({ open, onClose }: ChangeOrderDetailDialogProps) {
  const {
    currentChangeOrder,
    updateChangeOrderParams,
    updateChangeOrderReason,
    updateChangeOrderTempPressureReason,
    submitChangeOrder,
    hasTemperaturePressureChange,
    hasRatioChange,
  } = useExperimentStore();

  const [localOrder, setLocalOrder] = useState<ExperimentChangeOrder | null>(null);
  const [operator, setOperator] = useState("");
  const [submitNote, setSubmitNote] = useState("");

  useEffect(() => {
    if (open && currentChangeOrder) {
      setLocalOrder(currentChangeOrder);
    }
  }, [open, currentChangeOrder]);

  if (!open || !localOrder) return null;

  const isDraft = localOrder.status === "draft";
  const hasTempPressure = hasTemperaturePressureChange(localOrder);
  const hasRatio = hasRatioChange(localOrder);
  const needsTempPressureReason = hasTempPressure || hasRatio;

  const canSubmit =
    isDraft &&
    localOrder.paramChanges.length > 0 &&
    localOrder.changeReason.trim().length > 0 &&
    (!needsTempPressureReason || localOrder.temperaturePressureChangeReason.trim().length > 0) &&
    operator.trim().length > 0;

  const handleParamChange = (key: string, value: number) => {
    if (!isDraft) return;
    updateChangeOrderParams(localOrder.id, key as keyof typeof localOrder.modifiedParams, value);
  };

  const handleReasonChange = (reason: string) => {
    if (!isDraft) return;
    updateChangeOrderReason(localOrder.id, reason);
  };

  const handleTempPressureReasonChange = (reason: string) => {
    if (!isDraft) return;
    updateChangeOrderTempPressureReason(localOrder.id, reason);
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    submitChangeOrder(localOrder.id, operator.trim(), submitNote.trim());
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  const groupedChanges = localOrder.paramChanges.reduce((acc, change) => {
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
        className="w-[720px] max-w-[95vw] max-h-[90vh] overflow-y-auto lab-panel p-6 animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-lab-cyan/20 flex items-center justify-center">
              <FileText size={16} className="text-lab-cyan" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-lab-text">实验变更单详情</h3>
              <p className="text-xs text-lab-text-muted font-mono">{localOrder.orderNo}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-lab-text-muted hover:text-lab-text hover:bg-lab-panel-light transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          <div className="p-3 rounded-lg bg-lab-panel-light border border-lab-border">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-lab-text-muted">来源方案:</span>
                <span className="ml-2 text-lab-text font-medium">{localOrder.sourceResultName}</span>
              </div>
              <div>
                <span className="text-lab-text-muted">创建人:</span>
                <span className="ml-2 text-lab-text">{localOrder.createdBy}</span>
              </div>
              <div>
                <span className="text-lab-text-muted">创建时间:</span>
                <span className="ml-2 text-lab-text">{formatDateTime(localOrder.createdAt)}</span>
              </div>
              <div>
                <span className="text-lab-text-muted">状态:</span>
                <span
                  className={`ml-2 font-medium ${
                    localOrder.status === "draft"
                      ? "text-lab-text-dim"
                      : localOrder.status === "pending"
                      ? "text-lab-amber"
                      : localOrder.status === "approved"
                      ? "text-lab-green"
                      : "text-lab-red"
                  }`}
                >
                  {localOrder.status === "draft"
                    ? "草稿"
                    : localOrder.status === "pending"
                    ? "待审批"
                    : localOrder.status === "approved"
                    ? "已通过"
                    : "已驳回"}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-lab-text mb-3 flex items-center gap-2">
              <Sliders size={14} className="text-lab-cyan" />
              参数调整
              {isDraft && <span className="text-xs text-lab-text-muted font-normal">(可编辑)</span>}
            </h4>
            <div className="space-y-3">
              {PARAM_CONFIGS.map((config) => {
                const original = localOrder.originalParams[config.key];
                const modified = localOrder.modifiedParams[config.key];
                const hasChange = Math.abs(original - modified) > 0.01;

                return (
                  <div
                    key={config.key}
                    className={`p-3 rounded-lg border transition-all ${
                      hasChange
                        ? "bg-lab-cyan/5 border-lab-cyan/30"
                        : "bg-lab-panel-light border-lab-border"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-lab-text">{config.label}</span>
                        {hasChange && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-lab-cyan/20 text-lab-cyan">
                            已变更
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-lab-text-muted">
                          原值: <span className="font-mono text-lab-text-dim">{original.toFixed(2)} {config.unit}</span>
                        </span>
                        <ArrowRight size={12} className="text-lab-text-muted" />
                        <span className="font-mono font-semibold" style={{ color: config.color }}>
                          {modified.toFixed(2)} {config.unit}
                        </span>
                      </div>
                    </div>
                    {isDraft && (
                      <input
                        type="range"
                        min={config.min}
                        max={config.max}
                        step={config.step}
                        value={modified}
                        onChange={(e) => handleParamChange(config.key, parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-lab-panel rounded-lg appearance-none cursor-pointer"
                        style={{
                          accentColor: config.color,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {localOrder.paramChanges.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-lab-text mb-3 flex items-center gap-2">
                <AlertTriangle size={14} className="text-lab-amber" />
                参数变更对比
              </h4>
              <div className="space-y-2">
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
                        <span className="text-xs text-lab-text-muted">
                          ({changes.length} 项)
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
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium text-lab-text mb-2 flex items-center gap-2">
              <FileText size={14} className="text-lab-cyan" />
              变更原因
              <span className="text-lab-red">*</span>
            </h4>
            <textarea
              value={localOrder.changeReason}
              onChange={(e) => handleReasonChange(e.target.value)}
              disabled={!isDraft}
              placeholder="请详细描述本次参数变更的原因..."
              rows={3}
              className={`w-full px-3 py-2 rounded-lg border text-sm text-lab-text
                         placeholder:text-lab-text-muted resize-none transition-colors
                         ${
                           isDraft
                             ? "bg-lab-panel-light border-lab-border focus:outline-none focus:border-lab-cyan/50 focus:ring-1 focus:ring-lab-cyan/30"
                             : "bg-lab-panel/50 border-lab-border/50 cursor-not-allowed"
                         }`}
            />
            {isDraft && localOrder.changeReason.trim().length === 0 && (
              <p className="text-xs text-lab-red mt-1">请填写变更原因</p>
            )}
          </div>

          {needsTempPressureReason && (
            <div>
              <h4 className="text-sm font-medium text-lab-text mb-2 flex items-center gap-2">
                <AlertTriangle size={14} className="text-lab-amber" />
                温压配比变更原因
                <span className="text-lab-red">*</span>
                <span className="text-xs text-lab-text-muted font-normal">
                  (温度、压力或配比变更需填写)
                </span>
              </h4>
              <textarea
                value={localOrder.temperaturePressureChangeReason}
                onChange={(e) => handleTempPressureReasonChange(e.target.value)}
                disabled={!isDraft}
                placeholder="请详细说明温度、压力或配比变更的必要性和依据..."
                rows={3}
                className={`w-full px-3 py-2 rounded-lg border text-sm text-lab-text
                           placeholder:text-lab-text-muted resize-none transition-colors
                           ${
                             isDraft
                               ? "bg-lab-panel-light border-lab-border focus:outline-none focus:border-lab-amber/50 focus:ring-1 focus:ring-lab-amber/30"
                               : "bg-lab-panel/50 border-lab-border/50 cursor-not-allowed"
                           }`}
              />
              {isDraft && localOrder.temperaturePressureChangeReason.trim().length === 0 && (
                <p className="text-xs text-lab-red mt-1">
                  由于变更了温度、压力或配比，必须填写详细原因
                </p>
              )}
            </div>
          )}

          {localOrder.approvalNote && (
            <div className="p-3 rounded-lg bg-lab-panel-light/50 border border-lab-border/50">
              <div className="text-xs text-lab-text-muted mb-1">审批备注</div>
              <div className="text-sm text-lab-text-dim">{localOrder.approvalNote}</div>
              {localOrder.approver && (
                <div className="text-xs text-lab-text-muted mt-2">
                  审批人: {localOrder.approver}
                </div>
              )}
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium text-lab-text mb-3 flex items-center gap-2">
              <History size={14} className="text-lab-cyan" />
              审批记录
            </h4>
            <div className="space-y-2">
              {localOrder.auditTrail.map((record) => {
                const actionInfo = APPROVAL_ACTION_LABELS[record.action];
                const ActionIcon = actionInfo.icon;
                return (
                  <div
                    key={record.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-lab-panel-light border border-lab-border"
                  >
                    <div className={`p-1.5 rounded-lg ${actionInfo.color} bg-current/10`}>
                      <ActionIcon size={14} className={actionInfo.color} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-medium ${actionInfo.color}`}>
                          {actionInfo.label}
                        </span>
                        <span className="text-xs text-lab-text-muted">
                          {formatDateTime(record.timestamp)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-lab-text-dim mb-1">
                        <User size={10} className="text-lab-text-muted" />
                        <span>{record.operator}</span>
                      </div>
                      {record.note && (
                        <p className="text-xs text-lab-text-dim">{record.note}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {isDraft && (
            <div className="p-4 rounded-lg bg-lab-cyan/5 border border-lab-cyan/30">
              <h4 className="text-sm font-medium text-lab-text mb-3 flex items-center gap-2">
                <Send size={14} className="text-lab-cyan" />
                提交审批
              </h4>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-lab-text-muted mb-1.5 block flex items-center gap-1">
                    <User size={10} />
                    提交人
                    <span className="text-lab-red">*</span>
                  </label>
                  <input
                    type="text"
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                    placeholder="请输入提交人姓名或工号"
                    className="w-full px-3 py-2 rounded-lg bg-lab-panel-light border border-lab-border
                               text-lab-text text-sm placeholder:text-lab-text-muted
                               focus:outline-none focus:border-lab-cyan/50 focus:ring-1 focus:ring-lab-cyan/30
                               transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-lab-text-muted mb-1.5 block">
                    提交备注
                  </label>
                  <input
                    type="text"
                    value={submitNote}
                    onChange={(e) => setSubmitNote(e.target.value)}
                    placeholder="可选，填写提交说明"
                    className="w-full px-3 py-2 rounded-lg bg-lab-panel-light border border-lab-border
                               text-lab-text text-sm placeholder:text-lab-text-muted
                               focus:outline-none focus:border-lab-cyan/50 focus:ring-1 focus:ring-lab-cyan/30
                               transition-colors"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 lab-btn text-xs">
                  取消
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="flex-1 lab-btn-success flex items-center justify-center gap-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={13} />
                  提交审批
                </button>
              </div>
              {!canSubmit && (
                <p className="text-xs text-lab-amber mt-2">
                  请确保已填写所有必填项（变更原因、温压配比变更原因、提交人），且至少有一项参数变更
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Sliders(props: { size: number; className: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}
