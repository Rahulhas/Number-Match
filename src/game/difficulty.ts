import type { DifficultyProfile } from "./types";

const anchors: Record<number, Partial<DifficultyProfile>> = {
  1: { targetSeconds: 90, density: 0.70, friction: 0.12, idealAdds: 1 },
  3: { targetSeconds: 180, density: 0.50, friction: 0.34, idealAdds: 2 },
  5: { targetSeconds: 300, density: 0.34, friction: 0.58, idealAdds: 3 },
  6: { targetSeconds: 180, density: 0.50, friction: 0.32, idealAdds: 2 }
};

function interpolate(level: number, key: "targetSeconds" | "density" | "friction" | "idealAdds") {
  const points = Object.keys(anchors).map(Number).sort((a, b) => a - b);
  if (anchors[level]?.[key] !== undefined) return anchors[level][key] as number;

  let lo = points[0], hi = points[points.length - 1];
  for (let i = 0; i < points.length - 1; i++) {
    if (level >= points[i] && level <= points[i + 1]) {
      lo = points[i];
      hi = points[i + 1];
      break;
    }
  }

  if (level > hi) {
    // Post-level-6 ramp: peak around level 10, then relief at 11.
    if (level === 11) return key === "targetSeconds" ? 240 : key === "density" ? 0.43 : key === "friction" ? 0.38 : 3;
    const peak = anchors[5]![key] as number;
    const relief = anchors[6]![key] as number;
    const t = Math.min(1, Math.max(0, (level - 6) / 4));
    if (key === "targetSeconds") return Math.round(relief + (peak - relief) * t);
    if (key === "density") return relief + (0.27 - relief) * t;
    if (key === "friction") return relief + (0.70 - relief) * t;
    return Math.round(2 + 2 * t);
  }

  const a = anchors[lo]![key] as number;
  const b = anchors[hi]![key] as number;
  const t = (level - lo) / (hi - lo);
  return a + (b - a) * t;
}

export function getDifficultyProfile(level: number): DifficultyProfile {
  const relief = level === 6 || level === 11;
  return {
    level,
    targetSeconds: Math.round(interpolate(level, "targetSeconds")),
    density: Number(interpolate(level, "density").toFixed(2)),
    friction: Number(interpolate(level, "friction").toFixed(2)),
    addRowPressure: Math.min(0.9, 0.20 + level * 0.045),
    idealAdds: Math.min(4, Math.max(1, Math.round(interpolate(level, "idealAdds")))),
    relief
  };
}
