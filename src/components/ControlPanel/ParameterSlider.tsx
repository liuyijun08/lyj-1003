import { Lock, Unlock } from "lucide-react";
import type { ParamConfig, ExperimentParams } from "@/types";
import { useExperimentStore } from "@/store/useExperimentStore";

interface ParameterSliderProps {
  config: ParamConfig;
}

export function ParameterSlider({ config }: ParameterSliderProps) {
  const { params, lockedParams, setParam, toggleParamLock } = useExperimentStore();
  const value = params[config.key as keyof ExperimentParams];
  const isLocked = !!lockedParams[config.key];
  const percentage = ((value - config.min) / (config.max - config.min)) * 100;

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: config.color, boxShadow: `0 0 8px ${config.color}50` }}
          />
          <span className="text-sm font-medium text-lab-text">{config.label}</span>
        </div>
        <button
          onClick={() => toggleParamLock(config.key)}
          className={`p-1 rounded transition-colors ${
            isLocked
              ? "text-lab-amber hover:text-lab-amber/80"
              : "text-lab-text-muted hover:text-lab-text-dim"
          }`}
          title={isLocked ? "解锁参数" : "锁定参数"}
        >
          {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <input
            type="range"
            min={config.min}
            max={config.max}
            step={config.step}
            value={value}
            onChange={(e) => setParam(config.key, parseFloat(e.target.value))}
            disabled={isLocked}
            className="w-full"
            style={
              {
                ["--value" as string]: `${percentage}%`,
              } as React.CSSProperties
            }
          />
        </div>
        <div
          className="font-mono text-sm min-w-[70px] text-right tabular-nums"
          style={{ color: isLocked ? "#64748b" : config.color }}
        >
          {value.toFixed(config.step < 1 ? 1 : 0)}
          <span className="text-xs text-lab-text-muted ml-1">{config.unit}</span>
        </div>
      </div>
    </div>
  );
}
