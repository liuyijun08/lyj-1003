import { Beaker, Zap } from "lucide-react";
import { ControlPanel } from "@/components/ControlPanel/ControlPanel";
import { ExperimentChart } from "@/components/Chart/ExperimentChart";
import { RankingList } from "@/components/Ranking/RankingList";
import { ComparisonPanel } from "@/components/Comparison/ComparisonPanel";

export default function Home() {
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
            <p className="text-xs text-lab-text-muted">Experiment Parameter Tuning Console</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
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

        <RankingList />
      </main>
    </div>
  );
}
