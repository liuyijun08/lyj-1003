import { useState } from "react";
import { Layers, X, Table2, LayoutList, Trophy, AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp, Minus } from "lucide-react";
import { useExperimentStore } from "@/store/useExperimentStore";
import type { RiskTag, ApprovalStatus } from "@/types";

const RISK_TAG_STYLES: Record<RiskTag, { label: string; color: string; bg: string }> = {
  low: { label: "低风险", color: "text-lab-green", bg: "bg-lab-green/10 border-lab-green/30" },
  medium: { label: "中风险", color: "text-lab-amber", bg: "bg-lab-amber/10 border-lab-amber/30" },
  high: { label: "高风险", color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/30" },
  critical: { label: "极高风险", color: "text-lab-red", bg: "bg-lab-red/10 border-lab-red/30" },
};

const RISK_RANK: Record<RiskTag, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const APPROVAL_STATUS_STYLES: Record<ApprovalStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: { label: "待审", color: "text-lab-amber", bg: "bg-lab-amber/10 border-lab-amber/30", icon: <Clock size={10} /> },
  approved: { label: "通过", color: "text-lab-green", bg: "bg-lab-green/10 border-lab-green/30", icon: <CheckCircle size={10} /> },
  rejected: { label: "驳回", color: "text-lab-red", bg: "bg-lab-red/10 border-lab-red/30", icon: <XCircle size={10} /> },
};

type ViewMode = "tags" | "matrix";

