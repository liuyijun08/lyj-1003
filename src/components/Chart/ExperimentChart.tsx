import { useState, useMemo, useCallback } from "react";
import { Activity, AlertTriangle, Eye, EyeOff, Info, Clock } from "lucide-react";
import type { CurvePoint } from "@/types";
import { useExperimentStore } from "@/store/useExperimentStore";
import { getAnomalyNote } from "@/utils/anomalyDetector";
import { AnomalyReviewDialog } from "./AnomalyReviewDialog";

interface ChartDimensions {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

const DEFAULT_DIMS: ChartDimensions = {
  width: 800,
  height: 480,
  padding: { top: 40, right: 40, bottom: 50, left: 60 },
};

function curveToPath(points: CurvePoint[], dims: ChartDimensions, maxX: number, maxY: number): string {
  const { padding, width, height } = dims;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  return points
    .map((p, i) => {
      const x = padding.left + (p.x / maxX) * chartW;
      const y = padding.top + chartH - (p.y / maxY) * chartH;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function areaToPath(points: CurvePoint[], dims: ChartDimensions, maxX: number, maxY: number): string {
  const { padding, width, height } = dims;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const baselineY = padding.top + chartH;

  const linePath = points
    .map((p, i) => {
      const x = padding.left + (p.x / maxX) * chartW;
      const y = padding.top + chartH - (p.y / maxY) * chartH;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const lastX = padding.left + (points[points.length - 1].x / maxX) * chartW;
  const firstX = padding.left + (points[0].x / maxX) * chartW;

  return `${linePath} L ${lastX.toFixed(2)} ${baselineY} L ${firstX.toFixed(2)} ${baselineY} Z`;
}

export function ExperimentChart() {
  const {
    currentCurve,
    currentAnomalies,
    savedResults,
    comparisonIds,
    toggleAnomalyMarker,
    getUnreviewedCount,
    params,
  } = useExperimentStore();

  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; point: CurvePoint; index: number } | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showAnomalies, setShowAnomalies] = useState(true);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<CurvePoint | null>(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState(-1);

  const unreviewedCount = getUnreviewedCount();

  const dims = DEFAULT_DIMS;
  const comparisonResults = useMemo(
    () => savedResults.filter((r) => comparisonIds.includes(r.id)),
    [savedResults, comparisonIds]
  );

  const maxX = params.reactionTime;
  const maxY = 100;

  const xTicks = useMemo(() => {
    const count = 6;
    return Array.from({ length: count + 1 }, (_, i) => (i / count) * maxX);
  }, [maxX]);

  const yTicks = useMemo(() => {
    return [0, 20, 40, 60, 80, 100];
  }, []);

  const { padding, width, height } = dims;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const getAnomalyColor = useCallback((point: CurvePoint) => {
    if (!point.review) return "#ffb300";
    switch (point.review.status) {
      case "confirmed":
        return "#ef4444";
      case "rejected":
        return "#94a3b8";
      case "fixed":
        return "#22c55e";
      case "pending":
      default:
        return "#ffb300";
    }
  }, []);

  const handlePointClick = (index: number) => {
    const point = currentCurve[index];
    if (point?.isAnomaly) {
      setSelectedPoint(point);
      setSelectedPointIndex(index);
      setReviewDialogOpen(true);
    } else {
      toggleAnomalyMarker(index);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full lab-panel overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-lab-border">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-lab-cyan" />
          <h2 className="text-lg font-semibold text-lab-text">实验曲线</h2>
          <span className="text-xs text-lab-text-muted px-2 py-0.5 rounded bg-lab-panel-light">
            转化率 - 时间
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded transition-colors ${
              showGrid ? "text-lab-cyan bg-lab-cyan/10" : "text-lab-text-muted hover:text-lab-text-dim"
            }`}
            title="显示/隐藏网格"
          >
            {showGrid ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          <button
            onClick={() => setShowAnomalies(!showAnomalies)}
            className={`p-1.5 rounded transition-colors ${
              showAnomalies ? "text-lab-amber bg-lab-amber/10" : "text-lab-text-muted hover:text-lab-text-dim"
            }`}
            title="显示/隐藏异常点"
          >
            <AlertTriangle size={16} />
          </button>
          <div className="h-5 w-px bg-lab-border mx-2" />
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-lab-cyan rounded" />
              <span className="text-lab-text-dim">当前</span>
            </div>
            {comparisonResults.map((r) => (
              <div key={r.id} className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 rounded" style={{ backgroundColor: r.color }} />
                <span className="text-lab-text-dim">{r.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 overflow-auto relative">
        <svg width={width} height={height} className="max-w-full h-auto">
          <defs>
            <linearGradient id="currentGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {showGrid && (
            <g className="opacity-30">
              {yTicks.map((t) => {
                const y = padding.top + chartH - (t / maxY) * chartH;
                return (
                  <line
                    key={`y-${t}`}
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="#2d3748"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                );
              })}
              {xTicks.map((t) => {
                const x = padding.left + (t / maxX) * chartW;
                return (
                  <line
                    key={`x-${t}`}
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={height - padding.bottom}
                    stroke="#2d3748"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                );
              })}
            </g>
          )}

          <g className="text-xs">
            {yTicks.map((t) => {
              const y = padding.top + chartH - (t / maxY) * chartH;
              return (
                <text
                  key={`yl-${t}`}
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize="11"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {t}%
                </text>
              );
            })}
            {xTicks.map((t) => {
              const x = padding.left + (t / maxX) * chartW;
              return (
                <text
                  key={`xl-${t}`}
                  x={x}
                  y={height - padding.bottom + 20}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="11"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {t.toFixed(1)}h
                </text>
              );
            })}
          </g>

          <text
            x={padding.left - 45}
            y={padding.top + chartH / 2}
            fill="#94a3b8"
            fontSize="12"
            transform={`rotate(-90, ${padding.left - 45}, ${padding.top + chartH / 2})`}
            textAnchor="middle"
          >
            转化率 (%)
          </text>
          <text
            x={padding.left + chartW / 2}
            y={height - 10}
            fill="#94a3b8"
            fontSize="12"
            textAnchor="middle"
          >
            反应时间 (h)
          </text>

          {comparisonResults.map((result) => (
            <g key={result.id}>
              <path
                d={areaToPath(result.curveData, dims, maxX, maxY)}
                fill={result.color}
                fillOpacity="0.05"
              />
              <path
                d={curveToPath(result.curveData, dims, maxX, maxY)}
                fill="none"
                stroke={result.color}
                strokeWidth="2"
                strokeOpacity="0.7"
                strokeDasharray="6 3"
              />
            </g>
          ))}

          <path
            d={areaToPath(currentCurve, dims, maxX, maxY)}
            fill="url(#currentGradient)"
          />
          <path
            d={curveToPath(currentCurve, dims, maxX, maxY)}
            fill="none"
            stroke="#00e5ff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
            style={{ transition: "d 0.3s ease" }}
          />

          {currentCurve.map((point, i) => {
            const x = padding.left + (point.x / maxX) * chartW;
            const y = padding.top + chartH - (point.y / maxY) * chartH;
            const isAnomaly = currentAnomalies.includes(i) || point.isAnomaly;
            const anomalyColor = getAnomalyColor(point);

            return (
              <g key={i}>
                <circle
                  cx={x}
                  cy={y}
                  r={isAnomaly && showAnomalies ? 6 : 2.5}
                  fill={isAnomaly && showAnomalies ? anomalyColor : "#00e5ff"}
                  stroke={isAnomaly && showAnomalies ? anomalyColor : "none"}
                  strokeWidth={isAnomaly && showAnomalies ? 2 : 0}
                  fillOpacity={isAnomaly ? 1 : 0}
                  className={isAnomaly && showAnomalies && (!point.review || point.review.status === "pending") ? "animate-pulse-slow" : ""}
                  style={{ cursor: "pointer" }}
                  onClick={() => handlePointClick(i)}
                  onMouseEnter={() =>
                    setHoveredPoint({ x, y, point, index: i })
                  }
                  onMouseLeave={() => setHoveredPoint(null)}
                />
                {isAnomaly && showAnomalies && (!point.review || point.review.status === "pending") && (
                  <circle
                    cx={x}
                    cy={y}
                    r="10"
                    fill="none"
                    stroke={anomalyColor}
                    strokeWidth="1"
                    strokeOpacity="0.4"
                    className="animate-ping-slow"
                  />
                )}
              </g>
            );
          })}

          {hoveredPoint && (
            <g>
              <line
                x1={hoveredPoint.x}
                y1={padding.top}
                x2={hoveredPoint.x}
                y2={height - padding.bottom}
                stroke="#00e5ff"
                strokeWidth="1"
                strokeOpacity="0.4"
                strokeDasharray="3 3"
              />
              <rect
                x={Math.min(hoveredPoint.x + 10, width - 140)}
                y={Math.max(hoveredPoint.y - 55, padding.top)}
                width="130"
                height="48"
                rx="6"
                fill="#1a1f2e"
                stroke="#2d3748"
                strokeWidth="1"
              />
              <text
                x={Math.min(hoveredPoint.x + 18, width - 132)}
                y={Math.max(hoveredPoint.y - 38, padding.top + 17)}
                fill="#e2e8f0"
                fontSize="11"
                fontFamily="JetBrains Mono, monospace"
              >
                时间: {hoveredPoint.point.x.toFixed(1)}h
              </text>
              <text
                x={Math.min(hoveredPoint.x + 18, width - 132)}
                y={Math.max(hoveredPoint.y - 22, padding.top + 33)}
                fill="#e2e8f0"
                fontSize="11"
                fontFamily="JetBrains Mono, monospace"
              >
                转化率: {hoveredPoint.point.y.toFixed(1)}%
              </text>
              {hoveredPoint.point.isAnomaly && (
                <>
                  <text
                    x={Math.min(hoveredPoint.x + 18, width - 132)}
                    y={Math.max(hoveredPoint.y - 6, padding.top + 49)}
                    fill={getAnomalyColor(hoveredPoint.point)}
                    fontSize="10"
                  >
                    ⚠ {hoveredPoint.point.anomalyNote || getAnomalyNote(hoveredPoint.index, currentCurve)}
                  </text>
                  {hoveredPoint.point.review && (
                    <text
                      x={Math.min(hoveredPoint.x + 18, width - 132)}
                      y={Math.max(hoveredPoint.y + 10, padding.top + 65)}
                      fill={getAnomalyColor(hoveredPoint.point)}
                      fontSize="9"
                    >
                      状态: {
                        hoveredPoint.point.review.status === "confirmed" ? "确认异常" :
                        hoveredPoint.point.review.status === "rejected" ? "误报标记" :
                        hoveredPoint.point.review.status === "fixed" ? "已修复" : "待复核"
                      }
                    </text>
                  )}
                </>
              )}
            </g>
          )}
        </svg>
      </div>

      {showAnomalies && currentAnomalies.length > 0 && (
        <div className="px-4 py-2 border-t border-lab-border bg-lab-amber/5 flex items-center gap-2 text-xs">
          <AlertTriangle size={14} className="text-lab-amber flex-shrink-0" />
          <span className="text-lab-text-dim">
            检测到 <span className="text-lab-amber font-semibold">{currentAnomalies.length}</span> 个异常点，
            {unreviewedCount > 0 && (
              <>
                其中 <span className="text-lab-red font-semibold">{unreviewedCount}</span> 个待复核，
              </>
            )}
            点击异常点可进行复核，点击正常点可手动标记异常
          </span>
          {unreviewedCount > 0 && (
            <span className="text-xs text-lab-red flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-lab-red/10 ml-auto">
              <Clock size={10} />
              待复核 {unreviewedCount}
            </span>
          )}
          {unreviewedCount === 0 && currentAnomalies.length > 0 && (
            <Info size={14} className="text-lab-text-muted ml-auto flex-shrink-0" />
          )}
        </div>
      )}

      <AnomalyReviewDialog
        open={reviewDialogOpen}
        point={selectedPoint}
        pointIndex={selectedPointIndex}
        onClose={() => {
          setReviewDialogOpen(false);
          setSelectedPoint(null);
          setSelectedPointIndex(-1);
        }}
      />
    </div>
  );
}
