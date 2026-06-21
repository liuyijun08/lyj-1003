import { Trash2, Copy, AlertTriangle, Eye, EyeOff, Trophy, Medal, CheckCircle, XCircle } from "lucide-react";
import type { ExperimentResult } from "@/types";
import { useExperimentStore, validateRatios } from "@/store/useExperimentStore";

interface RankingItemProps {
  result: ExperimentResult;
  rank: number;
}

export function RankingItem({ result, rank }: RankingItemProps) {
  const { deleteResult, toggleComparison, comparisonIds } = useExperimentStore();
  const isInComparison = comparisonIds.includes(result.id);
  const ratioValidation = validateRatios(result.params);
  const ratioTotal = result.params.ratioA + result.params.ratioB + result.params.ratioC;

  const getRankIcon = () => {
    if (rank === 1) return <Trophy size={16} className="text-lab-amber" />;
    if (rank === 2) return <Medal size={16} className="text-lab-text-dim" />;
    if (rank === 3) return <Medal size={16} className="text-lab-amber/70" />;
    return <span className="text-lab-text-muted text-sm font-mono w-4 text-center">{rank}</span>;
  };

  const getRankBg = () => {
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

  return (
    <div
      className={`p-3 rounded-lg border transition-all duration-200 animate-slide-in ${getRankBg()} ${
        isInComparison ? "ring-1 ring-lab-cyan/50" : ""
      }`}
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
            {result.anomalyPoints.length > 0 && (
              <span
                className="text-xs text-lab-amber flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-lab-amber/10"
                title={`${result.anomalyPoints.length} 个异常点`}
              >
                <AlertTriangle size={10} />
                {result.anomalyPoints.length}
              </span>
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
          onClick={() => deleteResult(result.id)}
          className="p-1.5 rounded text-lab-text-muted hover:text-lab-red hover:bg-lab-red/10 transition-colors"
          title="删除"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
