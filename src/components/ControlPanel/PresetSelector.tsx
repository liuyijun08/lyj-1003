import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { PRESETS } from "@/data/presets";
import { useExperimentStore } from "@/store/useExperimentStore";

export function PresetSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("default");
  const loadPreset = useExperimentStore((s) => s.loadPreset);

  const handleSelect = (presetId: string) => {
    setSelectedId(presetId);
    loadPreset(presetId);
    setIsOpen(false);
  };

  const selected = PRESETS.find((p) => p.id === selectedId);

  const categories = [...new Set(PRESETS.map((p) => p.category))];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg
                   bg-lab-panel-light border border-lab-border hover:border-lab-cyan/50
                   transition-colors text-sm"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-lab-cyan" />
          <span className="text-lab-text">{selected?.name || "选择预设"}</span>
          {selected && (
            <span className="text-xs text-lab-text-muted px-1.5 py-0.5 rounded bg-lab-border">
              {selected.category}
            </span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-lab-text-dim transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50
                        bg-lab-panel border border-lab-border rounded-lg shadow-xl
                        max-h-64 overflow-y-auto animate-fade-in">
          {categories.map((cat) => (
            <div key={cat} className="py-1">
              <div className="px-3 py-1 text-xs text-lab-text-muted uppercase tracking-wide">
                {cat}
              </div>
              {PRESETS.filter((p) => p.category === cat).map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleSelect(preset.id)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors
                             hover:bg-lab-panel-light ${
                               preset.id === selectedId
                                 ? "bg-lab-cyan/10 text-lab-cyan"
                                 : "text-lab-text"
                             }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
