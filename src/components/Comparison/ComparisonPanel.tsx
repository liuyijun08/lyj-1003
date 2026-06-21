import { Layers, X } from "lucide-react";
import { useExperimentStore } from "@/store/useExperimentStore";

export function ComparisonPanel() {
  const { savedResults, comparisonIds, toggleComparison, clearComparison } = useExperimentStore();
  const comparisonResults = savedResults.filter((r) => comparisonIds.includes(r.id));

  if (comparisonResults.length === 0) return null;

  return (
    <div className="lab-panel p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-lab-cyan" />
          <h3 className="text-sm font-semibold text-lab-text">批量对比</h3>
        </div>
        <button
          onClick={clearComparison}
          className="text-xs text-lab-text-muted hover:text-lab-text-dim transition-colors flex items-center gap-1"
        >
          <X size={12} />
          清空
        </button>
      </div>

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
    </div>
  );
}