export function ComparisonPanel() {
  const { savedResults, comparisonIds, toggleComparison, clearComparison } = useExperimentStore();
  const [viewMode, setViewMode] = useState<ViewMode>("tags");
  const comparisonResults = savedResults.filter((r) => comparisonIds.includes(r.id));

  if (comparisonResults.length === 0) return null;

  const maxScore = Math.max(...comparisonResults.map((r) => r.score));
  const minScore = Math.min(...comparisonResults.map((r) => r.score));
  const maxRisk = Math.max(...comparisonResults.map((r) => RISK_RANK[r.riskTag]));
  const minRisk = Math.min(...comparisonResults.map((r) => RISK_RANK[r.riskTag]));
  const approvalStatuses = new Set(comparisonResults.map((r) => r.approvalStatus));

  const getScoreDiffIndicator = (score: number) => {
    if (comparisonResults.length < 2) return null;
    if (score === maxScore && score !== minScore) {
      return <TrendingUp size={10} className="text-lab-green" />;
    }
    if (score === minScore && score !== maxScore) {
      return <TrendingUp size={10} className="text-lab-red rotate-180" />;
    }
    return <Minus size={10} className="text-lab-text-muted" />;
  };

  const getRiskDiffIndicator = (risk: RiskTag) => {
    if (comparisonResults.length < 2) return null;
    if (RISK_RANK[risk] === minRisk && RISK_RANK[risk] !== maxRisk) {
      return <span className="text-[9px] text-lab-green ml-1">最优</span>;
    }
    if (RISK_RANK[risk] === maxRisk && RISK_RANK[risk] !== minRisk) {
      return <span className="text-[9px] text-lab-red ml-1">最高</span>;
    }
    return null;
  };

  return (
    <div className="lab-panel p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-lab-cyan" />
          <h3 className="text-sm font-semibold text-lab-text">批量对比</h3>
          <span className="text-xs text-lab-text-muted">({comparisonResults.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {comparisonResults.length >= 2 && (
            <div className="flex bg-lab-panel-light rounded border border-lab-border overflow-hidden">
              <button
                onClick={() => setViewMode("tags")}
                className={`px-2 py-1 text-xs flex items-center gap-1 transition-colors ${
                  viewMode === "tags"
                    ? "bg-lab-cyan/20 text-lab-cyan"
                    : "text-lab-text-muted hover:text-lab-text-dim"
                }`}
                title="标签视图"
              >
                <LayoutList size={12} />
              </button>
              <button
                onClick={() => setViewMode("matrix")}
                className={`px-2 py-1 text-xs flex items-center gap-1 transition-colors ${
                  viewMode === "matrix"
                    ? "bg-lab-cyan/20 text-lab-cyan"
                    : "text-lab-text-muted hover:text-lab-text-dim"
                }`}
                title="审批差异矩阵"
              >
                <Table2 size={12} />
              </button>
            </div>
          )}
          <button
            onClick={clearComparison}
            className="text-xs text-lab-text-muted hover:text-lab-text-dim transition-colors flex items-center gap-1"
          >
            <X size={12} />
            清空
          </button>
        </div>
      </div>

      {viewMode === "tags" ? (
        <div className="flex flex-wrap gap-2">
          {comparisonResults.map((result) => (
            <div
              key={result.id}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-lab-panel-light border border-lab-border"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: result.color, boxShadow: `0 0 6px ${result.color}60` }}
              />
              <span className="text-xs text-lab-text">{result.name}</span>
              <span className="text-xs font-mono text-lab-cyan">{result.score}</span>
              <button
                onClick={() => toggleComparison(result.id)}
                className="p-0.5 rounded text-lab-text-muted hover:text-lab-text transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-lab-border">
                <th className="text-left py-2 px-2 text-lab-text-muted font-medium w-[140px] min-w-[140px]">方案</th>
                <th className="text-center py-2 px-2 text-lab-text-muted font-medium min-w-[90px]">
                  <div className="flex items-center justify-center gap-1">
                    <Trophy size={11} className="text-lab-amber" />
                    综合评分
                  </div>
                </th>
                <th className="text-center py-2 px-2 text-lab-text-muted font-medium min-w-[90px]">
                  <div className="flex items-center justify-center gap-1">
                    <AlertTriangle size={11} className="text-lab-amber" />
                    风险等级
                  </div>
                </th>
                <th className="text-center py-2 px-2 text-lab-text-muted font-medium min-w-[90px]">
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle size={11} className="text-lab-green" />
                    审批状态
                  </div>
                </th>
                <th className="text-center py-2 px-2 text-lab-text-muted font-medium min-w-[100px]">产率</th>
                <th className="text-center py-2 px-2 text-lab-text-muted font-medium min-w-[80px]">稳定性</th>
                <th className="text-center py-2 px-1 text-lab-text-muted font-medium w-[32px]"></th>
              </tr>
            </thead>
            <tbody>
              {comparisonResults.map((result, idx) => (
                <tr
                  key={result.id}
                  className={`border-b border-lab-border/50 hover:bg-lab-panel-light/50 transition-colors ${
                    idx % 2 === 1 ? "bg-lab-panel-light/20" : ""
                  }`}
                >
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: result.color, boxShadow: `0 0 6px ${result.color}60` }}
                      />
                      <span className="text-lab-text truncate max-w-[100px]" title={result.name}>
                        {result.name}
                      </span>
                    </div>
                    {result.batch && (
                      <div className="text-[10px] text-lab-text-muted font-mono mt-0.5">{result.batch}</div>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span
                        className={`font-mono font-semibold ${
                          comparisonResults.length >= 2
                            ? result.score === maxScore
                              ? "text-lab-green"
                              : result.score === minScore
                                ? "text-lab-red"
                                : "text-lab-cyan"
                            : "text-lab-cyan"
                        }`}
                      >
                        {result.score}
                      </span>
                      {getScoreDiffIndicator(result.score)}
                    </div>
                    <div className="h-1 bg-lab-border rounded-full mt-1 overflow-hidden max-w-[70px] mx-auto">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${result.score}%`,
                          background: comparisonResults.length >= 2
                            ? result.score === maxScore
                              ? "linear-gradient(90deg, #22c55e, #4ade80)"
                              : result.score === minScore
                                ? "linear-gradient(90deg, #ef4444, #f87171)"
                                : `linear-gradient(90deg, ${result.color}, #00e5ff)`
                            : `linear-gradient(90deg, ${result.color}, #00e5ff)`,
                        }}
                      />
                    </div>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <div className="flex items-center justify-center">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded border ${RISK_TAG_STYLES[result.riskTag].color} ${RISK_TAG_STYLES[result.riskTag].bg}`}
                      >
                        {RISK_TAG_STYLES[result.riskTag].label}
                        {getRiskDiffIndicator(result.riskTag)}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded border ${APPROVAL_STATUS_STYLES[result.approvalStatus].color} ${APPROVAL_STATUS_STYLES[result.approvalStatus].bg}`}
                    >
                      {APPROVAL_STATUS_STYLES[result.approvalStatus].icon}
                      {APPROVAL_STATUS_STYLES[result.approvalStatus].label}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center font-mono text-lab-green">{result.yieldRate}%</td>
                  <td className="py-2 px-2 text-center font-mono text-lab-amber">{result.stability}</td>
                  <td className="py-2 px-1 text-center">
                    <button
                      onClick={() => toggleComparison(result.id)}
                      className="p-1 rounded text-lab-text-muted hover:text-lab-red hover:bg-lab-red/10 transition-colors"
                      title="移除对比"
                    >
                      <X size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {comparisonResults.length >= 2 && (
            <div className="mt-3 pt-3 border-t border-lab-border space-y-2">
              <div className="text-xs text-lab-text-muted">
                <span className="font-medium text-lab-text-dim">差异统计：</span>
                <span className="ml-2">评分差</span>
                <span className="ml-1 font-mono text-lab-cyan">{(maxScore - minScore).toFixed(1)}</span>
                <span className="mx-2">·</span>
                <span>审批状态</span>
                <span className={`ml-1 font-medium ${approvalStatuses.size > 1 ? "text-lab-amber" : "text-lab-green"}`}>
                  {approvalStatuses.size === 1 ? "一致" : `${approvalStatuses.size} 种`}
                </span>
                {RISK_RANK && (
                  <>
                    <span className="mx-2">·</span>
                    <span>风险跨度</span>
                    <span className={`ml-1 font-medium ${maxRisk !== minRisk ? "text-lab-amber" : "text-lab-green"}`}>
                      {maxRisk === minRisk
                        ? RISK_TAG_STYLES[comparisonResults[0].riskTag].label
                        : `${RISK_TAG_STYLES[Object.keys(RISK_RANK).find((k) => RISK_RANK[k as RiskTag] === minRisk) as RiskTag].label} ~ ${RISK_TAG_STYLES[Object.keys(RISK_RANK).find((k) => RISK_RANK[k as RiskTag] === maxRisk) as RiskTag].label}`}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

