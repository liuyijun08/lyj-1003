import { describe, it, expect, beforeEach, vi } from "vitest";
import { useExperimentStore } from "@/store/useExperimentStore";
import type { ExperimentResult } from "@/types";
import { act } from "@testing-library/react";

const createMockResult = (id: string, name: string, score: number): ExperimentResult => ({
  id,
  name,
  params: {
    temperature: 200,
    pressure: 1.5,
    reactionTime: 60,
    ratioA: 40,
    ratioB: 30,
    ratioC: 30,
  },
  curveData: [],
  score,
  yieldRate: 85,
  stability: 90,
  createdAt: Date.now(),
  anomalyPoints: [],
  color: "#000000",
  batch: "B001",
  purpose: "测试",
  riskTag: "medium",
  approvalStatus: "approved",
  approvalNote: "",
  approver: "",
  deadline: null,
  priority: "normal",
});

describe("实验变更单审批流程测试", () => {
  beforeEach(() => {
    act(() => {
      useExperimentStore.setState({
        savedResults: [],
        changeOrders: [],
        currentChangeOrder: null,
        changeOrderFilterStatus: null,
        changeOrderFilterPriority: null,
        changeOrderSearchKeyword: "",
      });
    });
  });

  const setupTestData = () => {
    const result1 = createMockResult("test_result_1", "方案A", 95);
    const result2 = createMockResult("test_result_2", "方案B", 88);
    act(() => {
      useExperimentStore.setState({
        savedResults: [result1, result2],
      });
    });
    return { result1, result2 };
  };

  const getState = () => useExperimentStore.getState();
  const getOrder = (orderId: string) => getState().changeOrders.find((o) => o.id === orderId);

  describe("1. 从已保存方案创建变更单", () => {
    it("应该能从已保存方案创建草稿状态的变更单", () => {
      const { result1 } = setupTestData();

      let orderId: string;
      act(() => {
        const order = getState().createChangeOrderFromResult(result1.id, "张三");
        orderId = order.id;
      });

      const order = getOrder(orderId)!;
      expect(order).toBeDefined();
      expect(order.status).toBe("draft");
      expect(order.sourceResultId).toBe(result1.id);
      expect(order.sourceResultName).toBe(result1.name);
      expect(order.createdBy).toBe("张三");
      expect(order.originalParams).toEqual(result1.params);
      expect(order.modifiedParams).toEqual(result1.params);
      expect(order.paramChanges).toHaveLength(0);
      expect(order.auditTrail).toHaveLength(1);
      expect(order.auditTrail[0].action).toBe("submit");
      expect(order.auditTrail[0].operator).toBe("张三");
      expect(order.auditTrail[0].note).toBe("创建变更单");
    });

    it("创建变更单不应影响原评分榜", () => {
      const { result1, result2 } = setupTestData();
      const originalResults = [...getState().savedResults];
      const originalCount = getState().savedResults.length;

      act(() => {
        getState().createChangeOrderFromResult(result1.id, "张三");
      });

      expect(getState().savedResults).toHaveLength(originalCount);
      expect(getState().savedResults).toEqual(originalResults);
      expect(getState().getSortedResults()).toHaveLength(originalCount);
      expect(getState().savedResults[0].score).toBe(result1.score);
      expect(getState().savedResults[1].score).toBe(result2.score);
    });

    it("创建变更单时如果方案不存在应该抛出错误", () => {
      setupTestData();

      expect(() => {
        getState().createChangeOrderFromResult("non_existent_id", "张三");
      }).toThrow("Result not found");
    });
  });

  describe("2. 修改温压配比要求填写原因", () => {
    it("修改温度参数应该检测为温压变更", () => {
      const { result1 } = setupTestData();

      let orderId: string;
      act(() => {
        const order = getState().createChangeOrderFromResult(result1.id, "张三");
        orderId = order.id;
        getState().updateChangeOrderParams(orderId, "temperature", 220);
      });

      const updatedOrder = getOrder(orderId)!;
      expect(updatedOrder.paramChanges).toHaveLength(1);
      expect(updatedOrder.paramChanges[0].changeType).toBe("temperature");
      expect(getState().hasTemperaturePressureChange(updatedOrder)).toBe(true);
    });

    it("修改压力参数应该检测为温压变更", () => {
      const { result1 } = setupTestData();

      let orderId: string;
      act(() => {
        const order = getState().createChangeOrderFromResult(result1.id, "张三");
        orderId = order.id;
        getState().updateChangeOrderParams(orderId, "pressure", 2.0);
      });

      const updatedOrder = getOrder(orderId)!;
      expect(updatedOrder.paramChanges).toHaveLength(1);
      expect(updatedOrder.paramChanges[0].changeType).toBe("pressure");
      expect(getState().hasTemperaturePressureChange(updatedOrder)).toBe(true);
    });

    it("修改配比参数应该检测为配比变更且需要温压配比原因", () => {
      const { result1 } = setupTestData();

      let orderId: string;
      act(() => {
        const order = getState().createChangeOrderFromResult(result1.id, "张三");
        orderId = order.id;
        getState().updateChangeOrderParams(orderId, "ratioA", 50);
      });

      const updatedOrder = getOrder(orderId)!;
      expect(getState().hasRatioChange(updatedOrder)).toBe(true);
      expect(updatedOrder.paramChanges.length).toBeGreaterThan(0);
    });

    it("修改反应时间不需要温压配比原因", () => {
      const { result1 } = setupTestData();

      let orderId: string;
      act(() => {
        const order = getState().createChangeOrderFromResult(result1.id, "张三");
        orderId = order.id;
        getState().updateChangeOrderParams(orderId, "reactionTime", 90);
      });

      const updatedOrder = getOrder(orderId)!;
      expect(updatedOrder.paramChanges).toHaveLength(1);
      expect(updatedOrder.paramChanges[0].changeType).toBe("reactionTime");
      expect(getState().hasTemperaturePressureChange(updatedOrder)).toBe(false);
      expect(getState().hasRatioChange(updatedOrder)).toBe(false);
    });

    it("更新变更原因应该正确保存", () => {
      const { result1 } = setupTestData();

      let orderId: string;
      act(() => {
        const order = getState().createChangeOrderFromResult(result1.id, "张三");
        orderId = order.id;
        getState().updateChangeOrderParams(orderId, "temperature", 220);
        getState().updateChangeOrderReason(orderId, "优化反应条件");
        getState().updateChangeOrderTempPressureReason(orderId, "根据实验数据，提高温度可提升产率");
      });

      const updatedOrder = getOrder(orderId)!;
      expect(updatedOrder.changeReason).toBe("优化反应条件");
      expect(updatedOrder.temperaturePressureChangeReason).toBe("根据实验数据，提高温度可提升产率");
    });

    it("移除温压变更后应该清空温压变更原因", () => {
      const { result1 } = setupTestData();

      let orderId: string;
      act(() => {
        const order = getState().createChangeOrderFromResult(result1.id, "张三");
        orderId = order.id;
        getState().updateChangeOrderParams(orderId, "temperature", 220);
        getState().updateChangeOrderTempPressureReason(orderId, "测试原因");
        getState().updateChangeOrderParams(orderId, "temperature", result1.params.temperature);
      });

      const updatedOrder = getOrder(orderId)!;
      expect(updatedOrder.temperaturePressureChangeReason).toBe("");
    });

    it("修改参数不应影响原评分榜", () => {
      const { result1 } = setupTestData();
      const originalScore = getState().savedResults.find((r) => r.id === result1.id)!.score;

      let orderId: string;
      act(() => {
        const order = getState().createChangeOrderFromResult(result1.id, "张三");
        orderId = order.id;
        getState().updateChangeOrderParams(orderId, "temperature", 300);
        getState().updateChangeOrderParams(orderId, "ratioA", 60);
      });

      const resultAfter = getState().savedResults.find((r) => r.id === result1.id)!;
      expect(resultAfter.score).toBe(originalScore);
      expect(resultAfter.params.temperature).toBe(result1.params.temperature);
    });

    it("非草稿状态的变更单不能修改参数", () => {
      const { result1 } = setupTestData();

      let orderId: string;
      act(() => {
        const order = getState().createChangeOrderFromResult(result1.id, "张三");
        orderId = order.id;
        getState().updateChangeOrderParams(orderId, "temperature", 220);
        getState().updateChangeOrderReason(orderId, "原因");
        getState().updateChangeOrderTempPressureReason(orderId, "温压原因");
        getState().submitChangeOrder(orderId, "李四", "提交备注");
        getState().updateChangeOrderParams(orderId, "temperature", 300);
      });

      const updatedOrder = getOrder(orderId)!;
      expect(updatedOrder.status).toBe("pending");
      expect(updatedOrder.modifiedParams.temperature).toBe(220);
    });
  });

  describe("3. 提交待审", () => {
    it("满足条件的变更单应该能提交待审", () => {
      const { result1 } = setupTestData();

      let orderId: string;
      act(() => {
        const order = getState().createChangeOrderFromResult(result1.id, "张三");
        orderId = order.id;
        getState().updateChangeOrderParams(orderId, "temperature", 220);
        getState().updateChangeOrderReason(orderId, "优化反应条件");
        getState().updateChangeOrderTempPressureReason(orderId, "温度变更原因");
        getState().submitChangeOrder(orderId, "李四", "请审批");
      });

      const updatedOrder = getOrder(orderId)!;
      expect(updatedOrder.status).toBe("pending");
      expect(updatedOrder.auditTrail).toHaveLength(2);
      expect(updatedOrder.auditTrail[1].action).toBe("submit");
      expect(updatedOrder.auditTrail[1].operator).toBe("李四");
      expect(updatedOrder.auditTrail[1].note).toBe("请审批");
    });

    it("没有参数变更不能提交", () => {
      const { result1 } = setupTestData();

      let orderId: string;
      act(() => {
        const order = getState().createChangeOrderFromResult(result1.id, "张三");
        orderId = order.id;
        getState().updateChangeOrderReason(orderId, "优化反应条件");
        getState().submitChangeOrder(orderId, "李四");
      });

      const updatedOrder = getOrder(orderId)!;
      expect(updatedOrder.status).toBe("draft");
    });

    it("没有变更原因不能提交", () => {
      const { result1 } = setupTestData();

      let orderId: string;
      act(() => {
        const order = getState().createChangeOrderFromResult(result1.id, "张三");
        orderId = order.id;
        getState().updateChangeOrderParams(orderId, "temperature", 220);
        getState().updateChangeOrderTempPressureReason(orderId, "温压原因");
        getState().submitChangeOrder(orderId, "李四");
      });

      const updatedOrder = getOrder(orderId)!;
      expect(updatedOrder.status).toBe("draft");
    });

    it("有温压变更但没有温压原因不能提交", () => {
      const { result1 } = setupTestData();

      let orderId: string;
      act(() => {
        const order = getState().createChangeOrderFromResult(result1.id, "张三");
        orderId = order.id;
        getState().updateChangeOrderParams(orderId, "temperature", 220);
        getState().updateChangeOrderReason(orderId, "优化反应条件");
        getState().submitChangeOrder(orderId, "李四");
      });

      const updatedOrder = getOrder(orderId)!;
      expect(updatedOrder.status).toBe("draft");
    });

    it("没有提交人不能提交", () => {
      const { result1 } = setupTestData();

      let orderId: string;
      act(() => {
        const order = getState().createChangeOrderFromResult(result1.id, "张三");
        orderId = order.id;
        getState().updateChangeOrderParams(orderId, "temperature", 220);
        getState().updateChangeOrderReason(orderId, "优化反应条件");
        getState().updateChangeOrderTempPressureReason(orderId, "温压原因");
        getState().submitChangeOrder(orderId, "");
      });

      const updatedOrder = getOrder(orderId)!;
      expect(updatedOrder.status).toBe("draft");
    });

    it("仅修改反应时间不需要温压原因即可提交", () => {
      const { result1 } = setupTestData();

      let orderId: string;
      act(() => {
        const order = getState().createChangeOrderFromResult(result1.id, "张三");
        orderId = order.id;
        getState().updateChangeOrderParams(orderId, "reactionTime", 90);
        getState().updateChangeOrderReason(orderId, "延长反应时间");
        getState().submitChangeOrder(orderId, "李四");
      });

      const updatedOrder = getOrder(orderId)!;
      expect(updatedOrder.status).toBe("pending");
    });

    it("提交待审不应影响原评分榜", () => {
      const { result1 } = setupTestData();
      const originalResults = [...getState().savedResults];

      let orderId: string;
      act(() => {
        const order = getState().createChangeOrderFromResult(result1.id, "张三");
        orderId = order.id;
        getState().updateChangeOrderParams(orderId, "temperature", 220);
        getState().updateChangeOrderReason(orderId, "原因");
        getState().updateChangeOrderTempPressureReason(orderId, "温压原因");
        getState().submitChangeOrder(orderId, "李四");
      });

      expect(getState().savedResults).toEqual(originalResults);
      expect(getState().savedResults[0].approvalStatus).toBe("approved");
    });
  });

  describe("4. 审批通过", () => {
    it("待审状态的变更单应该能审批通过", () => {
      const { result1 } = setupTestData();

      let orderId: string;
      act(() => {
        const order = getState().createChangeOrderFromResult(result1.id, "张三");
        orderId = order.id;
        getState().updateChangeOrderParams(orderId, "temperature", 220);
        getState().updateChangeOrderReason(orderId, "原因");
        getState().updateChangeOrderTempPressureReason(orderId, "温压原因");
        getState().submitChangeOrder(orderId, "李四");
        getState().approveChangeOrder(orderId, "王五", "同意变更");
      });

      const updatedOrder = getOrder(orderId)!;
      expect(updatedOrder.status).toBe("approved");
      expect(updatedOrder.approver).toBe("王五");
      expect(updatedOrder.approvalNote).toBe("同意变更");
      expect(updatedOrder.approvedAt).toBeDefined();
      expect(updatedOrder.auditTrail).toHaveLength(3);
      expect(updatedOrder.auditTrail[2].action).toBe("approve");
      expect(updatedOrder.auditTrail[2].operator).toBe("王五");
    });

    it("审批通过不应影响原评分榜", () => {
      const { result1, result2 } = setupTestData();
      const originalScore1 = getState().savedResults.find((r) => r.id === result1.id)!.score;
      const originalScore2 = getState().savedResults.find((r) => r.id === result2.id)!.score;

      let orderId: string;
      act(() => {
        const order = getState().createChangeOrderFromResult(result1.id, "张三");
        orderId = order.id;
        getState().updateChangeOrderParams(orderId, "temperature", 220);
        getState().updateChangeOrderReason(orderId, "原因");
        getState().updateChangeOrderTempPressureReason(orderId, "温压原因");
        getState().submitChangeOrder(orderId, "李四");
        getState().approveChangeOrder(orderId, "王五");
      });

      expect(getState().savedResults.find((r) => r.id === result1.id)!.score).toBe(originalScore1);
      expect(getState().savedResults.find((r) => r.id === result2.id)!.score).toBe(originalScore2);
      expect(getState().getSortedResults()[0].score).toBe(originalScore1);
    });

    it("非待审状态的变更单不能审批通过", () => {
      const { result1 } = setupTestData();

      let orderId: string;
      act(() => {
        const order = getState().createChangeOrderFromResult(result1.id, "张三");
        orderId = order.id;
        getState().approveChangeOrder(orderId, "王五");
      });

      const updatedOrder = getOrder(orderId)!;
      expect(updatedOrder.status).toBe("draft");
    });

    it("没有审批人不能审批通过", () => {
      const { result1 } = setupTestData();

      let orderId: string;
      act(() => {
        const order = getState().createChangeOrderFromResult(result1.id, "张三");
        orderId = order.id;
        getState().updateChangeOrderParams(orderId, "temperature", 220);
        getState().updateChangeOrderReason(orderId, "原因");
        getState().updateChangeOrderTempPressureReason(orderId, "温压原因");
        getState().submitChangeOrder(orderId, "李四");
      });

      const pendingOrder = getOrder(orderId)!;
      expect(pendingOrder.status).toBe("pending");

      act(() => {
        getState().approveChangeOrder(orderId, "");
      });

      const stillPendingOrder = getOrder(orderId)!;
      expect(stillPendingOrder.status).toBe("pending");
    });
  });

  describe("5. 审批驳回", () => {
    it("待审状态的变更单应该能审批驳回", () => {
      const { result1 } = setupTestData();

      let orderId: string;
      act(() => {
        const order = getState().createChangeOrderFromResult(result1.id, "张三");
        orderId = order.id;
        getState().updateChangeOrderParams(orderId, "temperature", 220);
        getState().updateChangeOrderReason(orderId, "原因");
        getState().updateChangeOrderTempPressureReason(orderId, "温压原因");
        getState().submitChangeOrder(orderId, "李四");
        getState().rejectChangeOrder(orderId, "王五", "参数变更不合理");
      });

      const updatedOrder = getOrder(orderId)!;
      expect(updatedOrder.status).toBe("rejected");
      expect(updatedOrder.approver).toBe("王五");
      expect(updatedOrder.approvalNote).toBe("参数变更不合理");
      expect(updatedOrder.auditTrail).toHaveLength(3);
      expect(updatedOrder.auditTrail[2].action).toBe("reject");
      expect(updatedOrder.auditTrail[2].operator).toBe("王五");
      expect(updatedOrder.auditTrail[2].note).toBe("参数变更不合理");
    });

    it("审批驳回不应影响原评分榜", () => {
      const { result1 } = setupTestData();
      const originalResults = [...getState().savedResults];

      let orderId: string;
      act(() => {
        const order = getState().createChangeOrderFromResult(result1.id, "张三");
        orderId = order.id;
        getState().updateChangeOrderParams(orderId, "temperature", 220);
        getState().updateChangeOrderReason(orderId, "原因");
        getState().updateChangeOrderTempPressureReason(orderId, "温压原因");
        getState().submitChangeOrder(orderId, "李四");
        getState().rejectChangeOrder(orderId, "王五", "驳回");
      });

      expect(getState().savedResults).toEqual(originalResults);
    });

    it("非待审状态的变更单不能审批驳回", () => {
      const { result1 } = setupTestData();

      let orderId: string;
      act(() => {
        const order = getState().createChangeOrderFromResult(result1.id, "张三");
        orderId = order.id;
        getState().rejectChangeOrder(orderId, "王五", "驳回");
      });

      const updatedOrder = getOrder(orderId)!;
      expect(updatedOrder.status).toBe("draft");
    });

    it("驳回没有审批意见不能审批驳回", () => {
      const { result1 } = setupTestData();

      let orderId: string;
      act(() => {
        const order = getState().createChangeOrderFromResult(result1.id, "张三");
        orderId = order.id;
        getState().updateChangeOrderParams(orderId, "temperature", 220);
        getState().updateChangeOrderReason(orderId, "原因");
        getState().updateChangeOrderTempPressureReason(orderId, "温压原因");
        getState().submitChangeOrder(orderId, "李四");
        getState().rejectChangeOrder(orderId, "王五", "");
      });

      const updatedOrder = getOrder(orderId)!;
      expect(updatedOrder.status).toBe("pending");
    });
  });

  describe("6. 状态筛选", () => {
    const setupOrdersWithDifferentStatus = () => {
      const { result1 } = setupTestData();
      const orderIds: string[] = [];

      let order1Id: string, order2Id: string, order3Id: string, order4Id: string;

      act(() => {
        order1Id = getState().createChangeOrderFromResult(result1.id, "张三").id;
        order2Id = getState().createChangeOrderFromResult(result1.id, "张三").id;
        order3Id = getState().createChangeOrderFromResult(result1.id, "张三").id;
        order4Id = getState().createChangeOrderFromResult(result1.id, "张三").id;
        orderIds.push(order1Id, order2Id, order3Id, order4Id);
      });

      act(() => {
        getState().updateChangeOrderParams(order1Id, "temperature", 220);
        getState().updateChangeOrderReason(order1Id, "原因1");
        getState().updateChangeOrderTempPressureReason(order1Id, "温压原因1");
      });

      act(() => {
        getState().submitChangeOrder(order1Id, "李四");
      });

      act(() => {
        getState().approveChangeOrder(order1Id, "王五");
      });

      act(() => {
        getState().updateChangeOrderParams(order2Id, "pressure", 2.0);
        getState().updateChangeOrderReason(order2Id, "原因2");
        getState().updateChangeOrderTempPressureReason(order2Id, "温压原因2");
      });

      act(() => {
        getState().submitChangeOrder(order2Id, "李四");
      });

      act(() => {
        getState().rejectChangeOrder(order2Id, "赵六", "驳回原因");
      });

      act(() => {
        getState().updateChangeOrderParams(order4Id, "reactionTime", 90);
        getState().updateChangeOrderReason(order4Id, "原因4");
      });

      act(() => {
        getState().submitChangeOrder(order4Id, "李四");
      });

      return orderIds;
    };

    it("应该能按状态筛选变更单", () => {
      setupOrdersWithDifferentStatus();

      expect(getState().changeOrders).toHaveLength(4);
      const statuses = getState().changeOrders.map(o => o.status);
      expect(statuses).toEqual(expect.arrayContaining(["approved", "rejected", "draft", "pending"]));

      expect(getState().getFilteredChangeOrders()).toHaveLength(4);

      act(() => {
        getState().setChangeOrderFilterStatus("draft");
      });
      const filteredDraft = getState().getFilteredChangeOrders();
      expect(filteredDraft).toHaveLength(1);
      expect(filteredDraft[0].status).toBe("draft");

      act(() => {
        getState().setChangeOrderFilterStatus("pending");
      });
      const filteredPending = getState().getFilteredChangeOrders();
      expect(filteredPending).toHaveLength(1);
      expect(filteredPending[0].status).toBe("pending");

      act(() => {
        getState().setChangeOrderFilterStatus("approved");
      });
      const filteredApproved = getState().getFilteredChangeOrders();
      expect(filteredApproved).toHaveLength(1);
      expect(filteredApproved[0].status).toBe("approved");

      act(() => {
        getState().setChangeOrderFilterStatus("rejected");
      });
      const filteredRejected = getState().getFilteredChangeOrders();
      expect(filteredRejected).toHaveLength(1);
      expect(filteredRejected[0].status).toBe("rejected");
    });

    it("应该能按优先级筛选变更单", () => {
      const { result1 } = setupTestData();

      let order1Id: string, order2Id: string;
      act(() => {
        const order1 = getState().createChangeOrderFromResult(result1.id, "张三");
        order1Id = order1.id;
        const order2 = getState().createChangeOrderFromResult(result1.id, "李四");
        order2Id = order2.id;
      });

      act(() => {
        useExperimentStore.setState((state) => ({
          changeOrders: state.changeOrders.map((o) => {
            if (o.id === order1Id) return { ...o, priority: "high" as const };
            if (o.id === order2Id) return { ...o, priority: "urgent" as const };
            return o;
          }),
        }));
      });

      const orders = getState().changeOrders;
      const order1 = orders.find(o => o.id === order1Id)!;
      const order2 = orders.find(o => o.id === order2Id)!;
      expect(order1.priority).toBe("high");
      expect(order2.priority).toBe("urgent");

      expect(getState().getFilteredChangeOrders()).toHaveLength(2);

      act(() => {
        getState().setChangeOrderFilterPriority("high");
      });

      const filteredHigh = getState().getFilteredChangeOrders();
      expect(filteredHigh).toHaveLength(1);
      expect(filteredHigh[0].priority).toBe("high");

      act(() => {
        getState().setChangeOrderFilterPriority("urgent");
      });

      const filteredUrgent = getState().getFilteredChangeOrders();
      expect(filteredUrgent).toHaveLength(1);
      expect(filteredUrgent[0].priority).toBe("urgent");
    });

    it("应该能按关键词搜索变更单", () => {
      const { result1 } = setupTestData();

      let order1Id: string, order2Id: string;
      act(() => {
        const order1 = getState().createChangeOrderFromResult(result1.id, "张三");
        order1Id = order1.id;
        const order2 = getState().createChangeOrderFromResult(result1.id, "李四");
        order2Id = order2.id;
      });

      act(() => {
        getState().updateChangeOrderReason(order1Id, "优化温度参数");
        getState().updateChangeOrderReason(order2Id, "调整压力");
      });

      const ordersBefore = getState().changeOrders;
      const order1Before = ordersBefore.find(o => o.id === order1Id)!;
      const order2Before = ordersBefore.find(o => o.id === order2Id)!;
      expect(order1Before.changeReason).toBe("优化温度参数");
      expect(order2Before.changeReason).toBe("调整压力");

      act(() => {
        getState().setChangeOrderSearchKeyword("温度");
      });

      const filtered = getState().getFilteredChangeOrders();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(order1Id);
      expect(filtered[0].changeReason).toContain("温度");

      act(() => {
        getState().setChangeOrderSearchKeyword("李四");
      });

      const filtered2 = getState().getFilteredChangeOrders();
      expect(filtered2).toHaveLength(1);
      expect(filtered2[0].id).toBe(order2Id);
      expect(filtered2[0].createdBy).toBe("李四");
    });

    it("应该能清除筛选条件", () => {
      setupOrdersWithDifferentStatus();

      act(() => {
        getState().setChangeOrderFilterStatus("draft");
        getState().setChangeOrderFilterPriority("high");
        getState().setChangeOrderSearchKeyword("test");
      });

      expect(getState().changeOrderFilterStatus).toBe("draft");

      act(() => {
        getState().clearChangeOrderFilters();
      });

      expect(getState().changeOrderFilterStatus).toBeNull();
      expect(getState().changeOrderFilterPriority).toBeNull();
      expect(getState().changeOrderSearchKeyword).toBe("");
      expect(getState().getFilteredChangeOrders()).toHaveLength(4);
    });

    it("状态筛选不应影响原评分榜", () => {
      const { result1, result2 } = setupTestData();
      const originalCount = getState().savedResults.length;

      setupOrdersWithDifferentStatus();

      act(() => {
        getState().setChangeOrderFilterStatus("approved");
      });

      expect(getState().savedResults).toHaveLength(originalCount);
      expect(getState().savedResults[0].id).toBe(result1.id);
      expect(getState().savedResults[1].id).toBe(result2.id);
    });
  });

  describe("7. 审批记录展示", () => {
    it("创建变更单应该有初始审批记录", () => {
      const { result1 } = setupTestData();

      let orderId: string;
      act(() => {
        const order = getState().createChangeOrderFromResult(result1.id, "张三");
        orderId = order.id;
      });

      const order = getOrder(orderId)!;
      expect(order.auditTrail).toHaveLength(1);
      expect(order.auditTrail[0].action).toBe("submit");
      expect(order.auditTrail[0].operator).toBe("张三");
      expect(order.auditTrail[0].note).toBe("创建变更单");
      expect(order.auditTrail[0].timestamp).toBeDefined();
    });

    it("完整审批流程应该有完整的审批记录链", () => {
      const { result1 } = setupTestData();

      let orderId: string;
      const baseTime = 1000;

      vi.useFakeTimers();
      vi.setSystemTime(baseTime);

      act(() => {
        const order = getState().createChangeOrderFromResult(result1.id, "张三");
        orderId = order.id;
      });

      vi.setSystemTime(baseTime + 1000);
      act(() => {
        getState().updateChangeOrderParams(orderId, "temperature", 220);
        getState().updateChangeOrderReason(orderId, "原因");
        getState().updateChangeOrderTempPressureReason(orderId, "温压原因");
      });

      vi.setSystemTime(baseTime + 2000);
      act(() => {
        getState().submitChangeOrder(orderId, "李四", "请审批");
      });

      vi.setSystemTime(baseTime + 3000);
      act(() => {
        getState().approveChangeOrder(orderId, "王五", "同意");
      });

      vi.useRealTimers();

      const updatedOrder = getOrder(orderId)!;
      expect(updatedOrder.auditTrail).toHaveLength(3);

      expect(updatedOrder.auditTrail[0].action).toBe("submit");
      expect(updatedOrder.auditTrail[0].operator).toBe("张三");
      expect(updatedOrder.auditTrail[0].note).toBe("创建变更单");

      expect(updatedOrder.auditTrail[1].action).toBe("submit");
      expect(updatedOrder.auditTrail[1].operator).toBe("李四");
      expect(updatedOrder.auditTrail[1].note).toBe("请审批");

      expect(updatedOrder.auditTrail[2].action).toBe("approve");
      expect(updatedOrder.auditTrail[2].operator).toBe("王五");
      expect(updatedOrder.auditTrail[2].note).toBe("同意");

      const timestamps = updatedOrder.auditTrail.map((r) => r.timestamp);
      expect(timestamps[0]).toBeLessThan(timestamps[1]);
      expect(timestamps[1]).toBeLessThan(timestamps[2]);
    });

    it("驳回流程应该有正确的审批记录", () => {
      const { result1 } = setupTestData();

      let orderId: string;
      act(() => {
        const order = getState().createChangeOrderFromResult(result1.id, "张三");
        orderId = order.id;
        getState().updateChangeOrderParams(orderId, "temperature", 220);
        getState().updateChangeOrderReason(orderId, "原因");
        getState().updateChangeOrderTempPressureReason(orderId, "温压原因");
        getState().submitChangeOrder(orderId, "李四");
        getState().rejectChangeOrder(orderId, "王五", "参数不合理");
      });

      const updatedOrder = getOrder(orderId)!;
      expect(updatedOrder.auditTrail).toHaveLength(3);
      expect(updatedOrder.auditTrail[2].action).toBe("reject");
      expect(updatedOrder.auditTrail[2].operator).toBe("王五");
      expect(updatedOrder.auditTrail[2].note).toBe("参数不合理");
    });

    it("审批记录不应影响原评分榜", () => {
      const { result1 } = setupTestData();
      const originalResults = [...getState().savedResults];

      let orderId: string;
      act(() => {
        const order = getState().createChangeOrderFromResult(result1.id, "张三");
        orderId = order.id;
        getState().updateChangeOrderParams(orderId, "temperature", 220);
        getState().updateChangeOrderReason(orderId, "原因");
        getState().updateChangeOrderTempPressureReason(orderId, "温压原因");
        getState().submitChangeOrder(orderId, "李四");
        getState().approveChangeOrder(orderId, "王五");
      });

      expect(getState().savedResults).toEqual(originalResults);
    });
  });

  describe("8. 变更单统计信息", () => {
    it("应该能正确统计各状态变更单数量", () => {
      const { result1 } = setupTestData();

      act(() => {
        const order1 = getState().createChangeOrderFromResult(result1.id, "张三");
        getState().updateChangeOrderParams(order1.id, "temperature", 220);
        getState().updateChangeOrderReason(order1.id, "原因1");
        getState().updateChangeOrderTempPressureReason(order1.id, "温压原因1");
        getState().submitChangeOrder(order1.id, "李四");
        getState().approveChangeOrder(order1.id, "王五");

        const order2 = getState().createChangeOrderFromResult(result1.id, "张三");
        getState().updateChangeOrderParams(order2.id, "pressure", 2.0);
        getState().updateChangeOrderReason(order2.id, "原因2");
        getState().updateChangeOrderTempPressureReason(order2.id, "温压原因2");
        getState().submitChangeOrder(order2.id, "李四");
        getState().rejectChangeOrder(order2.id, "赵六", "驳回");

        getState().createChangeOrderFromResult(result1.id, "张三");

        const order4 = getState().createChangeOrderFromResult(result1.id, "张三");
        getState().updateChangeOrderParams(order4.id, "reactionTime", 90);
        getState().updateChangeOrderReason(order4.id, "原因4");
        getState().submitChangeOrder(order4.id, "李四");
      });

      const stats = getState().getChangeOrderStats();
      expect(stats.total).toBe(4);
      expect(stats.draft).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.approved).toBe(1);
      expect(stats.rejected).toBe(1);
    });

    it("变更单统计不应影响原评分榜", () => {
      const { result1, result2 } = setupTestData();
      const originalSorted = getState().getSortedResults();

      act(() => {
        for (let i = 0; i < 3; i++) {
          getState().createChangeOrderFromResult(result1.id, `创建人${i}`);
        }
      });

      const stats = getState().getChangeOrderStats();
      expect(stats.total).toBe(3);
      expect(getState().getSortedResults()).toEqual(originalSorted);
      expect(getState().savedResults[0].score).toBe(result1.score);
      expect(getState().savedResults[1].score).toBe(result2.score);
    });
  });

  describe("9. 变更单删除", () => {
    it("应该能删除草稿状态的变更单", () => {
      const { result1 } = setupTestData();

      let orderId: string;
      act(() => {
        const order = getState().createChangeOrderFromResult(result1.id, "张三");
        orderId = order.id;
      });

      expect(getState().changeOrders).toHaveLength(1);

      act(() => {
        getState().deleteChangeOrder(orderId);
      });

      expect(getState().changeOrders).toHaveLength(0);
      expect(getState().currentChangeOrder).toBeNull();
    });

    it("删除变更单不应影响原评分榜", () => {
      const { result1 } = setupTestData();
      const originalResults = [...getState().savedResults];

      let orderId: string;
      act(() => {
        const order = getState().createChangeOrderFromResult(result1.id, "张三");
        orderId = order.id;
        getState().deleteChangeOrder(orderId);
      });

      expect(getState().savedResults).toEqual(originalResults);
    });
  });
});
