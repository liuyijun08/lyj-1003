import { useState, useEffect } from "react";
import {
  X,
  AlertTriangle,
  User,
  FileText,
  Calendar,
  Flag,
  CheckCircle,
  Wrench,
} from "lucide-react";
import type { EventLevel, QualityEvent } from "@/types";
import { useExperimentStore } from "@/store/useExperimentStore";

interface EventDetailDialogProps {
  open: boolean;
  event: QualityEvent | null;
  onClose: () => void;
}

const EVENT_LEVEL_OPTIONS: {
  key: EventLevel;
  label: string;
  color: string;
  bg: string;
  border: string;
}[] = [
  { key: "minor", label: "一般", color: "text-lab-text-dim", bg: "bg-lab-text-dim/10", border: "border-lab-text-dim/30" },
  { key: "major", label: "较大", color: "text-lab-amber", bg: "bg-lab-amber/10", border: "border-lab-amber/30" },
  { key: "critical", label: "重大", color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/30" },
  { key: "catastrophic", label: "特别重大", color: "text-lab-red", bg: "bg-lab-red/10", border: "border-lab-red/30" },
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

export function EventDetailDialog({ open, event, onClose }: EventDetailDialogProps) {
  const { updateQualityEvent, resolveQualityEvent, verifyQualityEvent } = useExperimentStore();
  const [level, setLevel] = useState<EventLevel>("minor");
  const [reason, setReason] = useState("");
  const [handler, setHandler] = useState("");
  const [deadlineStr, setDeadlineStr] = useState("");
  const [title, setTitle] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [tab, setTab] = useState<"edit" | "resolve" | "verify">("edit");

  useEffect(() => {
    if (open && event) {
      setLevel(event.level);
      setReason(event.reason);
      setHandler(event.handler);
      setDeadlineStr(formatDateForInput(event.deadline));
      setTitle(event.title);
      setResolutionNote(event.resolutionNote || "");
      setVerifiedBy("");
      if (event.status === "open" || event.status === "escalated") {
        setTab("edit");
      } else if (event.status === "in_progress") {
        setTab("resolve");
      } else if (event.status === "resolved") {
        setTab("verify");
      } else {
        setTab("edit");
      }
    }
  }, [open, event]);

  const handleSave = () => {
    if (!event) return;
    updateQualityEvent(event.id, {
      level,
      reason: reason.trim(),
      handler: handler.trim(),
      deadline: parseDateToTimestamp(deadlineStr),
      title: title.trim(),
      status: "in_progress",
    });
    onClose();
  };

  const handleResolve = () => {
    if (!event) return;
    resolveQualityEvent(event.id, resolutionNote.trim());
    onClose();
  };

  const handleVerify = () => {
    if (!event) return;
    verifyQualityEvent(event.id, verifiedBy.trim());
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  if (!open || !event) return null;

  const isOverdue = event.deadline && event.deadline < Date.now() && event.status !== "resolved" && event.status !== "closed";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      <div
        className="w-[520px] max-w-[90vw] max-h-[90vh] overflow-y-auto lab-panel p-6 animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isOverdue ? "bg-lab-red/20" : "bg-lab-amber/20"}`}>
              <AlertTriangle size={16} className={isOverdue ? "text-lab-red" : "text-lab-amber"} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-lab-text">质量事件详情</h3>
              {event.escalationCount > 0 && (
                <span className="text-[10px] text-lab-red font-medium">已升级 {event.escalationCount} 次</span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-lab-text-muted hover:text-lab-text hover:bg-lab-panel-light transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-3 rounded-lg bg-lab-panel-light border border-lab-border mb-4">
          <div className="text-xs text-lab-text-muted mb-2">事件信息</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-lab-text-muted">来源方案:</span>
              <span className="ml-1 text-lab-cyan">{event.sourceResultName}</span>
            </div>
            <div>
              <span className="text-lab-text-muted">异常位置:</span>
              <span className="ml-1 font-mono text-lab-text">{event.pointX.toFixed(1)}h / {event.pointY.toFixed(1)}%</span>
            </div>
          </div>
          {event.anomalyNote && (
            <div className="text-xs text-lab-amber bg-lab-amber/10 px-2 py-1 rounded mt-2">
              ⚠ {event.anomalyNote}
            </div>
          )}
        </div>

        {(event.status === "open" || event.status === "in_progress" || event.status === "escalated") && (
          <div className="flex gap-1 mb-4">
            <button
              onClick={() => setTab("edit")}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                tab === "edit" ? "bg-lab-cyan/20 text-lab-cyan border-lab-cyan/30" : "text-lab-text-muted border-lab-border hover:text-lab-text-dim"
              }`}
            >
              <FileText size={11} className="inline mr-1" />
              编辑事件
            </button>
            <button
              onClick={() => setTab("resolve")}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                tab === "resolve" ? "bg-lab-green/20 text-lab-green border-lab-green/30" : "text-lab-text-muted border-lab-border hover:text-lab-text-dim"
              }`}
            >
              <Wrench size={11} className="inline mr-1" />
              处置
            </button>
          </div>
        )}

        {tab === "edit" && (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-lab-text-muted mb-1.5 block">事件标题</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="简述质量事件"
                className="w-full px-3 py-2 rounded-lg bg-lab-panel-light border border-lab-border
                           text-lab-text text-sm placeholder:text-lab-text-muted
                           focus:outline-none focus:border-lab-cyan/50 focus:ring-1 focus:ring-lab-cyan/30
                           transition-colors"
              />
            </div>

            <div>
              <label className="text-xs text-lab-text-muted mb-2 block flex items-center gap-1">
                <Flag size={10} />
                事件等级
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {EVENT_LEVEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setLevel(opt.key)}
                    className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all ${
                      level === opt.key
                        ? `${opt.bg} ${opt.color} ${opt.border} ring-1 ring-current/30`
                        : "bg-lab-panel-light border-lab-border text-lab-text-dim hover:border-lab-text-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-lab-text-muted mb-1.5 block flex items-center gap-1">
                  <User size={10} />
                  处置人
                </label>
                <input
                  type="text"
                  value={handler}
                  onChange={(e) => setHandler(e.target.value)}
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
                  处置期限
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
              <label className="text-xs text-lab-text-muted mb-1.5 block flex items-center gap-1">
                <FileText size={12} />
                事件原因
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="请说明事件原因..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-lab-panel-light border border-lab-border
                           text-lab-text text-sm placeholder:text-lab-text-muted
                           focus:outline-none focus:border-lab-cyan/50 focus:ring-1 focus:ring-lab-cyan/30
                           transition-colors resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 lab-btn text-xs">
                取消
              </button>
              <button
                onClick={handleSave}
                className="flex-1 lab-btn-success flex items-center justify-center gap-1.5 text-xs"
              >
                <CheckCircle size={13} />
                保存事件
              </button>
            </div>
          </div>
        )}

        {tab === "resolve" && (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-lab-text-muted mb-1.5 block flex items-center gap-1">
                <Wrench size={12} />
                处置说明
              </label>
              <textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="请说明处置措施和结果..."
                rows={4}
                className="w-full px-3 py-2 rounded-lg bg-lab-panel-light border border-lab-border
                           text-lab-text text-sm placeholder:text-lab-text-muted
                           focus:outline-none focus:border-lab-cyan/50 focus:ring-1 focus:ring-lab-cyan/30
                           transition-colors resize-none"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 lab-btn text-xs">
                取消
              </button>
              <button
                onClick={handleResolve}
                disabled={!resolutionNote.trim()}
                className="flex-1 lab-btn-success flex items-center justify-center gap-1.5 text-xs disabled:opacity-50"
              >
                <CheckCircle size={13} />
                确认处置
              </button>
            </div>
          </div>
        )}

        {tab === "verify" && event.status === "resolved" && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-lab-green/5 border border-lab-green/20">
              <div className="text-xs text-lab-text-muted mb-1">处置说明</div>
              <div className="text-sm text-lab-text">{event.resolutionNote}</div>
            </div>
            <div>
              <label className="text-xs text-lab-text-muted mb-1.5 block flex items-center gap-1">
                <User size={10} />
                验证人
              </label>
              <input
                type="text"
                value={verifiedBy}
                onChange={(e) => setVerifiedBy(e.target.value)}
                placeholder="姓名或工号"
                className="w-full px-3 py-2 rounded-lg bg-lab-panel-light border border-lab-border
                           text-lab-text text-sm placeholder:text-lab-text-muted
                           focus:outline-none focus:border-lab-cyan/50 focus:ring-1 focus:ring-lab-cyan/30
                           transition-colors"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 lab-btn text-xs">
                取消
              </button>
              <button
                onClick={handleVerify}
                disabled={!verifiedBy.trim()}
                className="flex-1 lab-btn-primary flex items-center justify-center gap-1.5 text-xs disabled:opacity-50"
              >
                <CheckCircle size={13} />
                验证通过并关闭
              </button>
            </div>
          </div>
        )}

        {event.status === "closed" && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-lab-green/5 border border-lab-green/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={14} className="text-lab-green" />
                <span className="text-sm font-medium text-lab-green">事件已关闭</span>
              </div>
              <div className="text-xs text-lab-text-dim space-y-1">
                <div>处置说明: <span className="text-lab-text">{event.resolutionNote}</span></div>
                <div>验证人: <span className="text-lab-text">{event.verifiedBy}</span></div>
                {event.verifiedAt && (
                  <div>验证时间: <span className="font-mono text-lab-text">{new Date(event.verifiedAt).toLocaleString()}</span></div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 lab-btn text-xs">
                关闭
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
