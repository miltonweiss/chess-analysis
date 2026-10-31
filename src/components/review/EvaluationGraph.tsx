"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatEvaluation } from "@/lib/engine/uci";
import type { EvaluationPoint } from "@/lib/review/types";
import type { MoveAnalysis } from "@/lib/analysis/types";
import { classificationHex } from "@/lib/analysis/classificationDisplay";

type EvaluationGraphProps = {
  timeline: EvaluationPoint[];
  selectedPly: number;
  onSelectPly: (ply: number) => void;
  compact?: boolean;
  moveAnalyses?: Map<number, MoveAnalysis>;
};

const GRAPH_HEIGHT = 120;
const PADDING = { top: 8, right: 8, bottom: 20, left: 36 };

function mapWinToY(winPercent: number, innerHeight: number, paddingTop: number): number {
  const clamped = Math.max(0, Math.min(100, winPercent));
  return paddingTop + ((100 - clamped) / 100) * innerHeight;
}

export function EvaluationGraph({
  timeline,
  selectedPly,
  onSelectPly,
  compact = false,
  moveAnalyses,
}: EvaluationGraphProps) {
  const [hoverPly, setHoverPly] = useState<number | null>(null);
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const compactRef = useRef<HTMLDivElement>(null);
  const hasTimeline = timeline.length > 0;
  const graphHeight = compact ? 72 : GRAPH_HEIGHT;
  const padding = compact ? { top: 6, right: 4, bottom: 6, left: 4 } : PADDING;

  // Compact graph always spans the full width of its container.
  useEffect(() => {
    const el = compactRef.current;
    if (!compact || !el) {
      return;
    }
    const update = () => setMeasuredWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [compact, hasTimeline]);

  const layout = useMemo(() => {
    if (timeline.length === 0) {
      return null;
    }

    const width = compact ? measuredWidth || 360 : Math.max(320, timeline.length * 18);
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = graphHeight - padding.top - padding.bottom;
    const step = timeline.length > 1 ? innerWidth / (timeline.length - 1) : 0;
    const zeroY = mapWinToY(50, innerHeight, padding.top);

    const points = timeline.map((point, index) => {
      const x = padding.left + index * step;
      const y = mapWinToY(point.winPercent, innerHeight, padding.top);
      return { ...point, x, y };
    });

    const linePath = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");

    const areaAbove = [
      `M ${points[0]?.x.toFixed(1)} ${zeroY}`,
      ...points.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
      `L ${points[points.length - 1]?.x.toFixed(1)} ${zeroY}`,
      "Z",
    ].join(" ");

    return { width, innerHeight, step, zeroY, points, linePath, areaAbove };
  }, [timeline, compact, measuredWidth, graphHeight, padding.left, padding.right, padding.top, padding.bottom]);

  if (!layout) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 text-center text-xs text-zinc-500">
        Run analysis to view the evaluation graph.
      </div>
    );
  }

  const activePoint =
    layout.points.find((p) => p.ply === (hoverPly ?? selectedPly)) ?? layout.points[0];

  return (
    <div className="space-y-2">
      {compact ? null : (
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>Move {activePoint?.moveNumber ?? 0}</span>
          <span className="font-mono text-zinc-200">
            {activePoint ? formatEvaluation(activePoint.evaluation) : "—"} (
            {activePoint?.winPercent.toFixed(1)}% White)
          </span>
        </div>
      )}

      <div
        ref={compactRef}
        className={
          compact
            ? "overflow-x-auto"
            : "overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950/60 p-2"
        }
      >
        <svg
          role="img"
          aria-label="Evaluation graph showing White advantage over the game"
          viewBox={`0 0 ${layout.width} ${graphHeight}`}
          className={compact ? "h-[72px] w-full" : "h-[120px] min-w-full"}
          onMouseLeave={() => setHoverPly(null)}
        >
          <line
            x1={padding.left}
            x2={layout.width - padding.right}
            y1={layout.zeroY}
            y2={layout.zeroY}
            stroke="#52525b"
            strokeDasharray="4 4"
          />

          {compact
            ? null
            : [100, 50, 0].map((tick) => (
                <g key={tick}>
                  <text
                    x={2}
                    y={mapWinToY(tick, layout.innerHeight, padding.top) + 3}
                    fill="#71717a"
                    fontSize="10"
                  >
                    {tick === 50 ? "0" : tick === 100 ? "W" : "B"}
                  </text>
                </g>
              ))}

          <path d={layout.areaAbove} fill="rgba(244,244,245,0.08)" />
          <path d={layout.linePath} fill="none" stroke="#e4e4e7" strokeWidth="2" />

          {/* Clickable columns for hovering/selecting */}
          {layout.points.map((point) => {
            const hitWidth = layout.step > 0 ? layout.step : layout.width;
            const x = layout.step > 0 ? point.x - hitWidth / 2 : 0;
            return (
              <rect
                key={`hit-${point.ply}`}
                x={x}
                y={0}
                width={hitWidth}
                height={graphHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoverPly(point.ply)}
                onClick={() => onSelectPly(point.ply)}
              />
            );
          })}

          {/* Dots on significant moments (brilliant, great, miss, mistake, blunder) */}
          {layout.points.map((point) => {
            const analysis = moveAnalyses?.get(point.ply);
            const isSelected = point.ply === selectedPly;

            if (analysis) {
              const cls = analysis.classification;
              if (
                cls === "brilliant" ||
                cls === "great" ||
                cls === "miss" ||
                cls === "mistake" ||
                cls === "blunder"
              ) {
                const color = classificationHex(cls);
                return (
                  <circle
                    key={`dot-${point.ply}`}
                    cx={point.x}
                    cy={point.y}
                    r={isSelected ? 5 : 3.5}
                    fill={color}
                    stroke={isSelected ? "#ffffff" : "rgba(0,0,0,0.5)"}
                    strokeWidth={isSelected ? 2 : 1}
                    className="cursor-pointer transition-all pointer-events-none"
                  />
                );
              }
            }

            if (isSelected) {
              return (
                <circle
                  key={`selected-${point.ply}`}
                  cx={point.x}
                  cy={point.y}
                  r={4}
                  fill="#ffffff"
                  stroke="rgba(0,0,0,0.6)"
                  strokeWidth={1.5}
                  pointerEvents="none"
                />
              );
            }

            return null;
          })}
        </svg>
      </div>
    </div>
  );
}
