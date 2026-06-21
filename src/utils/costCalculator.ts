import type {
  ExperimentParams,
  EnergyCostConfig,
  CostCalculationResult,
  CostBudget,
} from "@/types";

export const DEFAULT_ENERGY_COST_CONFIG: EnergyCostConfig = {
  electricityPrice: 0.85,
  carbonFactor: 0.58,
  basePower: 50,
  tempPowerCoefficient: 0.15,
  pressurePowerCoefficient: 3.5,
};

export const DEFAULT_COST_BUDGET: CostBudget = {
  electricityBudget: 5000,
  carbonBudget: 3000,
  totalBudget: 8000,
};

export function calculateEnergyCost(
  params: ExperimentParams,
  config: EnergyCostConfig = DEFAULT_ENERGY_COST_CONFIG
): CostCalculationResult {
  const { temperature, pressure, reactionTime } = params;
  const {
    electricityPrice,
    carbonFactor,
    basePower,
    tempPowerCoefficient,
    pressurePowerCoefficient,
  } = config;

  const tempPower = temperature * tempPowerCoefficient;
  const pressurePower = pressure * pressurePowerCoefficient;
  const totalPower = basePower + tempPower + pressurePower;

  const electricityConsumption = totalPower * reactionTime;
  const electricityCost = electricityConsumption * electricityPrice;
  const carbonEmission = electricityConsumption * carbonFactor;
  const carbonCost = carbonEmission * 0.05;
  const totalCost = electricityCost + carbonCost;

  return {
    electricityConsumption: Math.round(electricityConsumption * 100) / 100,
    electricityCost: Math.round(electricityCost * 100) / 100,
    carbonEmission: Math.round(carbonEmission * 100) / 100,
    carbonCost: Math.round(carbonCost * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
  };
}

export function isOverBudget(
  result: CostCalculationResult,
  budget: CostBudget
): {
  electricityOver: boolean;
  carbonOver: boolean;
  totalOver: boolean;
  anyOver: boolean;
} {
  const electricityOver = result.electricityCost > budget.electricityBudget;
  const carbonOver = result.carbonEmission > budget.carbonBudget;
  const totalOver = result.totalCost > budget.totalBudget;
  return {
    electricityOver,
    carbonOver,
    totalOver,
    anyOver: electricityOver || carbonOver || totalOver,
  };
}

export function getBudgetPercentage(
  result: CostCalculationResult,
  budget: CostBudget
): {
  electricityPercent: number;
  carbonPercent: number;
  totalPercent: number;
} {
  return {
    electricityPercent: budget.electricityBudget > 0
      ? Math.round((result.electricityCost / budget.electricityBudget) * 10000) / 100
      : 0,
    carbonPercent: budget.carbonBudget > 0
      ? Math.round((result.carbonEmission / budget.carbonBudget) * 10000) / 100
      : 0,
    totalPercent: budget.totalBudget > 0
      ? Math.round((result.totalCost / budget.totalBudget) * 10000) / 100
      : 0,
  };
}

export function formatCurrency(value: number): string {
  if (value >= 10000) {
    return (value / 10000).toFixed(2) + " 万";
  }
  return value.toFixed(2) + " 元";
}

export function formatCarbon(value: number): string {
  if (value >= 1000) {
    return (value / 1000).toFixed(2) + " t";
  }
  return value.toFixed(2) + " kg";
}

export function formatEnergy(value: number): string {
  if (value >= 1000) {
    return (value / 1000).toFixed(2) + " MWh";
  }
  return value.toFixed(2) + " kWh";
}
