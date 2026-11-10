"use client";

import { useEffect, useRef, useState } from "react";
import { dayToTime, formatCompact, formatDay, formatInt } from "./metrics";

export type ViewsPoint = { day: string; views: number };

const HEIGHT = 220;
const MARGIN = { top: 14, right: 14, bottom: 26, left: 44 };
const SERIES = "var(--color-brand-600)";

/** Rounds a maximum up to a tidy axis value (1, 2, 2.5 or 5 × a power of ten). */
function niceMax(max: number): number {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * pow >= max) ?? 10;
  return step * pow;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

/**
 * Views over time for one episode, drawn as inline SVG at the container's real pixel size.
 * Each point is a snapshot of the cumulative total. Needs at least two snapshots to draw a
 * line; with fewer it says so instead of drawing a misleading chart.
 */
export function ViewsChart({ points }: { points: ViewsPoint[] }) {
  if (points.length === 0) {
    return <p className="rounded-2xl bg-brand-50 px-4 py-8 text-center text-[13px] text-muted">No snapshots for this episode yet, so there is nothing to chart.</p>;
  }
  if (points.length === 1) {
    return (
      <div className="rounded-2xl bg-brand-50 px-4 py-6 text-center">
        <p className="font-display text-3xl font-extrabold tabular-nums text-navy-900">{formatInt(points[0].views)}</p>
        <p className="mt-0.5 text-[13px] font-semibold text-navy-800">views on {formatDay(points[0].day)}</p>
        <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-muted">One snapshot is a single point. Add another on a later date to see how views change over time.</p>
      </div>
    );
  }
  return <LineChart points={points} />;
}

function LineChart({ points }: { points: ViewsPoint[] }) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const innerW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const t0 = dayToTime(points[0].day);
  const t1 = dayToTime(points[points.length - 1].day);
  const span = Math.max(1, t1 - t0);
  const yMax = niceMax(Math.max(...points.map((p) => p.views)));
  const x = (day: string) => MARGIN.left + ((dayToTime(day) - t0) / span) * innerW;
  const y = (views: number) => MARGIN.top + innerH - (views / yMax) * innerH;
  const baseline = MARGIN.top + innerH;

  const coords = points.map((p) => ({ ...p, cx: x(p.day), cy: y(p.views) }));
  const line = coords.map((c, i) => `${i ? "L" : "M"}${c.cx.toFixed(1)},${c.cy.toFixed(1)}`).join(" ");
  const area = `${line} L${coords[coords.length - 1].cx.toFixed(1)},${baseline} L${coords[0].cx.toFixed(1)},${baseline} Z`;

  const yTicks = yMax >= 2 ? [0, yMax / 2, yMax] : [0, yMax];
  // Evenly spaced date ticks, as many as fit without touching each other.
  const tickCount = Math.max(2, Math.min(5, Math.floor(innerW / 96) + 1));
  const sameYear = points[0].day.slice(0, 4) === points[points.length - 1].day.slice(0, 4);
  const xTicks = Array.from({ length: tickCount }, (_, i) => {
    const t = t0 + (span * i) / (tickCount - 1);
    return { px: MARGIN.left + (innerW * i) / (tickCount - 1), label: formatDay(new Date(t).toISOString().slice(0, 10), sameYear) };
  });

  const nearest = (clientX: number, target: Element) => {
    const px = clientX - target.getBoundingClientRect().left;
    let best = 0;
    for (let i = 1; i < coords.length; i++) if (Math.abs(coords[i].cx - px) < Math.abs(coords[best].cx - px)) best = i;
    return best;
  };

  const shown = active !== null && active < coords.length ? coords[active] : null;
  const showAllMarkers = coords.length <= 24;
  const last = points[points.length - 1];

  return (
    <div ref={ref} className="relative" style={{ height: HEIGHT }}>
      {width > 0 ? (
        <>
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            tabIndex={0}
            aria-label={`Views over time: ${points.length} snapshots from ${formatDay(points[0].day)} to ${formatDay(last.day)}. Latest total ${formatInt(last.views)} views. Use the left and right arrow keys to read each snapshot; the same numbers are listed below.`}
            className="block touch-pan-y select-none rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            onPointerMove={(e) => setActive(nearest(e.clientX, e.currentTarget))}
            onPointerDown={(e) => setActive(nearest(e.clientX, e.currentTarget))}
            onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
            onBlur={() => setActive(null)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
              e.preventDefault();
              setActive((i) => {
                if (i === null) return e.key === "ArrowLeft" ? coords.length - 1 : 0;
                return Math.max(0, Math.min(coords.length - 1, i + (e.key === "ArrowLeft" ? -1 : 1)));
              });
            }}
          >
            {yTicks.map((t) => (
              <g key={t}>
                <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth={1} />
                <text x={MARGIN.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--color-muted)" className="tabular-nums">
                  {formatCompact(t)}
                </text>
              </g>
            ))}
            {xTicks.map((t, i) => (
              <text key={i} x={t.px} y={HEIGHT - 6} textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"} fontSize={11} fill="var(--color-muted)">
                {t.label}
              </text>
            ))}

            <path d={area} fill={SERIES} fillOpacity={0.1} />
            <path d={line} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

            {shown ? <line x1={shown.cx} x2={shown.cx} y1={MARGIN.top} y2={baseline} stroke="var(--color-navy-600)" strokeWidth={1} /> : null}
            {coords.map((c, i) =>
              showAllMarkers || i === active || i === coords.length - 1 ? (
                <circle key={c.day} cx={c.cx} cy={c.cy} r={i === active ? 5.5 : 4} fill={SERIES} stroke="#fff" strokeWidth={2} />
              ) : null,
            )}
          </svg>

          {shown ? (
            <div
              role="status"
              className="pointer-events-none absolute top-0 z-10 rounded-xl bg-navy-900 px-3 py-2 text-white shadow-pop"
              style={shown.cx > width / 2 ? { right: width - shown.cx + 10 } : { left: shown.cx + 10 }}
            >
              <p className="text-sm font-bold tabular-nums">{formatInt(shown.views)} views</p>
              <p className="text-[11px] text-brand-200">{formatDay(shown.day)}</p>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
