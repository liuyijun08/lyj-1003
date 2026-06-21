import { useState, useEffect } from "react";
import {
  ClipboardList,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  X,
  ChevronUp,
  ChevronDown,
  CheckCircle,
  Clock,
  Wrench,
  AlertOctagon,
  Shield,
  User,
  Calendar,
  Flag,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { EventLevel, EventStatus, QualityEvent } from "@/types";
import { useExperimentStore } from "@/store/useExperimentStore";
import { EventDetailDialog } from "./EventDetailDialog";

const EVENT_LEVEL_STYLES: Record<EventLevel, { label: string; color: string; bg: string; border: string }> = {
  minor: { label: "一般", color: "text-lab-text-dim", bg: "bg-lab-text-dim/10", border: "border-lab-text-dim/30" },
  major: { label: "较大", color: "text-lab-amber", bg: "bg-lab-amber/10", border: "border-lab-amber/30" },
  critical: { label: "重大", color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/30" },
  catastrophic: { label: "特别重大", color: "text-lab-red", bg: "bg-lab-red/10", border: "border-lab-red/30" },
};

const EVENT_STATUS_STYLES: Record<EventStatus, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  open: { label: "待处理", color: "text-lab-amber", bg: "bg-lab-amber/10", border: "border-lab-amber/30", icon: <Clock size={10} /> },
  in_progress: { label: "处理中", color: "text-lab-cyan", bg: "bg-lab-cyan/10", border: "border-lab-cyan/30", icon: <Wrench size={10} /> },
  resolved: { label: "已处置", color: "text-lab-green", bg: "bg-lab-green/10", border: "border-lab-green/30", icon: <CheckCircle size={10} /> },
  closed: { label: "已关闭", color: "text-lab-text-dim", bg: "bg-lab-text-dim/10", border: "border-lab-text-dim/30", icon: <Shield size={10} /> },
  escalated: { label: "已升级", color: "text-lab-red", bg: "bg-lab-red/10", border: "border-lab-red/30", icon: <AlertOctagon size={10} /> },
};

const LEVEL_FILTER_OPTIONS: { key: EventLevel | "all"; label: string; color: string }[] = [
  { key: "all", label: "全部", color: "text-lab-text-dim" },
  { key: "minor", label: "一般", color: "text-lab-text-dim" },
  { key: "major", label: "较大", color: "text-lab-amber" },
  { key: "critical", label: "重大", color: "text-orange-400" },
  { key: "catastrophic", label: "特别重大", color: "text-lab-red" },
];

const STATUS_FILTER_OPTIONS: { key: EventStatus | "all"; label: string; color: string; icon: React.ReactNode }[] = [
  { key: "all", label: "全部", color: "text-lab-text-dim", icon: null },
  { key: "open", label: "待处理", color: "text-lab-amber", icon: <Clock size={10} /> },
  { key: "in_progress", label: "处理中", color: "text-lab-cyan", icon: <Wrench size={10} /> },
  { key: "escalated", label: "已升级", color: "text-lab-red", icon: <AlertOctagon size={10} /> },
  { key: "resolved", label: "已处置", color: "text-lab-green", icon: <CheckCircle size={10} /> },
  { key: "closed", label: "已关闭", color: "text-lab-text-dim", icon: <Shield size={10} /> },
];

function formatEventDate(ts: number | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isOverdue(event: QualityEvent): boolean {
  if (!event.deadline) return false;
  if (event.status === "resolved" || event.status === "closed") return false;
  return event.deadline < Date.now();
}

function getTimeRemaining(deadline: number | null): string {
  if (!deadline) return "";
  const diff = deadline - Date.now();
  if (diff < 0) {
    const hours = Math.abs(diff) / (1000 * 60 * 60);
    return hours < 24 ? `逾期 ${Math.round(hours)}h` : `逾期 ${Math.floor(hours / 24)}d`;
  }
  const hours = diff / (1000 * 60 * 60);
  if (hours < 24) return `${Math.round(hours)}h 后`;
  return `${Math.floor(hours / 24)}d 后`;
}

export function QualityEventLedger() {
  const {
    eventFilterLevel,
    eventFilterStatus,
    eventFilterHandler,
    eventSearchKeyword,
    setEventFilterLevel,
    setEventFilterStatus,
    setEventFilterHandler,
    setEventSearchKeyword,
    clearEventFilters,
    getFilteredQualityEvents,
    getUniqueHandlers,
    getOverdueEventCount,
    getEventStats,
    escalateOverdueEvents,
    deleteQualityEvent,
  } = useExperimentStore();

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<QualityEvent | null>(null);
  const [filterOpen, setFilterOpen] = useState(true);

  useEffect(() => {
    escalateOverdueEvents();
    const interval = setInterval(() => {
      escalateOverdueEvents();
    }, 60000);
    return () => clearInterval(interval);
  }, [escalateOverdueEvents]);

  const filteredEvents = getFilteredQualityEvents();
  const uniqueHandlers = getUniqueHandlers();
  const overdueCount = getOverdueEventCount();
  const stats = getEventStats();

  const hasActiveFilters =
    eventFilterLevel !== null ||
    eventFilterStatus !== null ||
    eventFilterHandler.trim() !== "" ||
    eventSearchKeyword.trim() !== "";

  const handleRefresh = () => {
    escalateOverdueEvents();
  };

  const handleEventClick = (event: QualityEvent) => {
    setSelectedEvent(event);
    setDetailOpen(true);
  };

  return (
    <div className="w-[320px] h-full flex flex-col lab-panel overflow-hidden">
      <div className="p-4 border-b border-lab-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-lab-cyan" />
            <h2 className="text-lg font-semibold text-lab-text">质量事件台账</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              className="p-1.5 rounded text-lab-text-muted hover:text-lab-cyan hover:bg-lab-cyan/10 transition-colors"
              title="刷新 & 检查逾期升级"
            >
              <RefreshCw size={13} />
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearEventFilters}
                className="p-1.5 rounded text-lab-text-muted hover:text-lab-cyan hover:bg-lab-cyan/10 transition-colors"
                title="清空所有筛选"
              >
                <RotateCcw size={13} />
              </button>
            )}
          </div>
        </div>

        {stats.total > 0 && (
          <div className="grid grid-cols-5 gap-1 mb-3">
            <div className="text-center px-1 py-1.5 rounded-lg bg-lab-panel-light border border-lab-border">
              <div className="text-sm font-mono font-semibold text-lab-text">{stats.total}</div>
              <div className="text-[9px] text-lab-text-muted">总数</div>
            </div>
            <div className="text-center px-1 py-1.5 rounded-lg bg-lab-amber/5 border border-lab-amber/20">
              <div className="text-sm font-mono font-semibold text-lab-amber">{stats.open}</div>
              <div className="text-[9px] text-lab-amber">待处理</div>
            </div>
            <div className="text-center px-1 py-1.5 rounded-lg bg-lab-cyan/5 border border-lab-cyan/20">
              <div className="text-sm font-mono font-semibold text-lab-cyan">{stats.inProgress}</div>
              <div className="text-[9px] text-lab-cyan">处理中</div>
            </div>
            <div className="text-center px-1 py-1.5 rounded-lg bg-lab-green/5 border border-lab-green/20">
              <div className="text-sm font-mono font-semibold text-lab-green">{stats.resolved}</div>
              <div className="text-[9px] text-lab-green">已处置</div>
            </div>
            <div className={`text-center px-1 py-1.5 rounded-lg border ${overdueCount > 0 ? "bg-lab-red/10 border-lab-red/30" : "bg-lab-panel-light border-lab-border"}`}>
              <div className={`text-sm font-mono font-semibold ${overdueCount > 0 ? "text-lab-red" : "text-lab-text-dim"}`}>{overdueCount}</div>
              <div className={`text-[9px] ${overdueCount > 0 ? "text-lab-red" : "text-lab-text-muted"}`}>逾期</div>
            </div>
          </div>
        )}

        <div className="relative mb-3">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-lab-text-muted pointer-events-none"
          />
          <input
            type="text"
            value={eventSearchKeyword}
            onChange={(e) => setEventSearchKeyword(e.target.value)}
            placeholder="搜索事件标题、原因、处置人..."
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-lab-panel-light border border-lab-border
                       text-lab-text text-sm placeholder:text-lab-text-muted
                       focus:outline-none focus:border-lab-cyan/50 focus:ring-1 focus:ring-lab-cyan/30
                       transition-colors"
          />
          {eventSearchKeyword && (
            <button
              onClick={() => setEventSearchKeyword("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-lab-text-muted hover:text-lab-text transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="mb-2">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg bg-lab-panel-light border border-lab-border hover:bg-lab-panel-light/80 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Filter size={12} className="text-lab-cyan" />
              <span className="text-xs font-medium text-lab-text">事件筛选</span>
            </div>
            {filterOpen ? <ChevronUp size={14} className="text-lab-text-muted" /> : <ChevronDown size={14} className="text-lab-text-muted" />}
          </button>
        </div>

        {filterOpen && (
          <div className="space-y-2.5 animate-fade-in">
            <div className="flex items-center gap-2">
              <Flag size={11} className="text-lab-text-muted flex-shrink-0" />
              <div className="flex-1 flex gap-1 overflow-x-auto pb-0.5">
                {LEVEL_FILTER_OPTIONS.map((opt) => {
                  const isActive = (opt.key === "all" && eventFilterLevel === null) || opt.key === eventFilterLevel;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setEventFilterLevel(opt.key === "all" ? null : (opt.key as EventLevel))}
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
              <AlertTriangle size={11} className="text-lab-text-muted flex-shrink-0" />
              <div className="flex-1 flex gap-1 overflow-x-auto pb-0.5 flex-wrap">
                {STATUS_FILTER_OPTIONS.map((opt) => {
                  const isActive = (opt.key === "all" && eventFilterStatus === null) || opt.key === eventFilterStatus;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setEventFilterStatus(opt.key === "all" ? null : (opt.key as EventStatus))}
                      className={`px-2 py-0.5 text-xs rounded whitespace-nowrap transition-colors border flex items-center gap-0.5 ${
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

            {uniqueHandlers.length > 0 && (
              <div className="flex items-center gap-2">
                <User size={11} className="text-lab-text-muted flex-shrink-0" />
                <select
                  value={eventFilterHandler}
                  onChange={(e) => setEventFilterHandler(e.target.value)}
                  className="flex-1 px-2 py-1 rounded-lg bg-lab-panel-light border border-lab-border
                             text-lab-text text-xs
                             focus:outline-none focus:border-lab-cyan/50 focus:ring-1 focus:ring-lab-cyan/30
                             transition-colors"
                >
                  <option value="">全部处置人</option>
                  {uniqueHandlers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {stats.escalated > 0 && (
        <div className="px-4 py-2 border-b border-lab-border bg-lab-red/5 flex items-center gap-2 text-xs">
          <AlertOctagon size={14} className="text-lab-red flex-shrink-0" />
          <span className="text-lab-text-dim">
            <span className="text-lab-red font-semibold">{stats.escalated}</span> 个事件已逾期升级
          </span>
          <button
            onClick={handleRefresh}
            className="ml-auto text-lab-red hover:text-lab-red/80 transition-colors flex items-center gap-0.5"
          >
            <RefreshCw size={10} />
            重新检查
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {filteredEvents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-8">
            <div className="w-16 h-16 rounded-full bg-lab-panel-light flex items-center justify-center mb-3">
              <ClipboardList size={28} className="text-lab-text-muted" />
            </div>
            <p className="text-sm text-lab-text-dim mb-1">
              {hasActiveFilters ? "未找到匹配的事件" : "暂无质量事件"}
            </p>
            <p className="text-xs text-lab-text-muted">
              {hasActiveFilters
                ? "尝试调整筛选条件"
                : "点击曲线异常点可生成质量事件"}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearEventFilters}
                className="mt-4 px-3 py-1.5 text-xs rounded-lg bg-lab-cyan/15 text-lab-cyan border border-lab-cyan/30 hover:bg-lab-cyan/25 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw size={12} />
                重置筛选
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEvents.map((event) => {
              const overdue = isOverdue(event);
              const levelStyle = EVENT_LEVEL_STYLES[event.level];
              const statusStyle = EVENT_STATUS_STYLES[event.status];
              const timeRemaining = getTimeRemaining(event.deadline);

              return (
                <div
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer animate-slide-in ${
                    overdue
                      ? "bg-lab-red/8 border-lab-red/40 hover:border-lab-red/60"
                      : "bg-lab-panel-light border-lab-border hover:border-lab-text-muted/30"
                  }`}
                >
                  <div className="flex items-start gap-2 mb-1.5">
                    <div className={`flex-shrink-0 mt-0.5 ${overdue ? "text-lab-red" : levelStyle.color}`}>
                      <AlertTriangle size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-lab-text truncate">{event.title}</div>
                      <div className="text-[10px] text-lab-text-muted font-mono mt-0.5">
                        {event.sourceResultName} · {event.pointX.toFixed(1)}h / {event.pointY.toFixed(1)}%
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteQualityEvent(event.id);
                      }}
                      className="p-1 rounded text-lab-text-muted hover:text-lab-red hover:bg-lab-red/10 transition-colors flex-shrink-0"
                      title="删除事件"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>

                  {event.anomalyNote && (
                    <div className="text-[10px] text-lab-amber bg-lab-amber/5 px-1.5 py-0.5 rounded mb-1.5 truncate">
                      ⚠ {event.anomalyNote}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${levelStyle.color} ${levelStyle.bg} ${levelStyle.border}`}>
                      {levelStyle.label}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border flex items-center gap-0.5 ${statusStyle.color} ${statusStyle.bg} ${statusStyle.border}`}>
                      {statusStyle.icon}
                      {statusStyle.label}
                    </span>
                    {overdue && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-lab-red/10 border-lab-red/30 text-lab-red flex items-center gap-0.5 animate-pulse">
                        <AlertOctagon size={9} />
                        逾期
                      </span>
                    )}
                    {event.verified && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-lab-green/10 border-lab-green/30 text-lab-green flex items-center gap-0.5">
                        <Shield size={9} />
                        已验证
                      </span>
                    )}
                    {event.escalationCount > 0 && (
                      <span className="text-[10px] text-lab-red font-medium">
                        ↑{event.escalationCount}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-2 text-lab-text-muted">
                      {event.handler && (
                        <span className="flex items-center gap-0.5">
                          <User size={9} />
                          {event.handler}
                        </span>
                      )}
                      {event.deadline && (
                        <span className={`flex items-center gap-0.5 ${overdue ? "text-lab-red font-medium" : timeRemaining.endsWith("h 后") ? "text-lab-amber" : ""}`}>
                          <Calendar size={9} />
                          {timeRemaining}
                        </span>
                      )}
                    </div>
                    <span className="text-lab-text-muted font-mono">
                      {formatEventDate(event.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-4 py-2 border-t border-lab-border text-xs text-lab-text-muted text-center flex items-center justify-center gap-2">
        {hasActiveFilters ? (
          <>
            <span>
              命中 <span className="font-semibold text-lab-cyan">{filteredEvents.length}</span> / 共{" "}
              <span className="font-semibold text-lab-text-dim">{stats.total}</span> 个事件
            </span>
            <button
              onClick={clearEventFilters}
              className="text-lab-text-muted hover:text-lab-cyan transition-colors flex items-center gap-0.5"
            >
              <X size={10} />
              重置
            </button>
          </>
        ) : (
          <span>共 {stats.total} 个事件{overdueCount > 0 ? ` · ${overdueCount} 个逾期` : ""}</span>
        )}
      </div>

      <EventDetailDialog
        open={detailOpen}
        event={selectedEvent}
        onClose={() => {
          setDetailOpen(false);
          setSelectedEvent(null);
        }}
      />
    </div>
  );
}
