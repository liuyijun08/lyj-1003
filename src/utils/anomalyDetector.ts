import type { CurvePoint } from "@/types";

export function detectAnomalies(curveData: CurvePoint[], threshold: number = 2.5): number[] {
  const anomalies: number[] = [];

  const meanY = curveData.reduce((sum, p) => sum + p.y, 0) / curveData.length;
  const variance =
    curveData.reduce((sum, p) => sum + Math.pow(p.y - meanY, 2), 0) / curveData.length;
  const stdDev = Math.sqrt(variance);

  for (let i = 0; i < curveData.length; i++) {
    const zScore = Math.abs(curveData[i].y - meanY) / (stdDev || 1);
    if (zScore > threshold) {
      anomalies.push(i);
    }
  }

  for (let i = 1; i < curveData.length - 1; i++) {
    const prev = curveData[i - 1].y;
    const curr = curveData[i].y;
    const next = curveData[i + 1].y;
    const localDiff = Math.abs(curr - (prev + next) / 2);
    if (localDiff > 8 && !anomalies.includes(i)) {
      anomalies.push(i);
    }
  }

  return anomalies;
}

export function getAnomalyNote(index: number, curveData: CurvePoint[]): string {
  if (index === 0) return "起始数据点异常";
  if (index === curveData.length - 1) return "终点数据偏离";

  const point = curveData[index];
  const avg = (curveData[index - 1].y + curveData[index + 1].y) / 2;
  const diff = point.y - avg;

  if (diff > 0) return `异常偏高 (+${diff.toFixed(1)})`;
  return `异常偏低 (${diff.toFixed(1)})`;
}
