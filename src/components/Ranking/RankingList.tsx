import { Trophy, ArrowUpDown, Trash2, X, Layers, Filter, Search } from "lucide-react";
import { RankingItem } from "./RankingItem";
import type { SortField, RiskTag } from "@/types";
import { useExperimentStore } from "@/store/useExperimentStore";

const SORT_OPTIONS: { key: SortField; label: string }[] = [
  { key: "score", label: "评分" },
  { key: "yieldRate", label: "产率" },
  { key: "stability", label: "稳定性" },
  { key: "createdAt", label: "时间" },
];

const RISK_FILTER_OPTIONS: { key: RiskTag | "all"; label: string; color: string }[] = [
  { key: "all", label: "全部", color: "text-lab-text-dim" },
  { key: "low", label: "低风险", color: "text-lab-green" },
  { key: "medium", label: "中风险", color: "text-lab-amber" },
  { key: "high", label: "高风险", color: "text-orange-400" },
  { key: "critical", label: "极高", color: "text-lab-red" },
];

export function RankingList() {
  const {
    sortField,
    sortOrder,
    setSortField,
    toggleSortOrder,
    clearResults,
    getFilteredResults,
    comparisonIds,
    clearComparison,
    filterRiskTag,
    setFilterRiskTag,
    searchKeyword,
    setSearchKeyword,
  } = useExperimentStore();

  const filteredResults = getFilteredResults();

  return (
    <div className="w-[320px] h-full flex flex-col lab-panel overflow-hidden">
      <div className="p-4 border-b border-lab-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-lab-amber" />
            <h2 className="text-lg font-semibold text-lab-text">方案评分榜</h2>
          </div>
          {filteredResults.length > 0 && (
            <button
              onClick={clearResults}
              className="p-1.5 rounded text-lab-text-muted hover:text-lab-red hover:bg-lab-red/10 transition-colors"
              title="清空所有方案"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 flex gap-1 overflow-x-auto pb-0.5">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortField(opt.key)}
                className={`px-2 py-1 text-xs rounded whitespace-nowrap transition-colors ${
                  sortField === opt.key
                    ? "bg-lab-cyan/20 text-lab-cyan border border-lab-cyan/30"
                    : "text-lab-text-muted hover:text-lab-text-dim border border-transparent"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={toggleSortOrder}
            className="p-1.5 rounded text-lab-text-dim hover:text-lab-text hover:bg-lab-panel-light transition-colors"
            title={sortOrder === "desc" ? "降序排列" : "升序排列"}
          >
            <ArrowUpDown size={14} className={sortOrder === "asc" ? "rotate-180" : ""} />
          </button>
        </div>

        <div className="relative mb-3">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-lab-text-muted pointer-events-none"
          />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="搜索名称、批次、目的..."
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-lab-panel-light border border-lab-border
                       text-lab-text text-sm placeholder:text-lab-text-muted
                       focus:outline-none focus:border-lab-cyan/50 focus:ring-1 focus:ring-lab-cyan/30
                       transition-colors"
          />
          {searchKeyword && (
            <button
              onClick={() => setSearchKeyword("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded
                         text-lab-text-muted hover:text-lab-text transition-colors"
              title="清除搜索"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Filter size={12} className="text-lab-text-muted flex-shrink-0" />
          <div className="flex-1 flex gap-1 overflow-x-auto pb-0.5">
            {RISK_FILTER_OPTIONS.map((opt) => {
              const isActive =
                (opt.key === "all" && filterRiskTag === null) ||
                opt.key === filterRiskTag;
              return (
                <button
                  key={opt.key}
                  onClick={() => setFilterRiskTag(opt.key === "all" ? null : (opt.key as RiskTag))}
                  className={`px-2 py-0.5 text-xs rounded whitespace-nowrap transition-colors border ${
                    isActive
                      ? `${opt.color} bg-current/10 border-current/30`
                      : "text-lab-text-muted hover:text-lab-text-dim border-transparent"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {comparisonIds.length > 0 && (
        <div className="px-4 py-2 border-b border-lab-border bg-lab-cyan/5 flex items-center gap-2 text-xs">
          <Layers size={12} className="text-lab-cyan" />
          <span className="text-lab-text-dim">
            <span className="text-lab-cyan font-semibold">{comparisonIds.length}</span> 个方案对比中
          </span>
          <button
            onClick={clearComparison}
            className="ml-auto p-1 rounded text-lab-text-muted hover:text-lab-text hover:bg-lab-panel-light transition-colors"
            title="清空对比"
          >
            <X size={12} />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {filteredResults.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-8">
            <div className="w-16 h-16 rounded-full bg-lab-panel-light flex items-center justify-center mb-3">
              <Trophy size={28} className="text-lab-text-muted" />
            </div>
            <p className="text-sm text-lab-text-dim mb-1">
              {searchKeyword
                ? "未找到匹配的方案"
                : filterRiskTag
                  ? "该标签下暂无方案"
                  : "暂无保存的方案"}
            </p>
            <p className="text-xs text-lab-text-muted">
              {searchKeyword
                ? "尝试其他关键词或清除搜索"
                : filterRiskTag
                  ? "尝试切换其他标签筛选"
                  : "调节参数后点击\"保存方案\""}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredResults.map((result, index) => (
              <RankingItem key={result.id} result={result} rank={index + 1} />
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-2 border-t border-lab-border text-xs text-lab-text-muted text-center">
        {searchKeyword || filterRiskTag
          ? `筛选结果 ${filteredResults.length} 个`
          : `共 ${filteredResults.length} 个方案`}
      </div>
    </div>
  );
}
