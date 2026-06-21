import { Beaker, Zap, FileText, DollarSign } from "lucide-react";
import { ControlPanel } from "@/components/ControlPanel/ControlPanel";
import { ExperimentChart } from "@/components/Chart/ExperimentChart";
import { RankingList } from "@/components/Ranking/RankingList";
import { ComparisonPanel } from "@/components/Comparison/ComparisonPanel";
import { QualityEventLedger } from "@/components/Ledger/QualityEventLedger";
import { ChangeOrderList } from "@/components/ChangeOrder/ChangeOrderList";
import { CostAccountingPanel } from "@/components/CostAccounting";
import { useState } from "react";
import type { ComponentType } from "react";

type RightPanelKey = "ranking" | "ledger" | "changeOrder" | "cost";

interface RightPanelConfig {
  key: RightPanelKey;
  label: string;
  icon?: ComponentType<{ size?: number | string; className?: string }>;
  component: ComponentType;
}

const RIGHT_PANELS: RightPanelConfig[] = [
  {
    key: "ranking",
    label: "方案评分榜",
    component: RankingList,
  },
  {
    key: "ledger",
    label: "质量事件台账",
    component: QualityEventLedger,
  },
  {
    key: "changeOrder",
    label: "实验变更单",
    icon: FileText,
    component: ChangeOrderList,
  },
  {
    key: "cost",
    label: "成本核算",
    icon: DollarSign,
    component: CostAccountingPanel,
  },
];

export default function Home() {
  const [rightPanel, setRightPanel] = useState<RightPanelKey>("ranking");

  const ActivePanelComponent =
    RIGHT_PANELS.find((p) => p.key === rightPanel)?.component ??
    RIGHT_PANELS[0].component;

  return (
    <div className="h-full w-full flex flex-col bg-lab-bg">
      <header className="flex items-center justify-between px-6 py-3 border-b border-lab-border bg-lab-panel/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-lab-cyan to-lab-green flex items-center justify-center shadow-glow">
            <Beaker size={20} className="text-lab-bg" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-lab-text tracking-tight">
              实验曲线调参台
            </h1>
            <p className="text-xs text-lab-text-muted">
              Experiment Parameter Tuning Console
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-lab-panel-light rounded-lg border border-lab-border overflow-hidden">
            {RIGHT_PANELS.map((panel) => {
              const Icon = panel.icon;
              const isActive = rightPanel === panel.key;
              return (
                <button
                  key={panel.key}
                  onClick={() => setRightPanel(panel.key)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${
                    isActive
                      ? "bg-lab-cyan/20 text-lab-cyan"
                      : "text-lab-text-muted hover:text-lab-text-dim"
                  }`}
                >
                  {Icon && <Icon size={12} />}
                  {panel.label}
                </button>
              );
            })}
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-lab-panel-light border border-lab-border">
            <Zap size={14} className="text-lab-amber" />
            <span className="text-xs text-lab-text-dim">实时模拟中</span>
            <div className="w-2 h-2 rounded-full bg-lab-green animate-pulse" />
          </div>
        </div>
      </header>

      <main className="flex-1 flex gap-4 p-4 overflow-hidden">
        <ControlPanel />

        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <ComparisonPanel />
          <ExperimentChart />
        </div>

        <ActivePanelComponent />
      </main>
    </div>
  );
}
