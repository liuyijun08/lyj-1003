import { useState } from "react";
import {
  Trophy,
  ArrowUpDown,
  Trash2,
  X,
  Layers,
  Filter,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  ChevronDown,
  ChevronUp,
  Tag,
  FileText,
  AlertTriangle,
  RotateCcw,
  Check,
} from "lucide-react";
import { RankingItem } from "./RankingItem";
import type { SortField, RiskTag, ApprovalStatus } from "@/types";
import { useExperimentStore } from "@/store/useExperimentStore";

const SORT_OPTIONS: { key: SortField; label: string }[] = [
  { key: "score", label: "评分" },
  { key: "yieldRate", label: "产率" },
  { key: "stability", label: "稳定性" },
  { key: "priority", label: "优先级" },
  { key: "deadline", label: "截止" },
  { key: "createdAt", label: "时间" },
];

const RISK_FILTER_OPTIONS: { key: RiskTag | "all"; label: string; color: string }[] = [
  { key: "all", label: "全部", color: "text-lab-text-dim" },
  { key: "low", label: "低风险", color: "text-lab-green" },
  { key: "medium", label: "中风险", color: "text-lab-amber" },
  { key: "high", label: "高风险", color: "text-orange-400" },
  { key: "critical", label: "极高", color: "text-lab-red" },
];

