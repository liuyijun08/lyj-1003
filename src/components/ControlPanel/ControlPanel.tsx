import { Save, RefreshCw, Sliders } from "lucide-react";
import { ParameterSlider } from "./ParameterSlider";
import { PresetSelector } from "./PresetSelector";
import { PARAM_CONFIGS } from "@/data/presets";
import { useExperimentStore } from "@/store/useExperimentStore";

export function ControlPanel() {
  const { saveCurrentResult, recalculate, currentScore, currentYield, currentStability } =
    useExperimentStore();

  return (
    <div className="w-[280px] h-full flex flex-col gap-4 p-4 lab-panel overflow-y-auto">
      <div className="flex items-center gap-2">
        <Sliders size={18} className="text-lab-cyan" />
        <h2 className="text-lg font-semibold text-lab-text">参数控制</h2>
      </div>

      <div>
        <label className="text-xs text-lab-text-muted mb-1.5 block">参数预设</label>
        <PresetSelector />
      </div>

      <div className="h-px bg-lab-border" />

      <div className="space-y-5 flex-1">
        {PARAM_CONFIGS.map((config) => (
          <ParameterSlider key={config.key} config={config} />
        ))}
      </div>

      <div className="h-px bg-lab-border" />

      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 rounded-lg bg-lab-panel-light">
          <div className="text-xs text-lab-text-muted mb-0.5">评分</div>
          <div className="font-mono text-lg font-semibold text-lab-cyan tabular-nums">
            {currentScore}
          </div>
        </div>
        <div className="text-center p-2 rounded-lg bg-lab-panel-light">
          <div className="text-xs text-lab-text-muted mb-0.5">产率</div>
          <div className="font-mono text-lg font-semibold text-lab-green tabular-nums">
            {currentYield}%
          </div>
        </div>
        <div className="text-center p-2 rounded-lg bg-lab-panel-light">
          <div className="text-xs text-lab-text-muted mb-0.5">稳定性</div>
          <div className="font-mono text-lg font-semibold text-lab-amber tabular-nums">
            {currentStability}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={recalculate} className="lab-btn flex-1 flex items-center justify-center gap-1.5">
          <RefreshCw size={14} />
          重新计算
        </button>
        <button onClick={() => saveCurrentResult()} className="lab-btn-success flex-1 flex items-center justify-center gap-1.5">
          <Save size={14} />
          保存方案
        </button>
      </div>
    </div>
  );
}
