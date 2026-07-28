import type { ColorSystem } from '../../../../../lib/colorSystem';
import type { SlideData } from './IGSlide';

// ── Theme resolution ──────────────────────────────────────────────────────────

type VisualMode = 'chart' | 'flow' | 'rise' | 'pulse';

function resolveVisualMode(slide: SlideData, index: number): VisualMode {
  const text = `${slide.imagePrompt || ''} ${slide.headline || ''}`.toLowerCase();

  if (/data|stat|metric|analytic|chart|number|percent|growth rate|roi|revenue|conversion/.test(text)) return 'chart';
  if (/network|connect|community|audience|social|people|share|engage|follow|reach/.test(text))         return 'flow';
  if (/grow|scale|trend|rise|increase|success|achieve|goal|target|result|launch/.test(text))           return 'rise';
  if (/idea|creative|innovate|strategy|tip|secret|hack|transform|power|impact/.test(text))             return 'pulse';

  const cycle: VisualMode[] = ['rise', 'chart', 'pulse', 'flow', 'chart', 'rise'];
  return cycle[index % cycle.length];
}

// ── Shared prop type ──────────────────────────────────────────────────────────

type VP = { p: string; l: string; d: string; w: number; h: number; id: string };

// ── CHART — animated bar chart with trend line ────────────────────────────────

function ChartVisual({ p, l, w, h, id }: VP) {
  const padX = 14, padY = 10;
  const drawH = h - padY * 2;
  const baseY = h - padY;

  const fracs = [0.52, 0.74, 0.42, 0.89, 0.61, 0.76, 0.94];
  const barW  = Math.round((w - padX * 2) / (fracs.length + 1.4));
  const gap   = Math.max(3, Math.round(barW * 0.22));
  const bw    = barW - gap;
  const startX = padX + gap;

  const bars = fracs.map((f, i) => ({
    x: startX + i * barW,
    y: baseY - Math.round(drawH * f),
    bh: Math.round(drawH * f),
    accent: i % 3 === 1,
  }));

  const pts = bars.map(b => ({ x: b.x + bw / 2, y: b.y - 3 }));
  const bezier = pts.reduce((d, pt, i) => {
    if (i === 0) return `M${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    const prev = pts[i - 1];
    const cpx = ((prev.x + pt.x) / 2).toFixed(1);
    return `${d} C${cpx},${prev.y.toFixed(1)} ${cpx},${pt.y.toFixed(1)} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
  }, '');

  const last = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={p} stopOpacity="0.82" />
          <stop offset="100%" stopColor={p} stopOpacity="0.10" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={l} stopOpacity="0.65" />
          <stop offset="100%" stopColor={l} stopOpacity="0.08" />
        </linearGradient>
      </defs>

      {/* Subtle grid */}
      {[0.35, 0.68].map((f, i) => (
        <line key={i}
          x1={startX - 4} y1={baseY - drawH * f}
          x2={w - 4}      y2={baseY - drawH * f}
          stroke={p} strokeOpacity="0.07" strokeWidth="1" strokeDasharray="3 3" />
      ))}

      {/* Bars */}
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={bw} height={b.bh}
          fill={b.accent ? `url(#${id}b)` : `url(#${id}a)`}
          rx={Math.max(2, bw * 0.14)} />
      ))}

      {/* Trend line */}
      <path d={bezier} stroke={l} strokeWidth="1.5" fill="none"
        opacity="0.7" strokeLinecap="round" strokeLinejoin="round" />

      {/* Endpoint glow + dot */}
      <circle cx={last.x} cy={last.y} r={7} fill={l} opacity="0.15" />
      <circle cx={last.x} cy={last.y} r={4} fill={l} opacity="0.9" />
      <circle cx={last.x} cy={last.y} r={2} fill="white" opacity="0.55" />

      {/* Left axis */}
      <line x1={startX - 7} y1={padY} x2={startX - 7} y2={baseY}
        stroke={p} strokeOpacity="0.14" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ── FLOW — network / connection graph ─────────────────────────────────────────

