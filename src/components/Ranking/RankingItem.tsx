import { useState } from "react";
import {
  Trash2,
  Copy,
  AlertTriangle,
  Eye,
  EyeOff,
  Trophy,
  Medal,
  CheckCircle,
  XCircle,
  Tag,
  FileText,
  Clock,
  UserCheck,
  User,
  Calendar,
  AlertOctagon,
} from "lucide-react";
import type { ExperimentResult, RiskTag, ApprovalStatus, Priority } from "@/types";
import { useExperimentStore, validateRatios } from "@/store/useExperimentStore";
import { ApprovalDialog } from "./ApprovalDialog";

const RISK_TAG_STYLES: Record<RiskTag, { label: string; color: string; bg: string }> = {
  low: { label: "低风险", color: "text-lab-green", bg: "bg-lab-green/10 border-lab-green/30" },
  medium: { label: "中风险", color: "text-lab-amber", bg: "bg-lab-amber/10 border-lab-amber/30" },
  high: { label: "高风险", color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/30" },
  critical: { label: "极高风险", color: "text-lab-red", bg: "bg-lab-red/10 border-lab-red/30" },
};

const APPROVAL_STATUS_STYLES: Record<ApprovalStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: { label: "待审", color: "text-lab-amber", bg: "bg-lab-amber/10 border-lab-amber/30", icon: <Clock size={10} /> },
  approved: { label: "通过", color: "text-lab-green", bg: "bg-lab-green/10 border-lab-green/30", icon: <CheckCircle size={10} /> },
  rejected: { label: "驳回", color: "text-lab-red", bg: "bg-lab-red/10 border-lab-red/30", icon: <XCircle size={10} /> },
};

const PRIORITY_STYLES: Record<Priority, { label: string; color: string; bg: string; border: string; dot: string }> = {
  low: { label: "低", color: "text-lab-text-dim", bg: "bg-lab-text-dim/10", border: "border-lab-text-dim/30", dot: "bg-lab-text-dim" },
  normal: { label: "普通", color: "text-lab-cyan", bg: "bg-lab-cyan/10", border: "border-lab-cyan/30", dot: "bg-lab-cyan" },
  high: { label: "高", color: "text-lab-amber", bg: "bg-lab-amber/10", border: "border-lab-amber/30", dot: "bg-lab-amber" },
  urgent: { label: "紧急", color: "text-lab-red", bg: "bg-lab-red/10", border: "border-lab-red/30", dot: "bg-lab-red animate-pulse" },
};

interface RankingItemProps {
  result: ExperimentResult;
  rank: number;
}

