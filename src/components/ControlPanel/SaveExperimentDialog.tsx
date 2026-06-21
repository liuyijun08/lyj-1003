import { useState, useEffect } from "react";
import {
  X,
  Save,
  AlertTriangle,
  Beaker,
  User,
  Calendar,
  Flag,
} from "lucide-react";
import type { RiskTag, Priority } from "@/types";
import { useExperimentStore } from "@/store/useExperimentStore";

interface SaveExperimentDialogProps {
  open: boolean;
  onClose: () => void;
}

const RISK_OPTIONS: { key: RiskTag; label: string; color: string; bgColor: string }[] = [
  { key: "low", label: "低风险", color: "text-lab-green", bgColor: "bg-lab-green/10 border-lab-green/30" },
  { key: "medium", label: "中风险", color: "text-lab-amber", bgColor: "bg-lab-amber/10 border-lab-amber/30" },
  { key: "high", label: "高风险", color: "text-orange-400", bgColor: "bg-orange-400/10 border-orange-400/30" },
  { key: "critical", label: "极高风险", color: "text-lab-red", bgColor: "bg-lab-red/10 border-lab-red/30" },
];

const PRIORITY_OPTIONS: { key: Priority; label: string; color: string; bgColor: string }[] = [
  { key: "low", label: "低", color: "text-lab-text-dim", bgColor: "bg-lab-text-dim/10 border-lab-text-dim/30" },
  { key: "normal", label: "普通", color: "text-lab-cyan", bgColor: "bg-lab-cyan/10 border-lab-cyan/30" },
  { key: "high", label: "高", color: "text-lab-amber", bgColor: "bg-lab-amber/10 border-lab-amber/30" },
  { key: "urgent", label: "紧急", color: "text-lab-red", bgColor: "bg-lab-red/10 border-lab-red/30" },
];


function parseDateToTimestamp(s: string): number | null {
  if (!s) return null;
  const t = Date.parse(s);
  return isNaN(t) ? null : t;
}

export function SaveExperimentDialog({ open, onClose }: SaveExperimentDialogProps) {
  const { saveCurrentResult, savedResults } = useExperimentStore();
  const [name, setName] = useState("");
  const [batch, setBatch] = useState("");
  const [purpose, setPurpose] = useState("");
  const [riskTag, setRiskTag] = useState<RiskTag>("medium");
  const [approver, setApprover] = useState("");
  const [deadlineStr, setDeadlineStr] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");

  useEffect(() => {
    if (open) {
      setName(`实验 ${savedResults.length + 1}`);
      setBatch("");
      setPurpose("");
      setRiskTag("medium");
      setApprover("");
      setDeadlineStr("");
      setPriority("normal");
    }
  }, [open, savedResults.length]);

  const handleSave = () => {
    saveCurrentResult({
      name: name.trim() || undefined,
      batch: batch.trim() || undefined,
      purpose: purpose.trim() || undefined,
      riskTag,
      approver: approver.trim() || undefined,
      deadline: parseDateToTimestamp(deadlineStr),
      priority,
    });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      <div
        className="w-[460px] max-w-[90vw] max-h-[90vh] overflow-y-auto lab-panel p-6 animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-lab-cyan/20 flex items-center justify-center">
              <Beaker size={16} className="text-lab-cyan" />
            </div>
            <h3 className="text-lg font-semibold text-lab-text">保存实验方案</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-lab-text-muted hover:text-lab-text hover:bg-lab-panel-light transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-lab-text-muted mb-1.5 block">方案名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入方案名称"
              className="w-full px-3 py-2 rounded-lg bg-lab-panel-light border border-lab-border
                         text-lab-text text-sm placeholder:text-lab-text-muted
                         focus:outline-none focus:border-lab-cyan/50 focus:ring-1 focus:ring-lab-cyan/30
                         transition-colors"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-lab-text-muted mb-1.5 block">实验批次</label>
              <input
                type="text"
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                placeholder="例如：BATCH-2024-001"
                className="w-full px-3 py-2 rounded-lg bg-lab-panel-light border border-lab-border
                           text-lab-text text-sm placeholder:text-lab-text-muted
                           focus:outline-none focus:border-lab-cyan/50 focus:ring-1 focus:ring-lab-cyan/30
                           transition-colors font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-lab-text-muted mb-1.5 block flex items-center gap-1">
                <Flag size={10} />
                优先级
              </label>
              <div className="grid grid-cols-4 gap-1">
                {PRIORITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setPriority(opt.key)}
                    className={`px-1 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
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
          </div>

          <div>
            <label className="text-xs text-lab-text-muted mb-1.5 block">实验目的</label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="描述本次实验的目的和预期..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-lab-panel-light border border-lab-border
                         text-lab-text text-sm placeholder:text-lab-text-muted
                         focus:outline-none focus:border-lab-cyan/50 focus:ring-1 focus:ring-lab-cyan/30
                         transition-colors resize-none"
            />
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
              <AlertTriangle size={12} />
              风险等级标签
            </label>
            <div className="grid grid-cols-2 gap-2">
              {RISK_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setRiskTag(opt.key)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                    riskTag === opt.key
                      ? `${opt.bgColor} ${opt.color} ring-1 ring-current/30`
                      : "bg-lab-panel-light border-lab-border text-lab-text-dim hover:border-lab-text-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 lab-btn">
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex-1 lab-btn-success flex items-center justify-center gap-1.5"
          >
            <Save size={14} />
            确认保存
          </button>
        </div>
      </div>
    </div>
  );
}