const APPROVAL_FILTER_OPTIONS: {
  key: ApprovalStatus | "all";
  label: string;
  color: string;
  icon: React.ReactNode;
}[] = [
  { key: "all", label: "全部", color: "text-lab-text-dim", icon: null },
  { key: "pending", label: "待审", color: "text-lab-amber", icon: <Clock size={10} /> },
  { key: "approved", label: "通过", color: "text-lab-green", icon: <CheckCircle size={10} /> },
  { key: "rejected", label: "驳回", color: "text-lab-red", icon: <XCircle size={10} /> },
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
    filterApprovalStatus,
    setFilterApprovalStatus,
    filterBatches,
    filterPurposes,
    toggleFilterBatch,
    toggleFilterPurpose,
    clearAllFilters,
    getUniqueBatches,
    getUniquePurposes,
    searchKeyword,
    setSearchKeyword,
    savedResults,
  } = useExperimentStore();

  const [filterPanelOpen, setFilterPanelOpen] = useState(true);
  const [batchExpanded, setBatchExpanded] = useState(true);
  const [purposeExpanded, setPurposeExpanded] = useState(true);

  const filteredResults = getFilteredResults();
  const uniqueBatches = getUniqueBatches();
  const uniquePurposes = getUniquePurposes();
  const totalCount = savedResults.length;

  const hasActiveFilters =
    searchKeyword.trim() !== "" ||
    filterRiskTag !== null ||
    filterApprovalStatus !== null ||
    filterBatches.length > 0 ||
    filterPurposes.length > 0;

  const activeFilterCount =
    (searchKeyword.trim() !== "" ? 1 : 0) +
    (filterRiskTag !== null ? 1 : 0) +
    (filterApprovalStatus !== null ? 1 : 0) +
    filterBatches.length +
    filterPurposes.length;

  return (
    <div className="w-[320px] h-full flex flex-col lab-panel overflow-hidden">
      <div className="p-4 border-b border-lab-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-lab-amber" />
            <h2 className="text-lg font-semibold text-lab-text">方案评分榜</h2>
          </div>
          <div className="flex items-center gap-1">
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="p-1.5 rounded text-lab-text-muted hover:text-lab-cyan hover:bg-lab-cyan/10 transition-colors flex items-center gap-1"
                title="清空所有筛选条件"
              >
                <RotateCcw size={13} />
              </button>
            )}
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

        <div className="mb-2">
          <button
            onClick={() => setFilterPanelOpen(!filterPanelOpen)}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg bg-lab-panel-light border border-lab-border hover:bg-lab-panel-light/80 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Filter size={12} className="text-lab-cyan" />
              <span className="text-xs font-medium text-lab-text">组合筛选</span>
              {hasActiveFilters && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-lab-cyan/20 text-lab-cyan font-medium">
                  {activeFilterCount} 个条件
                </span>
              )}
            </div>
            {filterPanelOpen ? (
              <ChevronUp size={14} className="text-lab-text-muted" />
            ) : (
              <ChevronDown size={14} className="text-lab-text-muted" />
            )}
          </button>
        </div>

        {filterPanelOpen && (
          <div className="space-y-2.5 animate-fade-in">
            {uniqueBatches.length > 0 && (
              <div className="rounded-lg border border-lab-border bg-lab-panel-light/50 overflow-hidden">
                <button
                  onClick={() => setBatchExpanded(!batchExpanded)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-lab-panel-light/50 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <Tag size={11} className="text-lab-text-muted" />
                    <span className="text-xs font-medium text-lab-text-dim">按批次</span>
                    {filterBatches.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-lab-cyan/15 text-lab-cyan font-medium">
                        已选 {filterBatches.length}
                      </span>
                    )}
                  </div>
                  {batchExpanded ? (
                    <ChevronUp size={12} className="text-lab-text-muted" />
                  ) : (
                    <ChevronDown size={12} className="text-lab-text-muted" />
                  )}
                </button>
                {batchExpanded && (
                  <div className="px-2.5 pb-2 flex flex-wrap gap-1.5 border-t border-lab-border/50 pt-2">
                    {uniqueBatches.map((batch) => {
                      const isActive = filterBatches.includes(batch);
                      const count = savedResults.filter((r) => r.batch === batch).length;
                      return (
                        <button
                          key={batch}
                          onClick={() => toggleFilterBatch(batch)}
                          className={`px-2 py-1 text-[11px] rounded transition-colors border flex items-center gap-1 ${
                            isActive
                              ? "bg-lab-cyan/15 text-lab-cyan border-lab-cyan/30"
                              : "bg-lab-panel text-lab-text-muted border-lab-border hover:text-lab-text-dim hover:border-lab-text-muted/30"
                          }`}
                        >
                          {isActive && <Check size={10} />}
                          <span className="font-mono">{batch}</span>
                          <span className={`text-[9px] ${isActive ? "text-lab-cyan/70" : "text-lab-text-muted/60"}`}>
                            ×{count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {uniquePurposes.length > 0 && (
              <div className="rounded-lg border border-lab-border bg-lab-panel-light/50 overflow-hidden">
                <button
                  onClick={() => setPurposeExpanded(!purposeExpanded)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-lab-panel-light/50 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <FileText size={11} className="text-lab-text-muted" />
                    <span className="text-xs font-medium text-lab-text-dim">按目的</span>
                    {filterPurposes.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-lab-green/15 text-lab-green font-medium">
                        已选 {filterPurposes.length}
                      </span>
                    )}
                  </div>
                  {purposeExpanded ? (
                    <ChevronUp size={12} className="text-lab-text-muted" />
                  ) : (
                    <ChevronDown size={12} className="text-lab-text-muted" />
                  )}
                </button>
                {purposeExpanded && (
                  <div className="px-2.5 pb-2 flex flex-wrap gap-1.5 border-t border-lab-border/50 pt-2 max-h-[120px] overflow-y-auto">
                    {uniquePurposes.map((purpose) => {
                      const isActive = filterPurposes.includes(purpose);
                      const count = savedResults.filter((r) => r.purpose === purpose).length;
                      const displayText = purpose.length > 16 ? purpose.slice(0, 16) + "..." : purpose;
                      return (
                        <button
                          key={purpose}
                          onClick={() => toggleFilterPurpose(purpose)}
                          className={`px-2 py-1 text-[11px] rounded transition-colors border flex items-center gap-1 ${
                            isActive
                              ? "bg-lab-green/15 text-lab-green border-lab-green/30"
                              : "bg-lab-panel text-lab-text-muted border-lab-border hover:text-lab-text-dim hover:border-lab-text-muted/30"
                          }`}
                          title={purpose}
                        >
                          {isActive && <Check size={10} />}
                          <span>{displayText}</span>
                          <span className={`text-[9px] ${isActive ? "text-lab-green/70" : "text-lab-text-muted/60"}`}>
                            ×{count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <AlertTriangle size={11} className="text-lab-text-muted flex-shrink-0" />
              <div className="flex-1 flex gap-1 overflow-x-auto pb-0.5">
                {RISK_FILTER_OPTIONS.map((opt) => {
                  const isActive =
                    (opt.key === "all" && filterRiskTag === null) || opt.key === filterRiskTag;
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

            <div className="flex items-center gap-2">
              <CheckCircle size={11} className="text-lab-text-muted flex-shrink-0" />
              <div className="flex-1 flex gap-1 overflow-x-auto pb-0.5">
                {APPROVAL_FILTER_OPTIONS.map((opt) => {
                  const isActive =
                    (opt.key === "all" && filterApprovalStatus === null) ||
                    opt.key === filterApprovalStatus;
                  return (
                    <button
                      key={opt.key}
                      onClick={() =>
                        setFilterApprovalStatus(opt.key === "all" ? null : (opt.key as ApprovalStatus))
                      }
                      className={`px-2 py-0.5 text-xs rounded whitespace-nowrap transition-colors border flex items-center gap-1 ${
                        isActive
                          ? `${opt.color} bg-current/10 border-current/30`
                          : "text-lab-text-muted hover:text-lab-text-dim border-transparent"
                      }`}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
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
              {hasActiveFilters ? "未找到匹配的方案" : "暂无保存的方案"}
            </p>
            <p className="text-xs text-lab-text-muted">
              {hasActiveFilters
                ? "尝试调整筛选条件或点击重置按钮"
                : '调节参数后点击"保存方案"'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="mt-4 px-3 py-1.5 text-xs rounded-lg bg-lab-cyan/15 text-lab-cyan border border-lab-cyan/30 hover:bg-lab-cyan/25 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw size={12} />
                重置所有筛选
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredResults.map((result, index) => (
              <RankingItem key={result.id} result={result} rank={index + 1} />
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-2 border-t border-lab-border text-xs text-lab-text-muted text-center flex items-center justify-center gap-2">
        {hasActiveFilters ? (
          <>
            <span>
              命中 <span className="font-semibold text-lab-cyan">{filteredResults.length}</span> / 共{" "}
              <span className="font-semibold text-lab-text-dim">{totalCount}</span> 个方案
            </span>
            <button
              onClick={clearAllFilters}
              className="text-lab-text-muted hover:text-lab-cyan transition-colors flex items-center gap-0.5"
              title="清空所有筛选条件"
            >
              <X size={10} />
              重置
            </button>
          </>
        ) : (
          <span>共 {totalCount} 个方案</span>
        )}
      </div>
    </div>
  );
}
