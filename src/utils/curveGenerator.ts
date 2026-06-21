import type { ExperimentParams, CurvePoint } from "@/types";

export function generateCurve(params: ExperimentParams): CurvePoint[] {
  const points: CurvePoint[] = [];
  const pointCount = 50;

  const tempFactor = (params.temperature - 25) / 275;
  const pressureFactor = (params.pressure - 0.1) / 9.9;
  const timeFactor = params.reactionTime / 24;
  const ratioOptimal = Math.abs(params.ratioA - 40) + Math.abs(params.ratioB - 35) + Math.abs(params.ratioC - 25);
  const ratioFactor = 1 - ratioOptimal / 200;

  const baseConversion = 0.15 + tempFactor * 0.35 + pressureFactor * 0.2 + ratioFactor * 0.3;
  const rateConstant = 0.05 + tempFactor * 0.15 + pressureFactor * 0.05;
  const maxYield = Math.min(98, 40 + baseConversion * 60);

  for (let i = 0; i <= pointCount; i++) {
    const t = (i / pointCount) * timeFactor * 2;
    const conversion = maxYield * (1 - Math.exp(-rateConstant * t * 5));
    const noise = (Math.random() - 0.5) * 2;
    const drift = ratioFactor < 0.5 ? -Math.abs(Math.sin(t * 2)) * 5 * (1 - ratioFactor) : 0;

    let y = Math.max(0, Math.min(100, conversion + noise + drift));
    y = parseFloat(y.toFixed(2));

    points.push({
      x: parseFloat(((i / pointCount) * params.reactionTime).toFixed(2)),
      y,
    });
  }

  return points;
}

export function calculateMetrics(
  params: ExperimentParams,
  curveData: CurvePoint[]
): { yieldRate: number; stability: number; score: number } {
  const lastPoints = curveData.slice(-10);
  const yieldRate = lastPoints.reduce((sum, p) => sum + p.y, 0) / lastPoints.length;

  const meanY = curveData.reduce((sum, p) => sum + p.y, 0) / curveData.length;
  const variance =
    curveData.reduce((sum, p) => sum + Math.pow(p.y - meanY, 2), 0) / curveData.length;
  const stdDev = Math.sqrt(variance);
  const stability = Math.max(0, 100 - stdDev * 5);

  const tempFactor = 1 - Math.abs(params.temperature - 180) / 300;
  const pressureFactor = 1 - Math.abs(params.pressure - 5) / 10;
  const ratioOptimal =
    Math.abs(params.ratioA - 40) + Math.abs(params.ratioB - 35) + Math.abs(params.ratioC - 25);
  const ratioFactor = 1 - ratioOptimal / 200;

  const score = parseFloat(
    (yieldRate * 0.5 + stability * 0.2 + tempFactor * 100 * 0.1 + pressureFactor * 100 * 0.1 + ratioFactor * 100 * 0.1).toFixed(1)
  );

  return {
    yieldRate: parseFloat(yieldRate.toFixed(1)),
    stability: parseFloat(stability.toFixed(1)),
    score,
  };
}
