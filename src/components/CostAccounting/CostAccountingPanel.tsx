import { useState } from "react";
import {
  DollarSign,
  Zap,
  Leaf,
  ArrowUpDown,
  Settings,
  X,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Gauge,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from "lucide-react";
import { useExperimentStore } from "@/store/useExperimentStore";
import type { CostSortField } from "@/types";
import {
  formatCurrency,
  formatCarbon,
  formatEnergy,
} from "@/utils/costCalculator";

const SORT_OPTIONS: { key: CostSortField; label: string; icon: React.ReactNode }[] = [
  { key: "totalCost", label: "总成本", icon: <DollarSign size={10} /> },
  { key: "electricityCost", label: "电费", icon: <Zap size={10} /> },
  { key: "carbonEmission", label: "碳排", icon: <Leaf size={10} /> },
  { key: "score", label: "评分", icon: <Gauge size={10} /> },
];

function BudgetProgressBar({
  value,
  max,
  label,
  unit,
  color,
}: {
  value: number;
  max: number;
  label: string;
  unit: string;
  color: string;
}) {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const isOver = value > max;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-lab-text-muted">{label}</span>
        <span className={`font-mono font-medium ${isOver ? "text-lab-red" : color}`}>
          {value.toFixed(1)} / {max.toFixed(1)} {unit}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-lab-panel-light overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isOver
              ? "bg-gradient-to-r from-lab-red/70 to-lab-red"
              : `bg-gradient-to-r ${color.replace('text-', 'from-').replace('cyan', 'lab-cyan/70').replace('green', 'lab-green/70')} to-current`
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function CostAccountingPanel() {
  const {
    params,
    energyCostConfig,
    costBudget,
    costSortField,
    costSortOrder,
    costShowOverBudgetOnly,
    setEnergyCostConfig,
    setCostBudget,
    setCostSortField,
    toggleCostSortOrder,
    toggleCostShowOverBudgetOnly,
    calculateCurrentCost,
    getCostSortedResults,
    savedResults,
  } = useExperimentStore();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [budgetExpanded, setBudgetExpanded] = useState(true);

  const currentCost = calculateCurrentCost();
  const sortedResults = getCostSortedResults();
  const totalCount = savedResults.length;

  const currentOverBudget =
    currentCost.electricityCost > costBudget.electricityBudget ||
    currentCost.carbonEmission > costBudget.carbonBudget ||
    currentCost.totalCost > costBudget.totalBudget;

  const overBudgetCount = sortedResults.filter((r) => r.overBudget).length;

  return (
    <div className="w-[340px] h-full flex flex-col lab-panel overflow-hidden">
      <div className="p-4 border-b border-lab-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-lab-amber/20 to-lab-green/20 flex items-center justify-center">
              <DollarSign size={16} className="text-lab-amber" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-lab-text">成本核算面板</h2>
              <p className="text-[10px] text-lab-text-muted">能耗 & 碳排成本分析</p>
            </div>
          </div>
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className={`p-2 rounded-lg transition-colors ${
              settingsOpen
                ? "bg-lab-cyan/20 text-lab-cyan"
                : "text-lab-text-muted hover:text-lab-text hover:bg-lab-panel-light"
            }`}
            title="成本设置"
          >
            <Settings size={15} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="p-2.5 rounded-lg bg-lab-panel-light border border-lab-border/50">
            <div className="flex items-center gap-1 mb-1">
              <Zap size={11} className="text-lab-amber" />
              <span className="text-[10px] text-lab-text-muted">电费</span>
            </div>
            <div className={`font-mono text-sm font-bold ${
              currentCost.electricityCost > costBudget.electricityBudget
                ? "text-lab-red"
                : "text-lab-amber"
            }`}>
              {formatCurrency(currentCost.electricityCost)}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-lab-panel-light border border-lab-border/50">
            <div className="flex items-center gap-1 mb-1">
              <Leaf size={11} className="text-lab-green" />
              <span className="text-[10px] text-lab-text-muted">碳排</span>
            </div>
            <div className={`font-mono text-sm font-bold ${
              currentCost.carbonEmission > costBudget.carbonBudget
                ? "text-lab-red"
                : "text-lab-green"
            }`}>
              {formatCarbon(currentCost.carbonEmission)}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-lab-panel-light border border-lab-border/50">
            <div className="flex items-center gap-1 mb-1">
              <DollarSign size={11} className="text-lab-cyan" />
              <span className="text-[10px] text-lab-text-muted">总成本</span>
            </div>
            <div className={`font-mono text-sm font-bold ${
              currentCost.totalCost > costBudget.totalBudget
                ? "text-lab-red"
                : "text-lab-cyan"
            }`}>
              {formatCurrency(currentCost.totalCost)}
            </div>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-lab-panel-light border border-lab-border/50 mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Gauge size={11} className="text-lab-text-muted" />
            <span className="text-[11px] font-medium text-lab-text-dim">能耗明细</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex justify-between">
              <span className="text-lab-text-muted">温度</span>
              <span className="font-mono text-lab-text-dim">{params.temperature}°C</span>
            </div>
            <div className="flex justify-between">
              <span className="text-lab-text-muted">压力</span>
              <span className="font-mono text-lab-text-dim">{params.pressure} MPa</span>
            </div>
            <div className="flex justify-between">
              <span className="text-lab-text-muted">时长</span>
              <span className="font-mono text-lab-text-dim">{params.reactionTime} h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-lab-text-muted">用电量</span>
              <span className="font-mono text-lab-text-dim">
                {formatEnergy(currentCost.electricityConsumption)}
              </span>
            </div>
          </div>
        </div>

        <div>
          <button
            onClick={() => setBudgetExpanded(!budgetExpanded)}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg bg-lab-panel-light border border-lab-border hover:bg-lab-panel-light/80 transition-colors mb-2"
          >
            <div className="flex items-center gap-1.5">
              {currentOverBudget ? (
                <AlertTriangle size={12} className="text-lab-red" />
              ) : (
                <CheckCircle2 size={12} className="text-lab-green" />
              )}
              <span className="text-xs font-medium text-lab-text">预算执行</span>
              {currentOverBudget && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-lab-red/20 text-lab-red font-medium">
                  超预算
                </span>
              )}
            </div>
            {budgetExpanded ? (
              <ChevronUp size={13} className="text-lab-text-muted" />
            ) : (
              <ChevronDown size={13} className="text-lab-text-muted" />
            )}
          </button>

          {budgetExpanded && (
            <div className="space-y-2 animate-fade-in">
              <BudgetProgressBar
                value={currentCost.electricityCost}
                max={costBudget.electricityBudget}
                label="电费预算"
                unit="元"
                color="text-lab-amber"
              />
              <BudgetProgressBar
                value={currentCost.carbonEmission}
                max={costBudget.carbonBudget}
                label="碳排预算"
                unit="kg"
                color="text-lab-green"
              />
              <BudgetProgressBar
                value={currentCost.totalCost}
                max={costBudget.totalBudget}
                label="总成本预算"
                unit="元"
                color="text-lab-cyan"
              />
            </div>
          )}
        </div>
      </div>

      {settingsOpen && (
        <div className="px-4 py-3 border-b border-lab-border bg-lab-panel-light/50 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-lab-text">成本参数设置</span>
            <button
              onClick={() => setSettingsOpen(false)}
              className="p-1 rounded text-lab-text-muted hover:text-lab-text hover:bg-lab-panel transition-colors"
            >
              <X size={12} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-lab-text-muted mb-1 block">
                电价 (元/kWh)
              </label>
              <input
                type="number"
                value={energyCostConfig.electricityPrice}
                onChange={(e) =>
                  setEnergyCostConfig({
                    electricityPrice: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-2 py-1.5 rounded-lg bg-lab-panel border border-lab-border
                           text-lab-text text-xs font-mono
                           focus:outline-none focus:border-lab-cyan/50 focus:ring-1 focus:ring-lab-cyan/30
                           transition-colors"
                step="0.01"
              />
            </div>
            <div>
              <label className="text-[10px] text-lab-text-muted mb-1 block">
                碳排因子 (kg/kWh)
              </label>
              <input
                type="number"
                value={energyCostConfig.carbonFactor}
                onChange={(e) =>
                  setEnergyCostConfig({
                    carbonFactor: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-2 py-1.5 rounded-lg bg-lab-panel border border-lab-border
                           text-lab-text text-xs font-mono
                           focus:outline-none focus:border-lab-cyan/50 focus:ring-1 focus:ring-lab-cyan/30
                           transition-colors"
                step="0.01"
              />
            </div>
          </div>

          <div className="h-px bg-lab-border/50" />

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-lab-text-muted mb-1 block">
                电费预算
              </label>
              <input
                type="number"
                value={costBudget.electricityBudget}
                onChange={(e) =>
                  setCostBudget({
                    electricityBudget: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-2 py-1.5 rounded-lg bg-lab-panel border border-lab-border
                           text-lab-text text-xs font-mono
                           focus:outline-none focus:border-lab-cyan/50 focus:ring-1 focus:ring-lab-cyan/30
                           transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] text-lab-text-muted mb-1 block">
                碳排预算 (kg)
              </label>
              <input
                type="number"
                value={costBudget.carbonBudget}
                onChange={(e) =>
                  setCostBudget({
                    carbonBudget: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-2 py-1.5 rounded-lg bg-lab-panel border border-lab-border
                           text-lab-text text-xs font-mono
                           focus:outline-none focus:border-lab-cyan/50 focus:ring-1 focus:ring-lab-cyan/30
                           transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] text-lab-text-muted mb-1 block">
                总预算
              </label>
              <input
                type="number"
                value={costBudget.totalBudget}
                onChange={(e) =>
                  setCostBudget({
                    totalBudget: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-2 py-1.5 rounded-lg bg-lab-panel border border-lab-border
                           text-lab-text text-xs font-mono
                           focus:outline-none focus:border-lab-cyan/50 focus:ring-1 focus:ring-lab-cyan/30
                           transition-colors"
              />
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-2 border-b border-lab-border">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 flex gap-1 overflow-x-auto pb-0.5">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setCostSortField(opt.key)}
                className={`px-2 py-1 text-[11px] rounded whitespace-nowrap transition-colors flex items-center gap-1 ${
                  costSortField === opt.key
                    ? "bg-lab-cyan/20 text-lab-cyan border border-lab-cyan/30"
                    : "text-lab-text-muted hover:text-lab-text-dim border border-transparent"
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={toggleCostSortOrder}
            className="p-1.5 rounded text-lab-text-dim hover:text-lab-text hover:bg-lab-panel-light transition-colors flex-shrink-0"
            title={costSortOrder === "desc" ? "降序" : "升序"}
          >
            <ArrowUpDown
              size={13}
              className={costSortOrder === "asc" ? "rotate-180" : ""}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={costShowOverBudgetOnly}
              onChange={(e) => toggleCostShowOverBudgetOnly(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-lab-border text-lab-cyan focus:ring-lab-cyan/30 bg-lab-panel"
            />
            <span className="text-[11px] text-lab-text-muted">仅显示超预算</span>
          </label>
          <div className="text-[11px] text-lab-text-muted">
            超预算:{" "}
            <span className="font-mono font-medium text-lab-red">{overBudgetCount}</span>{" "}
            / {totalCount}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {sortedResults.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-8">
            <div className="w-14 h-14 rounded-full bg-lab-panel-light flex items-center justify-center mb-3">
              <DollarSign size={24} className="text-lab-text-muted" />
            </div>
            <p className="text-sm text-lab-text-dim mb-1">
              {costShowOverBudgetOnly ? "没有超预算方案" : "暂无保存的方案"}
            </p>
            <p className="text-xs text-lab-text-muted">
              {costShowOverBudgetOnly
                ? "所有方案均在预算范围内"
                : "调节参数后点击保存方案"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedResults.map((result, index) => (
              <div
                key={result.id}
                className={`p-3 rounded-lg border transition-all ${
                  result.overBudget
                    ? "bg-lab-red/5 border-lab-red/30 hover:border-lab-red/50"
                    : "bg-lab-panel-light border-lab-border/50 hover:border-lab-cyan/30"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        index === 0
                          ? "bg-lab-amber/20 text-lab-amber"
                          : index === 1
                          ? "bg-lab-text-dim/20 text-lab-text-dim"
                          : index === 2
                          ? "bg-lab-amber/10 text-lab-amber/70"
                          : "bg-lab-panel text-lab-text-muted"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-lab-text truncate max-w-[140px]">
                        {result.name}
                      </div>
                      <div className="text-[10px] text-lab-text-muted">
                        评分: {result.score}
                      </div>
                    </div>
                  </div>
                  {result.overBudget && (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-lab-red/20">
                      <AlertTriangle size={10} className="text-lab-red" />
                      <span className="text-[10px] text-lab-red font-medium">超支</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                  <div className="p-1.5 rounded bg-lab-panel/60">
                    <div className="text-lab-text-muted mb-0.5">电费</div>
                    <div
                      className={`font-mono font-semibold ${
                        result.cost.electricityCost > costBudget.electricityBudget
                          ? "text-lab-red"
                          : "text-lab-amber"
                      }`}
                    >
                      {formatCurrency(result.cost.electricityCost)}
                    </div>
                  </div>
                  <div className="p-1.5 rounded bg-lab-panel/60">
                    <div className="text-lab-text-muted mb-0.5">碳排</div>
                    <div
                      className={`font-mono font-semibold ${
                        result.cost.carbonEmission > costBudget.carbonBudget
                          ? "text-lab-red"
                          : "text-lab-green"
                      }`}
                    >
                      {formatCarbon(result.cost.carbonEmission)}
                    </div>
                  </div>
                  <div className="p-1.5 rounded bg-lab-panel/60">
                    <div className="text-lab-text-muted mb-0.5">总成本</div>
                    <div
                      className={`font-mono font-semibold ${
                        result.cost.totalCost > costBudget.totalBudget
                          ? "text-lab-red"
                          : "text-lab-cyan"
                      }`}
                    >
                      {formatCurrency(result.cost.totalCost)}
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-3 text-[9px] text-lab-text-muted">
                  <span className="flex items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-lab-red" style={{ opacity: 0.6 }} />
                    {result.params.temperature}°C
                  </span>
                  <span className="flex items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-lab-cyan" style={{ opacity: 0.6 }} />
                    {result.params.pressure} MPa
                  </span>
                  <span className="flex items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-lab-green" style={{ opacity: 0.6 }} />
                    {result.params.reactionTime} h
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-2 border-t border-lab-border text-[11px] text-lab-text-muted text-center">
        {costSortOrder === "desc" ? (
          <span className="flex items-center justify-center gap-1">
            <TrendingUp size={12} className="text-lab-red" />
            按 {SORT_OPTIONS.find((o) => o.key === costSortField)?.label} 从高到低
          </span>
        ) : (
          <span className="flex items-center justify-center gap-1">
            <TrendingDown size={12} className="text-lab-green" />
            按 {SORT_OPTIONS.find((o) => o.key === costSortField)?.label} 从低到高
          </span>
        )}
      </div>
    </div>
  );
}
