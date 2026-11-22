/**
 * Minimal single-series daily bar chart (server-rendered SVG).
 * One measure per chart, never a dual axis. Each bar has a hover tooltip, and a table
 * view of the same data sits on the analytics page.
 */
export function DailyBarChart({ data, label, color = "#c81e45" }: { data: { date: string; value: number }[]; label: string; color?: string }) {
  if (!data.length) return <p className="text-sm text-zinc-500">No data yet.</p>;
  const W = 640;
  const H = 160;
  const padL = 36;
  const padB = 22;
  const max = Math.max(...data.map((d) => d.value), 1);
  const step = (W - padL) / data.length;
  const barW = Math.max(2, step - 2);
  const ticks = [0, Math.round(max / 2), max];
  return (
    <figure>
      <figcaption className="mb-1 text-xs font-semibold text-zinc-600">{label}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${label} per day`}>
        {ticks.map((t) => {
          const y = H - padB - (t / max) * (H - padB - 8);
          return (
            <g key={t}>
              <line x1={padL} x2={W} y1={y} y2={y} stroke="#e4e4e7" strokeWidth={1} />
              <text x={padL - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#71717a">
                {new Intl.NumberFormat("en-IN", { notation: "compact" }).format(t)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const h = (d.value / max) * (H - padB - 8);
          const x = padL + i * step + 1;
          return (
            <g key={d.date}>
              {/* Larger invisible hit target for the tooltip */}
              <rect x={x - 1} y={8} width={step} height={H - padB - 8} fill="transparent">
                <title>{`${d.date}: ${d.value.toLocaleString("en-IN")} ${label.toLowerCase()}`}</title>
              </rect>
              <rect x={x} y={H - padB - h} width={barW} height={Math.max(h, 0)} rx={Math.min(4, barW / 2)} fill={color} pointerEvents="none" />
            </g>
          );
        })}
        <text x={padL} y={H - 6} fontSize={10} fill="#71717a">{data[0].date}</text>
        <text x={W} y={H - 6} fontSize={10} fill="#71717a" textAnchor="end">{data[data.length - 1].date}</text>
      </svg>
    </figure>
  );
}