function formatDeadline(ts: number | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isOverdue(ts: number | null): boolean {
  if (!ts) return false;
  return ts < Date.now();
}

export function RankingItem({ result, rank }: RankingItemProps) {
  const { deleteResult, toggleComparison, comparisonIds } = useExperimentStore();
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const isInComparison = comparisonIds.includes(result.id);
  const ratioValidation = validateRatios(result.params);
  const ratioTotal = result.params.ratioA + result.params.ratioB + result.params.ratioC;
  const overdue = result.approvalStatus === "pending" && isOverdue(result.deadline);

  const getRankIcon = () => {
    if (rank === 1) return <Trophy size={16} className="text-lab-amber" />;
    if (rank === 2) return <Medal size={16} className="text-lab-text-dim" />;
    if (rank === 3) return <Medal size={16} className="text-lab-amber/70" />;
    return <span className="text-lab-text-muted text-sm font-mono w-4 text-center">{rank}</span>;
  };

  const getRankBg = () => {
    if (overdue) return "bg-lab-red/8 border-lab-red/40";
    if (rank === 1) return "bg-lab-amber/10 border-lab-amber/30";
    if (rank === 2) return "bg-lab-text-dim/5 border-lab-text-dim/20";
    if (rank === 3) return "bg-lab-amber/5 border-lab-amber/20";
    return "bg-lab-panel-light border-lab-border";
  };

  const handleLoadParams = () => {
    useExperimentStore.setState({
      params: { ...result.params },
    });
    useExperimentStore.getState().recalculate();
  };

  const daysUntilDeadline = (() => {
    if (!result.deadline) return null;
    const diff = result.deadline - Date.now();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (overdue) {
      return Math.abs(hours) < 24
        ? `逾期 ${Math.abs(hours)} 小时`
        : `逾期 ${Math.floor(Math.abs(hours) / 24)} 天`;
    }
    if (hours < 24) return `${hours} 小时后截止`;
    return `${Math.floor(hours / 24)} 天后截止`;
  })();

  return (
    <div
      className={`p-3 rounded-lg border transition-all duration-200 animate-slide-in ${getRankBg()} ${
        isInComparison ? "ring-1 ring-lab-cyan/50" : ""
      } ${overdue ? "shadow-[0_0_0_1px_rgba(239,68,68,0.2)]" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-lab-panel border border-lab-border flex-shrink-0">
          {getRankIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: result.color, boxShadow: `0 0 6px ${result.color}60` }}
            />
            <span className="font-medium text-sm text-lab-text truncate">{result.name}</span>
            <span
              className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded border ${PRIORITY_STYLES[result.priority].color} ${PRIORITY_STYLES[result.priority].bg} ${PRIORITY_STYLES[result.priority].border}`}
              title={`优先级: ${PRIORITY_STYLES[result.priority].label}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_STYLES[result.priority].dot}`} />
              {PRIORITY_STYLES[result.priority].label}
            </span>
            {result.anomalyPoints.length > 0 && (
              <span
                className="text-xs text-lab-amber flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-lab-amber/10"
                title={`${result.anomalyPoints.length} 个异常点`}
              >
                <AlertTriangle size={10} />
                {result.anomalyPoints.length}
              </span>
            )}
            {overdue && (
              <span
                className="text-xs text-lab-red flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-lab-red/10 font-medium animate-pulse"
                title={daysUntilDeadline || ""}
              >
                <AlertOctagon size={10} />
                逾期
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            {result.batch && (
              <span className="text-[10px] font-mono text-lab-text-dim bg-lab-panel-light px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <Tag size={10} />
                {result.batch}
              </span>
            )}
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${RISK_TAG_STYLES[result.riskTag].color} ${RISK_TAG_STYLES[result.riskTag].bg}`}
            >
              {RISK_TAG_STYLES[result.riskTag].label}
            </span>
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded border flex items-center gap-0.5 ${
                overdue
                  ? "border-lab-red/30 bg-lab-red/10 text-lab-red"
                  : `${APPROVAL_STATUS_STYLES[result.approvalStatus].color} ${APPROVAL_STATUS_STYLES[result.approvalStatus].bg}`
              }`}
            >
              {overdue ? <AlertOctagon size={10} /> : APPROVAL_STATUS_STYLES[result.approvalStatus].icon}
              {overdue ? "逾期未审" : APPROVAL_STATUS_STYLES[result.approvalStatus].label}
            </span>
            {(result.approver || result.deadline) && (
              <div className="flex items-center gap-1.5 flex-wrap w-full mt-1">
                {result.approver && (
                  <span className="text-[10px] text-lab-text-dim bg-lab-panel-light/70 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <User size={9} />
                    {result.approver}
                  </span>
                )}
                {result.deadline && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                      overdue
                        ? "bg-lab-red/10 text-lab-red border border-lab-red/20 font-medium"
                        : daysUntilDeadline?.startsWith("1 天") || daysUntilDeadline?.endsWith("小时后截止")
                          ? "bg-lab-amber/10 text-lab-amber border border-lab-amber/20"
                          : "bg-lab-panel-light/70 text-lab-text-dim"
                    }`}
                    title={`截止: ${formatDeadline(result.deadline)}${daysUntilDeadline ? ` · ${daysUntilDeadline}` : ""}`}
                  >
                    <Calendar size={9} />
                    {formatDeadline(result.deadline)}
                    {daysUntilDeadline && (
                      <span className="opacity-75 ml-0.5">({daysUntilDeadline})</span>
                    )}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="mb-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-lab-text-muted">综合评分</span>
              <span className="font-mono font-semibold text-lab-cyan">{result.score}</span>
            </div>
            <div className="h-1.5 bg-lab-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${result.score}%`,
                  background: `linear-gradient(90deg, ${result.color}, #00e5ff)`,
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-xs mb-2">
            <div className="flex items-center gap-1">
              <span className="text-lab-text-muted">产率:</span>
              <span className="font-mono text-lab-green">{result.yieldRate}%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-lab-text-muted">稳定性:</span>
              <span className="font-mono text-lab-amber">{result.stability}</span>
            </div>
          </div>

          <div className="text-xs text-lab-text-muted truncate font-mono mb-2">
            {result.params.temperature}°C · {result.params.pressure}MPa · {result.params.reactionTime}h
          </div>

          {result.purpose && (
            <div className="mb-2 text-xs text-lab-text-dim bg-lab-panel-light/50 rounded px-2 py-1.5 line-clamp-2">
              <div className="flex items-start gap-1">
                <FileText size={10} className="mt-0.5 flex-shrink-0 text-lab-text-muted" />
                <span className="leading-relaxed">{result.purpose}</span>
              </div>
            </div>
          )}

          {result.approvalNote && (
            <div className="mb-2 text-xs text-lab-text-dim bg-lab-cyan/5 rounded px-2 py-1.5 line-clamp-2 border border-lab-cyan/20">
              <div className="flex items-start gap-1">
                <UserCheck size={10} className="mt-0.5 flex-shrink-0 text-lab-cyan" />
                <span className="leading-relaxed">
                  <span className="text-lab-cyan font-medium">审批意见：</span>
                  {result.approvalNote}
                </span>
              </div>
            </div>
          )}

          <div className="mb-1.5">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-lab-text-muted font-medium">原料配比</span>
              <span
                className={`font-mono font-semibold flex items-center gap-1 ${
                  ratioValidation.isValid ? "text-lab-green" : "text-lab-red"
                }`}
                title={
                  ratioValidation.isValid
                    ? "配比合规"
                    : !ratioValidation.allPositive
                      ? "存在负值或零值"
                      : !ratioValidation.allInRange
                        ? "配比超出参数范围"
                        : `总和 ${ratioTotal.toFixed(1)}%，不等于 100%`
                }
              >
                {ratioValidation.isValid ? (
                  <CheckCircle size={12} />
                ) : (
                  <XCircle size={12} />
                )}
                合计 {ratioTotal.toFixed(1)}%
              </span>
            </div>
            <div className="h-4 bg-lab-border rounded-full overflow-hidden flex">
              <div
                className="h-full flex items-center justify-center text-[9px] font-mono text-lab-bg font-semibold transition-all"
                style={{
                  width: `${result.params.ratioA}%`,
                  backgroundColor: "#ffb300",
                  minWidth: result.params.ratioA > 0 ? "18px" : "0px",
                }}
                title={`原料 A: ${result.params.ratioA}%`}
              >
                {result.params.ratioA >= 12 ? "A" : ""}
              </div>
              <div
                className="h-full flex items-center justify-center text-[9px] font-mono text-white font-semibold transition-all"
                style={{
                  width: `${result.params.ratioB}%`,
                  backgroundColor: "#c084fc",
                  minWidth: result.params.ratioB > 0 ? "18px" : "0px",
                }}
                title={`原料 B: ${result.params.ratioB}%`}
              >
                {result.params.ratioB >= 12 ? "B" : ""}
              </div>
              <div
                className="h-full flex items-center justify-center text-[9px] font-mono text-lab-bg font-semibold transition-all"
                style={{
                  width: `${result.params.ratioC}%`,
                  backgroundColor: "#fb923c",
                  minWidth: result.params.ratioC > 0 ? "18px" : "0px",
                }}
                title={`原料 C: ${result.params.ratioC}%`}
              >
                {result.params.ratioC >= 12 ? "C" : ""}
              </div>
            </div>
            <div className="flex justify-between text-[10px] font-mono mt-1 gap-2">
              <span className="flex items-center gap-1 truncate">
                <span
                  className="w-2 h-2 rounded-sm inline-block flex-shrink-0"
                  style={{ backgroundColor: "#ffb300" }}
                />
                <span className="text-lab-text-muted truncate">A</span>
                <span className="text-lab-amber tabular-nums">{result.params.ratioA}%</span>
              </span>
              <span className="flex items-center gap-1 truncate">
                <span
                  className="w-2 h-2 rounded-sm inline-block flex-shrink-0"
                  style={{ backgroundColor: "#c084fc" }}
                />
                <span className="text-lab-text-muted truncate">B</span>
                <span className="text-[#c084fc] tabular-nums">{result.params.ratioB}%</span>
              </span>
              <span className="flex items-center gap-1 truncate">
                <span
                  className="w-2 h-2 rounded-sm inline-block flex-shrink-0"
                  style={{ backgroundColor: "#fb923c" }}
                />
                <span className="text-lab-text-muted truncate">C</span>
                <span className="text-[#fb923c] tabular-nums">{result.params.ratioC}%</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-lab-border/50">
        <button
          onClick={() => toggleComparison(result.id)}
          className={`flex-1 py-1 text-xs rounded transition-colors flex items-center justify-center gap-1 ${
            isInComparison
              ? "bg-lab-cyan/20 text-lab-cyan border border-lab-cyan/30"
              : "text-lab-text-dim hover:bg-lab-panel hover:text-lab-text border border-transparent"
          }`}
          title={isInComparison ? "取消对比" : "加入对比"}
        >
          {isInComparison ? <EyeOff size={12} /> : <Eye size={12} />}
          {isInComparison ? "对比中" : "对比"}
        </button>
        <button
          onClick={handleLoadParams}
          className="flex-1 py-1 text-xs rounded border border-transparent
                     text-lab-text-dim hover:bg-lab-panel hover:text-lab-text transition-colors
                     flex items-center justify-center gap-1"
          title="加载参数"
        >
          <Copy size={12} />
          加载
        </button>
        <button
          onClick={() => setApprovalDialogOpen(true)}
          className={`flex-1 py-1 text-xs rounded border transition-colors flex items-center justify-center gap-1 ${
            overdue
              ? "bg-lab-red/20 text-lab-red border-lab-red/30"
              : result.approvalStatus === "approved"
                ? "bg-lab-green/20 text-lab-green border-lab-green/30"
                : result.approvalStatus === "rejected"
                  ? "bg-lab-red/20 text-lab-red border-lab-red/30"
                  : "text-lab-amber hover:bg-lab-amber/10 hover:text-lab-amber border-lab-amber/30"
          }`}
          title="审批"
        >
          {overdue ? <AlertOctagon size={12} /> : result.approvalStatus === "pending" ? <Clock size={12} /> : <UserCheck size={12} />}
          {overdue ? "逾期处理" : "审批"}
        </button>
        <button
          onClick={() => deleteResult(result.id)}
          className="p-1.5 rounded text-lab-text-muted hover:text-lab-red hover:bg-lab-red/10 transition-colors"
          title="删除"
        >
          <Trash2 size={12} />
        </button>
      </div>

      <ApprovalDialog
        open={approvalDialogOpen}
        result={result}
        onClose={() => setApprovalDialogOpen(false)}
      />
    </div>
  );
}