function FlowVisual({ p, l, w, h }: VP) {
  const ns = [
    { rx: 0.10, ry: 0.25, r: 5,    hub: false },
    { rx: 0.30, ry: 0.60, r: 7,    hub: false },
    { rx: 0.50, ry: 0.20, r: 4.5,  hub: false },
    { rx: 0.67, ry: 0.68, r: 6,    hub: false },
    { rx: 0.84, ry: 0.28, r: 8,    hub: true  },
    { rx: 0.20, ry: 0.84, r: 3.5,  hub: false },
    { rx: 0.58, ry: 0.84, r: 4,    hub: false },
    { rx: 0.42, ry: 0.44, r: 10.5, hub: true  },
  ].map(n => ({ ...n, x: n.rx * w, y: n.ry * h }));

  const edges = [[0,2],[0,1],[1,3],[2,4],[3,4],[1,5],[5,6],[6,3],[2,7],[7,3],[7,1],[7,4]];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '100%' }}>
      {/* Edges */}
      {edges.map(([a, b], i) => (
        <line key={i}
          x1={ns[a].x} y1={ns[a].y} x2={ns[b].x} y2={ns[b].y}
          stroke={p} strokeOpacity="0.13" strokeWidth="1" />
      ))}
      {/* Hub glows */}
      {ns.filter(n => n.hub).map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={n.r + 9} fill={p} opacity="0.07" />
      ))}
      {/* Nodes */}
      {ns.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={n.r}
          fill={n.hub ? p : 'none'}
          stroke={n.hub ? 'none' : p}
          strokeOpacity={n.hub ? 0 : 0.32}
          strokeWidth="1.5"
          opacity={n.hub ? 0.62 : 0.40} />
      ))}
      {/* Light center on hubs */}
      {ns.filter(n => n.hub).map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={2.5} fill={l} opacity="0.85" />
      ))}
    </svg>
  );
}

// ── RISE — growth S-curve with milestones ─────────────────────────────────────

function RiseVisual({ p, l, w, h, id }: VP) {
  const pad = 10;
  const x0 = pad,       y0 = h - pad;
  const x3 = w - pad,   y3 = pad + 4;
  const cx1 = w * 0.28, cy1 = h * 0.88;
  const cx2 = w * 0.68, cy2 = h * 0.10;

  const curve = `M${x0},${y0} C${cx1},${cy1} ${cx2},${cy2} ${x3},${y3}`;
  const area  = `${curve} L${x3},${h} L${x0},${h} Z`;

  const milestones = [0, 0.25, 0.5, 0.75, 1].map(t => {
    const u = 1 - t;
    return {
      x: u*u*u*x0 + 3*u*u*t*cx1 + 3*u*t*t*cx2 + t*t*t*x3,
      y: u*u*u*y0 + 3*u*u*t*cy1 + 3*u*t*t*cy2 + t*t*t*y3,
      last: t === 1,
    };
  });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={p} stopOpacity="0.22" />
          <stop offset="100%" stopColor={p} stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Scatter dots */}
      {Array.from({ length: 10 }, (_, i) => (
        <circle key={i}
          cx={(i * 37 + 15) % (w - 20) + 10}
          cy={(i * 31 + 18) % (h - 20) + 10}
          r="1.5" fill={p} opacity="0.07" />
      ))}

      {/* Area fill */}
      <path d={area}  fill={`url(#${id}r)`} />
      {/* Curve */}
      <path d={curve} stroke={p} strokeWidth="2" fill="none"
        opacity="0.60" strokeLinecap="round" />

      {/* Milestones */}
      {milestones.map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y}
          r={pt.last ? 5 : 2.5}
          fill={pt.last ? l : p}
          opacity={pt.last ? 0.95 : 0.45} />
      ))}

      {/* Arrowhead at endpoint */}
      <path d={`M${x3-8},${y3-4} L${x3+1},${y3+1} L${x3-5},${y3+9}`}
        stroke={l} strokeWidth="1.5" fill="none"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.82" />
    </svg>
  );
}

// ── PULSE — radial / ideas composition ───────────────────────────────────────

