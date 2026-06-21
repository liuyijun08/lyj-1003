import { useState } from "react";
import {
  FileText,
  Search,
  Filter,
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  FileEdit,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";
import type {
  ChangeOrderStatus,
  Priority,
  ExperimentChangeOrder,
} from "@/types";
import { useExperimentStore } from "@/store/useExperimentStore";
import { ChangeOrderDetailDialog } from "./ChangeOrderDetailDialog";
import { ChangeOrderApprovalDialog } from "./ChangeOrderApprovalDialog";

const STATUS_STYLES: Record<
  ChangeOrderStatus,
  { label: string; color: string; bg: string; border: string; icon: typeof Clock }
> = {
  draft: {
    label: "草稿",
    color: "text-lab-text-dim",
    bg: "bg-lab-text-dim/10",
    border: "border-lab-text-dim/30",
    icon: FileEdit,
  },
  pending: {
    label: "待审批",
    color: "text-lab-amber",
    bg: "bg-lab-amber/10",
    border: "border-lab-amber/30",
    icon: Clock,
  },
  approved: {
    label: "已通过",
    color: "text-lab-green",
    bg: "bg-lab-green/10",
    border: "border-lab-green/30",
    icon: CheckCircle,
  },
  rejected: {
    label: "已驳回",
    color: "text-lab-red",
    bg: "bg-lab-red/10",
    border: "border-lab-red/30",
    icon: XCircle,
  },
};

const PRIORITY_OPTIONS: { key: Priority; label: string; color: string }[] = [
  { key: "low", label: "低", color: "text-lab-text-dim" },
  { key: "normal", label: "普通", color: "text-lab-cyan" },
  { key: "high", label: "高", color: "text-lab-amber" },
  { key: "urgent", label: "紧急", color: "text-lab-red" },
];

const STATUS_FILTER_OPTIONS: {
  key: ChangeOrderStatus | "all";
  label: string;
}[] = [
  { key: "all", label: "全部" },
  { key: "draft", label: "草稿" },
  { key: "pending", label: "待审批" },
  { key: "approved", label: "已通过" },
  { key: "rejected", label: "已驳回" },
];

function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface CreateOrderDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (resultId: string, createdBy: string) => void;
}