function PulseVisual({ p, l, w, h }: VP) {
  const cx = w * 0.68, cy = h / 2;
  const R  = Math.min(w * 0.44, h * 0.74);
  const N  = 10;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '100%' }}>
      {/* Radial spokes */}
      {Array.from({ length: N }, (_, i) => {
        const a   = (i / N) * Math.PI * 2;
        const len = i % 2 === 0 ? R : R * 0.68;
        return (
          <line key={i}
            x1={cx} y1={cy}
            x2={cx + Math.cos(a) * len}
            y2={cy + Math.sin(a) * len}
            stroke={p} strokeOpacity="0.09" strokeWidth="1" />
        );
      })}

      {/* Concentric rings */}
      {[0.30, 0.55, 0.80].map((r, i) => (
        <circle key={i} cx={cx} cy={cy} r={R * r}
          fill="none" stroke={p}
          strokeOpacity={0.09 - i * 0.025} strokeWidth="1" />
      ))}

      {/* Center */}
      <circle cx={cx} cy={cy} r={9}   fill={p} opacity="0.50" />
      <circle cx={cx} cy={cy} r={4.5} fill={l} opacity="0.90" />

      {/* Left-side orbital blobs */}
      <circle cx={w * 0.18} cy={h * 0.28} r={11} fill={p} opacity="0.11" />
      <circle cx={w * 0.32} cy={h * 0.74} r={7}  fill={p} opacity="0.09" />
      <circle cx={w * 0.07} cy={h * 0.68} r={5}  fill={l} opacity="0.16" />

      {/* Particles */}
      {[[0.04,0.38],[0.16,0.12],[0.38,0.90],[0.50,0.08],[0.90,0.82],[0.96,0.22]].map(([rx,ry],i) => (
        <circle key={i} cx={rx*w} cy={ry*h} r={1.5} fill={l} opacity="0.22" />
      ))}
    </svg>
  );
}

// ── QUOTE BG — abstract geometric background (tall format) ───────────────────

function QuoteBgVisual({ p, l, w, h }: { p: string; l: string; w: number; h: number }) {
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '100%' }}>
      {/* Large ring — off-centre top-right */}
      <circle cx={w * 0.78} cy={h * 0.28} r={w * 0.46}
        fill="none" stroke={p} strokeOpacity="0.22" strokeWidth="1" />
      <circle cx={w * 0.78} cy={h * 0.28} r={w * 0.28}
        fill="none" stroke={p} strokeOpacity="0.14" strokeWidth="1" />

      {/* Lower-left accent */}
      <circle cx={w * 0.14} cy={h * 0.72} r={w * 0.20} fill={p} opacity="0.07" />

      {/* Mid accent */}
      <circle cx={w * 0.58} cy={h * 0.80} r={22} fill={l} opacity="0.06" />

      {/* Diagonal lines */}
      {Array.from({ length: 5 }, (_, i) => (
        <line key={i}
          x1={w * 0.05 + i * w * 0.22} y1={0}
          x2={w * 0.05 + i * w * 0.22 + w * 0.15} y2={h}
          stroke={p} strokeOpacity="0.04" strokeWidth="1" />
      ))}

      {/* Floating dots */}
      {[[0.08,0.15],[0.25,0.90],[0.50,0.06],[0.88,0.93],[0.72,0.50],[0.35,0.55]].map(([rx,ry],i) => (
        <circle key={i} cx={rx*w} cy={ry*h} r={2} fill={p} opacity="0.10" />
      ))}
    </svg>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function SlideVisual({
  slide,
  index,
  colors,
  width,
  height,
  variant = 'strip',
}: {
  slide:    SlideData;
  index:    number;
  colors:   ColorSystem;
  width:    number;
  height:   number;
  variant?: 'strip' | 'block' | 'background';
}) {
  const p  = colors.BRAND_PRIMARY;
  const l  = colors.BRAND_LIGHT;
  const d  = colors.BRAND_DARK;
  const id = `sv${index}`;

  if (variant === 'background') {
    return <QuoteBgVisual p={p} l={l} w={width} h={height} />;
  }

  const props: VP = { p, l, d, w: width, h: height, id };
  const mode = resolveVisualMode(slide, index);

  switch (mode) {
    case 'chart': return <ChartVisual {...props} />;
    case 'flow':  return <FlowVisual  {...props} />;
    case 'rise':  return <RiseVisual  {...props} />;
    case 'pulse': return <PulseVisual {...props} />;
  }
}