function CreateOrderDialog({ open, onClose, onCreate }: CreateOrderDialogProps) {
  const { savedResults } = useExperimentStore();
  const [selectedResultId, setSelectedResultId] = useState("");
  const [createdBy, setCreatedBy] = useState("");

  const handleCreate = () => {
    if (selectedResultId && createdBy.trim()) {
      onCreate(selectedResultId, createdBy.trim());
      onClose();
      setSelectedResultId("");
      setCreatedBy("");
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-[420px] max-w-[90vw] lab-panel p-6 animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-lab-cyan/20 flex items-center justify-center">
              <Plus size={16} className="text-lab-cyan" />
            </div>
            <h3 className="text-lg font-semibold text-lab-text">创建变更单</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-lab-text-muted hover:text-lab-text hover:bg-lab-panel-light transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-lab-text-muted mb-1.5 block">
              选择实验方案
            </label>
            <select
              value={selectedResultId}
              onChange={(e) => setSelectedResultId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-lab-panel-light border border-lab-border
                         text-lab-text text-sm focus:outline-none focus:border-lab-cyan/50
                         focus:ring-1 focus:ring-lab-cyan/30 transition-colors"
            >
              <option value="">请选择已保存的实验方案</option>
              {savedResults.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} (评分: {r.score})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-lab-text-muted mb-1.5 block">
              创建人
            </label>
            <input
              type="text"
              value={createdBy}
              onChange={(e) => setCreatedBy(e.target.value)}
              placeholder="请输入创建人姓名或工号"
              className="w-full px-3 py-2 rounded-lg bg-lab-panel-light border border-lab-border
                         text-lab-text text-sm placeholder:text-lab-text-muted
                         focus:outline-none focus:border-lab-cyan/50 focus:ring-1 focus:ring-lab-cyan/30
                         transition-colors"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 lab-btn text-xs">
            取消
          </button>
          <button
            onClick={handleCreate}
            disabled={!selectedResultId || !createdBy.trim()}
            className="flex-1 lab-btn-success text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            创建
          </button>
        </div>
      </div>
    </div>
  );
}

export function ChangeOrderList() {
  const {
    getFilteredChangeOrders,
    getChangeOrderStats,
    changeOrderFilterStatus,
    changeOrderFilterPriority,
    changeOrderSearchKeyword,
    setChangeOrderFilterStatus,
    setChangeOrderFilterPriority,
    setChangeOrderSearchKeyword,
    clearChangeOrderFilters,
    createChangeOrderFromResult,
    setCurrentChangeOrder,
    deleteChangeOrder,
    hasTemperaturePressureChange,
  } = useExperimentStore();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);

  const filteredOrders = getFilteredChangeOrders();
  const stats = getChangeOrderStats();

  const handleCreate = (resultId: string, createdBy: string) => {
    const order = createChangeOrderFromResult(resultId, createdBy);
    setCurrentChangeOrder(order);
    setDetailDialogOpen(true);
  };

  const handleView = (order: ExperimentChangeOrder) => {
    setCurrentChangeOrder(order);
    setDetailDialogOpen(true);
  };

  const handleApprove = (order: ExperimentChangeOrder) => {
    setCurrentChangeOrder(order);
    setApprovalDialogOpen(true);
  };

  const handleDelete = (orderId: string) => {
    if (window.confirm("确定要删除这个变更单吗？")) {
      deleteChangeOrder(orderId);
    }
  };

  const activeFilterCount =
    (changeOrderFilterStatus ? 1 : 0) +
    (changeOrderFilterPriority ? 1 : 0) +
    (changeOrderSearchKeyword.trim() ? 1 : 0);

  return (
    <div className="w-[380px] h-full flex flex-col gap-4 p-4 lab-panel overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-lab-cyan" />
          <h2 className="text-lg font-semibold text-lab-text">实验变更单</h2>
        </div>
        <button
          onClick={() => setCreateDialogOpen(true)}
          className="lab-btn-success px-3 py-1.5 text-xs flex items-center gap-1.5"
        >
          <Plus size={14} />
          新建
        </button>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {[
          { label: "总数", value: stats.total, color: "text-lab-text" },
          { label: "草稿", value: stats.draft, color: "text-lab-text-dim" },
          { label: "待批", value: stats.pending, color: "text-lab-amber" },
          { label: "通过", value: stats.approved, color: "text-lab-green" },
          { label: "驳回", value: stats.rejected, color: "text-lab-red" },
        ].map((item) => (
          <div
            key={item.label}
            className="text-center p-2 rounded-lg bg-lab-panel-light"
          >
            <div className={`font-mono text-lg font-semibold ${item.color}`}>
              {item.value}
            </div>
            <div className="text-[10px] text-lab-text-muted mt-0.5">
              {item.label}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-lab-text-muted"
          />
          <input
            type="text"
            value={changeOrderSearchKeyword}
            onChange={(e) => setChangeOrderSearchKeyword(e.target.value)}
            placeholder="搜索变更单号、方案名、创建人..."
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-lab-panel-light border border-lab-border
                       text-lab-text text-xs placeholder:text-lab-text-muted
                       focus:outline-none focus:border-lab-cyan/50 focus:ring-1 focus:ring-lab-cyan/30
                       transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-lab-text-muted flex-shrink-0" />
          <div className="flex flex-wrap gap-1.5 flex-1">
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() =>
                  setChangeOrderFilterStatus(
                    opt.key === "all" ? null : (opt.key as ChangeOrderStatus)
                  )
                }
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  (opt.key === "all" && !changeOrderFilterStatus) ||
                  changeOrderFilterStatus === opt.key
                    ? "bg-lab-cyan/20 text-lab-cyan"
                    : "bg-lab-panel-light text-lab-text-dim hover:text-lab-text"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={clearChangeOrderFilters}
              className="text-[11px] text-lab-text-muted hover:text-lab-text px-1.5"
            >
              清除
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="text-[11px] text-lab-text-muted py-1">优先级:</span>
          {PRIORITY_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() =>
                setChangeOrderFilterPriority(
                  changeOrderFilterPriority === opt.key ? null : opt.key
                )
              }
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                changeOrderFilterPriority === opt.key
                  ? `${opt.color} bg-current/10`
                  : "bg-lab-panel-light text-lab-text-dim hover:text-lab-text"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-lab-border" />

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-lab-text-muted">
            <FileText size={36} className="mb-3 opacity-30" />
            <p className="text-sm">暂无变更单</p>
            <p className="text-xs mt-1">点击"新建"创建第一个变更单</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const statusStyle = STATUS_STYLES[order.status];
            const StatusIcon = statusStyle.icon;
            const hasTempPressureChange = hasTemperaturePressureChange(order);
            const priorityOpt = PRIORITY_OPTIONS.find(
              (p) => p.key === order.priority
            );

            return (
              <div
                key={order.id}
                className="p-3 rounded-lg bg-lab-panel-light border border-lab-border
                           hover:border-lab-cyan/30 transition-all cursor-pointer group"
                onClick={() => handleView(order)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-lab-cyan">
                        {order.orderNo}
                      </span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded border flex items-center gap-1 ${statusStyle.color} ${statusStyle.bg} ${statusStyle.border}`}
                      >
                        <StatusIcon size={10} />
                        {statusStyle.label}
                      </span>
                      {priorityOpt && (
                        <span className={`text-[10px] ${priorityOpt.color}`}>
                          {priorityOpt.label}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-lab-text mt-1">
                      {order.sourceResultName}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {order.status === "pending" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(order);
                        }}
                        className="p-1 rounded hover:bg-lab-cyan/20 text-lab-cyan transition-colors"
                        title="审批"
                      >
                        <CheckCircle size={14} />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleView(order);
                      }}
                      className="p-1 rounded hover:bg-lab-panel text-lab-text-muted transition-colors"
                      title="查看详情"
                    >
                      <Eye size={14} />
                    </button>
                    {order.status === "draft" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(order.id);
                        }}
                        className="p-1 rounded hover:bg-lab-red/20 text-lab-red transition-colors"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
                  <div>
                    <span className="text-lab-text-muted">创建人:</span>
                    <span className="ml-1 text-lab-text-dim">
                      {order.createdBy}
                    </span>
                  </div>
                  <div>
                    <span className="text-lab-text-muted">参数变更:</span>
                    <span className="ml-1 font-mono text-lab-cyan">
                      {order.paramChanges.length} 项
                    </span>
                  </div>
                </div>

                {hasTempPressureChange && (
                  <div className="flex items-center gap-1.5 text-[11px] text-lab-amber bg-lab-amber/10 px-2 py-1 rounded">
                    <AlertTriangle size={12} />
                    温压配比已变更，需填写原因
                  </div>
                )}

                <div className="text-[10px] text-lab-text-muted mt-2">
                  创建于 {formatDateTime(order.createdAt)}
                </div>
              </div>
            );
          })
        )}
      </div>

      <CreateOrderDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreate={handleCreate}
      />

      <ChangeOrderDetailDialog
        open={detailDialogOpen}
        onClose={() => {
          setDetailDialogOpen(false);
          setCurrentChangeOrder(null);
        }}
      />

      <ChangeOrderApprovalDialog
        open={approvalDialogOpen}
        onClose={() => {
          setApprovalDialogOpen(false);
          setCurrentChangeOrder(null);
        }}
      />
    </div>
  );
}
