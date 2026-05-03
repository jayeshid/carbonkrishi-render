// Plotly-based chart builders that mirror the Streamlit Altair/Plotly versions in app.py.
// All return a Promise that resolves once the chart has been drawn.
// Plotly is loaded globally via <script> tag in index.html.

const PLOT_CONFIG = { displayModeBar: false, responsive: true };
const PLOT_FONT = { family: "Inter, sans-serif" };

// Default horizontal legend below the plot — prevents long trace names like
// "Max Dose Benchmark" from overflowing the right edge and getting cropped.
const PLOT_LEGEND_BOTTOM = {
  orientation: "h",
  x: 0.5,
  xanchor: "center",
  y: -0.18,
  yanchor: "top",
  bgcolor: "rgba(0,0,0,0)",
  borderwidth: 0,
  font: { size: 12 },
};

const IMPACT_NAMES = [
  "Global Warming",
  "Eutrophication",
  "Acidification",
  "Ecotoxicity",
];

function ensurePlotly() {
  if (typeof Plotly === "undefined") {
    throw new Error("Plotly is not loaded yet.");
  }
}

// ── Tab 1: radar chart of impact profile vs benchmark ────────────────────────
export function drawRadar(
  elId,
  scenarios,
  title = "Impact Profile (normalised)",
) {
  ensurePlotly();
  // Normalise per-axis to 0-100 across all scenarios.
  const arrs = scenarios.map((s) => s.values);
  const maxes = IMPACT_NAMES.map(
    (_, i) => Math.max(...arrs.map((a) => a[i])) || 1,
  );

  const traces = scenarios.map((s) => {
    const norm = s.values.map((v, i) => (v / maxes[i]) * 100);
    return {
      type: "scatterpolar",
      r: [...norm, norm[0]],
      theta: [...IMPACT_NAMES, IMPACT_NAMES[0]],
      fill: "toself",
      name: s.label,
      line: { color: s.color, width: 2 },
      fillcolor: s.color,
      opacity: 0.45,
    };
  });

  const layout = {
    polar: {
      // Transparent so our injected SVG radialGradient (below) becomes visible.
      bgcolor: "rgba(0, 0, 0, 0)",
      radialaxis: {
        visible: true,
        range: [0, 100],
        gridcolor: "rgba(130, 146, 146, 0.25)",
        tickfont: { color: "#829292" },
      },
      angularaxis: {
        gridcolor: "rgba(130, 146, 146, 0.25)",
        linecolor: "rgba(130, 146, 146, 0.30)",
      },
    },
    showlegend: true,
    legend: { ...PLOT_LEGEND_BOTTOM, y: -0.12 },
    title: {
      text: title,
      x: 0.02,
      xanchor: "left",
      font: { size: 15, color: "#0f172a" },
    },
    margin: { l: 60, r: 60, t: 60, b: 80 },
    height: 440,
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: PLOT_FONT,
  };
  return Plotly.newPlot(elId, traces, layout, PLOT_CONFIG).then(() => {
    applyRadarGradient(elId);
  });
}

// Inject an SVG <radialGradient> into the polar plot's <defs> and fill the
// polar bg <path> with url(#gradientId). This gives the radar a real brand
// gradient (lime core → teal edge) instead of Plotly's default white disc.
// Re-applied on window resize since Plotly rebuilds the SVG on resize events.
function applyRadarGradient(elId) {
  const plotEl = document.getElementById(elId);
  if (!plotEl) return;
  const svg = plotEl.querySelector("svg.main-svg");
  if (!svg) return;

  const ns = "http://www.w3.org/2000/svg";
  const gradId = `radar-grad-${elId}`;

  let defs = svg.querySelector("defs");
  if (!defs) {
    defs = document.createElementNS(ns, "defs");
    svg.insertBefore(defs, svg.firstChild);
  }

  // (Re)create the gradient so any theme change is reflected.
  const existing = defs.querySelector(`#${gradId}`);
  if (existing) existing.remove();

  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const grad = document.createElementNS(ns, "radialGradient");
  grad.setAttribute("id", gradId);
  grad.setAttribute("cx", "50%");
  grad.setAttribute("cy", "50%");
  grad.setAttribute("r", "50%");

  const stops = isDark
    ? [
        ["0%", "#ABFF02", "0.18"],
        ["45%", "#5EEAD4", "0.08"],
        ["100%", "#052424", "0.0"],
      ]
    : [
        ["0%", "#ABFF02", "0.22"],
        ["55%", "#FFFFFF", "0.25"],
        ["100%", "#052424", "0.06"],
      ];

  stops.forEach(([off, col, op]) => {
    const s = document.createElementNS(ns, "stop");
    s.setAttribute("offset", off);
    s.setAttribute("stop-color", col);
    s.setAttribute("stop-opacity", op);
    grad.appendChild(s);
  });
  defs.appendChild(grad);

  // Apply the gradient to every polar bg path in this plot (covers Plotly's
  // various class-name variants across versions).
  const bgPaths = plotEl.querySelectorAll(
    "g.polar > path.bg, .polarsubplot path.bg, .polarlayer path.bg, g[class*='polar'] path.bg"
  );
  bgPaths.forEach((p) => p.setAttribute("fill", `url(#${gradId})`));
}

// Re-apply the radar gradient on resize / theme-toggle since Plotly rebuilds
// the polar bg and our <defs> gradient would otherwise be lost.
if (typeof window !== "undefined" && !window.__radarGradientHooksInstalled) {
  window.__radarGradientHooksInstalled = true;
  const reapplyAll = () => {
    document.querySelectorAll(".js-plotly-plot").forEach((el) => {
      if (el.id && el.querySelector("g.polar, .polarsubplot, .polarlayer")) {
        applyRadarGradient(el.id);
      }
    });
  };
  window.addEventListener("resize", () => setTimeout(reapplyAll, 50));
  // Watch for theme changes on <html data-theme="...">
  const mo = new MutationObserver(() => setTimeout(reapplyAll, 30));
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
}

// ── Tab 2: blend trend line ──────────────────────────────────────────────────
export function drawBlendTrend(elId, conv, org, alpha) {
  ensurePlotly();
  const xs = [];
  const ys = IMPACT_NAMES.map(() => []);
  for (let i = 0; i <= 20; i++) {
    const a = i / 20;
    xs.push(a * 100);
    for (let k = 0; k < 4; k++) ys[k].push((1 - a) * conv[k] + a * org[k]);
  }
  const colors = ["#1f77b4", "#2ca02c", "#ff7f0e", "#d62728"];
  const traces = IMPACT_NAMES.map((name, k) => ({
    x: xs,
    y: ys[k],
    type: "scatter",
    mode: "lines+markers",
    name,
    line: { color: colors[k], width: 2.5, shape: "spline" },
    marker: { size: 5 },
  }));
  // Marker for current alpha
  const markerVals = IMPACT_NAMES.map(
    (_, k) => (1 - alpha) * conv[k] + alpha * org[k],
  );
  traces.push({
    x: IMPACT_NAMES.map(() => alpha * 100),
    y: markerVals,
    mode: "markers",
    type: "scatter",
    marker: { size: 14, color: "#0f172a", symbol: "circle" },
    name: "Current α",
    showlegend: false,
  });

  const layout = {
    title: {
      text: `Impact trend (marker @ ${Math.round(alpha * 100)}% organic)`,
      x: 0.02,
      font: { size: 14, color: "#0f172a" },
    },
    xaxis: { title: "Organic blend (%)", gridcolor: "#e2e8f0" },
    yaxis: { title: "Predicted impact", gridcolor: "#e2e8f0" },
    height: 400,
    margin: { l: 60, r: 30, t: 50, b: 90 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: PLOT_FONT,
    showlegend: true,
    legend: PLOT_LEGEND_BOTTOM,
  };
  return Plotly.newPlot(elId, traces, layout, PLOT_CONFIG);
}

// ── Tab 2: cost vs GWP frontier ──────────────────────────────────────────────
export function drawFrontier(elId, conv, org, costConv, costOrg, alpha) {
  ensurePlotly();
  const xs = [],
    ys = [],
    texts = [];
  for (let i = 0; i <= 10; i++) {
    const a = i / 10;
    xs.push((1 - a) * costConv + a * costOrg);
    ys.push((1 - a) * conv[0] + a * org[0]);
    texts.push(`${Math.round(a * 100)}% organic`);
  }
  const selX = (1 - alpha) * costConv + alpha * costOrg;
  const selY = (1 - alpha) * conv[0] + alpha * org[0];

  const layout = {
    title: {
      text: "Cost-Climate Trade-off Frontier",
      x: 0.02,
      font: { size: 14, color: "#0f172a" },
    },
    xaxis: { title: "Input Cost (₹/ha)", gridcolor: "#e2e8f0" },
    yaxis: {
      title: "Global Warming Potential (kg CO₂-eq)",
      gridcolor: "#e2e8f0",
    },
    height: 360,
    margin: { l: 70, r: 20, t: 50, b: 50 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: PLOT_FONT,
    showlegend: false,
  };
  const traces = [
    {
      x: xs,
      y: ys,
      mode: "lines+markers",
      type: "scatter",
      line: { color: "#0f766e", width: 2.5 },
      marker: {
        size: 9,
        color: xs.map((_, i) => (i / xs.length) * 100),
        colorscale: "Teal",
      },
      text: texts,
      hovertemplate:
        "%{text}<br>Cost: ₹%{x:,.0f}<br>GWP: %{y:,.2f}<extra></extra>",
    },
    {
      x: [selX],
      y: [selY],
      mode: "markers",
      type: "scatter",
      marker: {
        size: 16,
        color: "#f97316",
        symbol: "diamond",
        line: { color: "#0f172a", width: 2 },
      },
      hovertemplate: `Selected ${Math.round(alpha * 100)}%<br>Cost: ₹%{x:,.0f}<br>GWP: %{y:,.2f}<extra></extra>`,
    },
  ];
  return Plotly.newPlot(elId, traces, layout, PLOT_CONFIG);
}

// ── Tab 3: SOC source contribution & buffer effect ───────────────────────────
export function drawCreditSource(elId, fymCredits, compostCredits) {
  ensurePlotly();
  const trace = {
    x: ["Farm Yard Manure", "Compost"],
    y: [fymCredits, compostCredits],
    type: "bar",
    marker: { color: ["#16a34a", "#0ea5e9"] },
    text: [fymCredits.toFixed(3), compostCredits.toFixed(3)],
    textposition: "outside",
    cliponaxis: false,
  };
  const layout = {
    title: {
      text: "Credit Contribution by Input",
      x: 0.02,
      font: { size: 14, color: "#0f172a" },
    },
    yaxis: { title: "Credits (t CO₂-eq/ha)", gridcolor: "#e2e8f0", automargin: true },
    height: 320,
    margin: { l: 70, r: 20, t: 70, b: 50 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: PLOT_FONT,
    showlegend: false,
  };
  return Plotly.newPlot(elId, [trace], layout, PLOT_CONFIG);
}

export function drawBufferEffect(elId, before, after, withheld) {
  ensurePlotly();
  const trace = {
    x: ["Before Buffer", "After Buffer", "Buffer Withheld"],
    y: [before, after, withheld],
    type: "bar",
    marker: { color: ["#0ea5e9", "#16a34a", "#f59e0b"] },
    text: [before.toFixed(3), after.toFixed(3), withheld.toFixed(3)],
    textposition: "outside",
    cliponaxis: false,
  };
  const layout = {
    title: {
      text: "Permanence Buffer Effect",
      x: 0.02,
      font: { size: 14, color: "#0f172a" },
    },
    yaxis: { title: "t CO₂-eq/ha", gridcolor: "#e2e8f0", automargin: true },
    height: 320,
    margin: { l: 70, r: 20, t: 70, b: 50 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: PLOT_FONT,
    showlegend: false,
  };
  return Plotly.newPlot(elId, [trace], layout, PLOT_CONFIG);
}

// ── Tab 4: emission magnitude bar + share pie ───────────────────────────────
const EMISSION_COLORS = {
  "CH₄": "#1f77b4",
  "N₂O": "#ff7f0e",
  "NO₃": "#2ca02c",
  "NH₃": "#d62728",
  "PO₄": "#9467bd",
};

export function drawEmissionBar(elId, emissions) {
  ensurePlotly();
  const labels = ["CH₄", "N₂O", "NO₃", "NH₃", "PO₄"];
  const values = [
    emissions.CH4,
    emissions.N2O,
    emissions.NO3,
    emissions.NH3,
    emissions.PO4,
  ];
  const trace = {
    x: values,
    y: labels,
    type: "bar",
    orientation: "h",
    marker: { color: labels.map((l) => EMISSION_COLORS[l]) },
    text: values.map((v) => v.toFixed(3)),
    textposition: "outside",
  };
  const layout = {
    xaxis: { title: "kg/ha/season", gridcolor: "#e2e8f0" },
    yaxis: { autorange: "reversed" },
    height: 340,
    margin: { l: 60, r: 40, t: 30, b: 50 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: PLOT_FONT,
    showlegend: false,
  };
  return Plotly.newPlot(elId, [trace], layout, PLOT_CONFIG);
}

export function drawEmissionPie(elId, emissions) {
  ensurePlotly();
  const labels = ["CH₄", "N₂O", "NO₃", "NH₃", "PO₄"];
  const values = [
    emissions.CH4,
    emissions.N2O,
    emissions.NO3,
    emissions.NH3,
    emissions.PO4,
  ];
  const trace = {
    labels,
    values,
    type: "pie",
    hole: 0.5,
    marker: { colors: labels.map((l) => EMISSION_COLORS[l]) },
    textinfo: "label+percent",
  };
  const layout = {
    height: 380,
    margin: { l: 20, r: 20, t: 30, b: 70 },
    paper_bgcolor: "rgba(0,0,0,0)",
    font: PLOT_FONT,
    showlegend: true,
    legend: { ...PLOT_LEGEND_BOTTOM, y: -0.10 },
  };
  return Plotly.newPlot(elId, [trace], layout, PLOT_CONFIG);
}

// ── Speedometer indicator (gauge) ───────────────────────────────────────────
export function drawSpeedometer(
  elId,
  valuePct,
  label,
  { maxAbs = 50, inverse = true } = {},
) {
  ensurePlotly();
  let barColor;
  if (valuePct === 0) barColor = "#94a3b8";
  else if (valuePct < 0 === inverse) barColor = "#16a34a";
  else barColor = "#ef4444";

  const trace = {
    type: "indicator",
    mode: "gauge+number",
    value: valuePct,
    align: "center",
    // Fixed speedometer label reset on page refresh - prevent number from shifting right on mount
    transition: { duration: 0 },
    number: { suffix: "%", font: { size: 22, color: "#f1f5f9" }, valueformat: ".1f" },
    title: { text: label, font: { size: 12, color: "#cbd5e1" }, align: "center" },
    gauge: {
      axis: {
        range: [-maxAbs, maxAbs],
        tickwidth: 1,
        tickcolor: "#94a3b8",
        tickfont: { size: 10 },
      },
      bar: { color: barColor, thickness: 0.3 },
      bgcolor: "rgba(0,0,0,0)",
      borderwidth: 1,
      bordercolor: "#e2e8f0",
      steps: [
        { range: [-maxAbs, -maxAbs / 3], color: "rgba(34,197,94,0.18)" },
        { range: [-maxAbs / 3, maxAbs / 3], color: "rgba(148,163,184,0.18)" },
        { range: [maxAbs / 3, maxAbs], color: "rgba(239,68,68,0.18)" },
      ],
      threshold: {
        line: { color: "#0f172a", width: 3 },
        thickness: 0.85,
        value: valuePct,
      },
    },
  };
  const layout = {
    autosize: true,
    height: 200,
    margin: { l: 16, r: 16, t: 36, b: 8 },
    paper_bgcolor: "rgba(0,0,0,0)",
    font: PLOT_FONT,
  };
  // Use Plotly.react on subsequent draws so the indicator preserves its
  // internal layout and the value/label don't shift on each update.
  const el = document.getElementById(elId);
  const method = el && el.data ? "react" : "newPlot";
  return Plotly[method](elId, [trace], layout, PLOT_CONFIG).then((gd) => {
    // Immediate + deferred resize pass to lock SVG to current container width.
    requestAnimationFrame(() => {
      try { Plotly.Plots.resize(gd); } catch { /* noop */ }
      setTimeout(() => {
        try { Plotly.Plots.resize(gd); } catch { /* noop */ }
      }, 80);
    });
    // ResizeObserver: re-run Plotly layout whenever the container's actual
    // width changes — this is what catches the case where the speedometer was
    // first rendered while its tab was display:none (clientWidth 0) and only
    // later acquires its real width when the user opens Tab 2. Without this,
    // the centered "0.0%" stays baked at the off-center default position.
    if (gd && !gd._ckResizeObserver && typeof ResizeObserver !== "undefined") {
      let lastW = 0;
      const ro = new ResizeObserver((entries) => {
        const w = entries[0]?.contentRect?.width || 0;
        if (w > 0 && Math.abs(w - lastW) > 1) {
          lastW = w;
          try { Plotly.Plots.resize(gd); } catch { /* noop */ }
        }
      });
      ro.observe(gd);
      gd._ckResizeObserver = ro;
    }
    return gd;
  });
}

// ── Sankey: inputs → emissions → impact categories ─────────────────────────
export function drawSankey(elId, emissions, syntheticN, syntheticP, am1, am2) {
  ensurePlotly();
  const inputs = ["Synthetic N", "Synthetic P"];
  if (am1 !== "None") inputs.push(`Amend: ${am1}`);
  if (am2 !== "None") inputs.push(`Amend: ${am2}`);
  const emLabels = ["CH₄", "N₂O", "NO₃", "NH₃", "PO₄"];
  const impactLabels = ["Global Warming", "Eutrophication", "Acidification"];
  const nodes = [...inputs, ...emLabels, ...impactLabels];
  const idx = Object.fromEntries(nodes.map((n, i) => [n, i]));
  const sources = [],
    targets = [],
    values = [],
    linkColors = [];

  const contrib = {
    ["Synthetic N|CH₄"]: emissions.CH4,
    ["Synthetic N|N₂O"]: emissions.N2O,
    ["Synthetic N|NO₃"]: emissions.NO3,
    ["Synthetic N|NH₃"]: emissions.NH3 * 0.95,
    ["Synthetic P|NH₃"]: emissions.NH3 * 0.05,
    ["Synthetic P|PO₄"]: emissions.PO4,
  };
  for (const [k, v] of Object.entries(contrib)) {
    const [src, dst] = k.split("|");
    sources.push(idx[src]);
    targets.push(idx[dst]);
    values.push(Math.max(v, 1e-6));
    linkColors.push(
      src.includes("N") ? "rgba(59,130,246,0.35)" : "rgba(168,85,247,0.35)",
    );
  }
  for (const am of [am1, am2]) {
    if (am !== "None") {
      const src = `Amend: ${am}`;
      const splits = [
        ["CH₄", "CH4", 0.1],
        ["N₂O", "N2O", 0.05],
        ["NH₃", "NH3", 0.08],
      ];
      for (const [emLabel, emKey, frac] of splits) {
        sources.push(idx[src]);
        targets.push(idx[emLabel]);
        values.push(Math.max(emissions[emKey] * frac, 1e-6));
        linkColors.push("rgba(34,197,94,0.35)");
      }
    }
  }
  const emToImpact = [
    ["CH₄", "CH4", "Global Warming", 28.0],
    ["N₂O", "N2O", "Global Warming", 273.0],
    ["NO₃", "NO3", "Eutrophication", 0.42],
    ["PO₄", "PO4", "Eutrophication", 1.0],
    ["NH₃", "NH3", "Acidification", 1.88],
  ];
  for (const [emLabel, emKey, impact, factor] of emToImpact) {
    sources.push(idx[emLabel]);
    targets.push(idx[impact]);
    values.push(Math.max(emissions[emKey] * factor, 1e-6));
    linkColors.push("rgba(239,68,68,0.4)");
  }
  const nodeColors = [
    ...Array(2).fill("#3b82f6"),
    ...Array(inputs.length - 2).fill("#a855f7"),
    ...Array(emLabels.length).fill("#f97316"),
    ...Array(impactLabels.length).fill("#16a34a"),
  ];

  const trace = {
    type: "sankey",
    arrangement: "snap",
    domain: { x: [0, 1], y: [0, 1] },
    node: {
      pad: 18,
      thickness: 18,
      line: { color: "rgba(15,23,42,0.2)", width: 0.5 },
      label: nodes,
      color: nodeColors,
    },
    link: {
      source: sources,
      target: targets,
      value: values,
      color: linkColors,
    },
  };
  const layout = {
    title: {
      text: "Inputs → Emissions → Impact Categories",
      x: 0.02,
      font: { size: 15, color: "#0f172a" },
    },
    font: { ...PLOT_FONT, size: 12, color: "#334155" },
    height: 460,
    autosize: true,
    margin: { l: 10, r: 40, t: 60, b: 10 },
    paper_bgcolor: "rgba(0,0,0,0)",
  };
  return Plotly.newPlot(elId, [trace], layout, PLOT_CONFIG);
}

// ── Treemap: emissions hierarchy ───────────────────────────────────────────
export function drawTreemap(elId, emissions) {
  ensurePlotly();
  const leaves = [
    ["CH₄", emissions.CH4, "Climate", "#1f77b4"],
    ["N₂O", emissions.N2O, "Climate", "#ff7f0e"],
    ["NO₃", emissions.NO3, "Eutrophication", "#2ca02c"],
    ["PO₄", emissions.PO4, "Eutrophication", "#9467bd"],
    ["NH₃", emissions.NH3, "Acidification", "#d62728"],
  ];
  const labels = ["Total"],
    parents = [""],
    values = [0],
    colors = ["#0f172a"];
  const groups = {};
  for (const [, v, g] of leaves) groups[g] = (groups[g] || 0) + v;
  for (const g of Object.keys(groups)) {
    labels.push(g);
    parents.push("Total");
    values.push(0);
    colors.push("#94a3b8");
  }
  for (const [em, v, g, c] of leaves) {
    labels.push(`${em} (${v.toFixed(3)})`);
    parents.push(g);
    values.push(Math.max(v, 1e-6));
    colors.push(c);
  }

  const trace = {
    type: "treemap",
    labels,
    parents,
    values,
    branchvalues: "remainder",
    marker: { colors, line: { color: "white", width: 2 } },
    textfont: { ...PLOT_FONT, size: 12, color: "white" },
    hovertemplate:
      "<b>%{label}</b><br>Parent: %{parent}<br>Value: %{value:.4f}<extra></extra>",
  };
  const layout = {
    height: 350,
    margin: { l: 10, r: 10, t: 40, b: 10 },
    title: {
      text: "Emission Treemap",
      x: 0.02,
      font: { size: 15, color: "#0f172a" },
    },
    paper_bgcolor: "rgba(0,0,0,0)",
    font: PLOT_FONT,
  };
  return Plotly.newPlot(elId, [trace], layout, PLOT_CONFIG);
}

// ── Heatmap: per-kg footprint (Tab 5) ──────────────────────────────────────
export function drawImpactHeatmap(elId, impactData) {
  ensurePlotly();
  const inputs = impactData.Input;
  const impactCols = [
    ["Global Warming", "Global Warming (kg CO2-eq)"],
    ["Acidification", "Terrestrial Acidification (kg SO2-eq)"],
    ["Eutrophication", "Freshwater Eutrophication (kg P-eq)"],
    ["Ecotoxicity", "Terrestrial Ecotoxicity (CTUe)"],
  ];
  const x = impactCols.map((c) => c[0]);
  const z = inputs.map((_, ri) =>
    impactCols.map(([, key]) =>
      Math.log10(Math.max(impactData[key][ri], 1e-6)),
    ),
  );
  const text = inputs.map((_, ri) =>
    impactCols.map(([, key]) => impactData[key][ri].toPrecision(3)),
  );

  const trace = {
    type: "heatmap",
    x,
    y: inputs,
    z,
    text,
    hovertemplate: "%{y} × %{x}: %{text}<extra></extra>",
    colorscale: "RdYlGn",
    reversescale: true,
    colorbar: { title: "log₁₀(value)" },
  };
  const annotations = [];
  inputs.forEach((inp, ri) => {
    x.forEach((xi, ci) => {
      annotations.push({
        x: xi,
        y: inp,
        text: text[ri][ci],
        font: { size: 10, color: z[ri][ci] > 1 ? "white" : "#0f172a" },
        showarrow: false,
      });
    });
  });
  const layout = {
    height: 320,
    margin: { l: 130, r: 60, t: 40, b: 50 },
    title: {
      text: "Per-kg Environmental Footprint (log scale)",
      x: 0.02,
      font: { size: 14 },
    },
    paper_bgcolor: "rgba(0,0,0,0)",
    font: PLOT_FONT,
    annotations,
  };
  return Plotly.newPlot(elId, [trace], layout, PLOT_CONFIG);
}

// ── Streamgraph: composition share across blend % ──────────────────────────
export function drawStreamgraph(elId, conv, org) {
  ensurePlotly();
  const xs = [];
  const series = IMPACT_NAMES.map(() => []);
  for (let i = 0; i <= 20; i++) {
    const a = i / 20;
    xs.push(a * 100);
    const vals = IMPACT_NAMES.map((_, k) => (1 - a) * conv[k] + a * org[k]);
    const total = vals.reduce((s, v) => s + v, 0) || 1;
    vals.forEach((v, k) => series[k].push((v / total) * 100));
  }
  const colors = ["#1f77b4", "#2ca02c", "#ff7f0e", "#d62728"];
  const traces = IMPACT_NAMES.map((name, k) => ({
    x: xs,
    y: series[k],
    stackgroup: "one",
    groupnorm: "percent",
    name,
    type: "scatter",
    mode: "lines",
    line: { width: 0.5, color: colors[k], shape: "spline" },
    fillcolor: colors[k],
    opacity: 0.85,
  }));
  const layout = {
    title: {
      text: "Impact Composition Across Blend Transition",
      x: 0.02,
      font: { size: 14, color: "#0f172a" },
    },
    xaxis: { title: "Organic blend (%)", gridcolor: "#e2e8f0" },
    yaxis: {
      title: "Share of total impact (%)",
      gridcolor: "#e2e8f0",
      range: [0, 100],
    },
    height: 380,
    margin: { l: 60, r: 20, t: 50, b: 90 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: PLOT_FONT,
    showlegend: true,
    legend: PLOT_LEGEND_BOTTOM,
  };
  return Plotly.newPlot(elId, traces, layout, PLOT_CONFIG);
}

// ── Confidence band: GWP across blend with ±band_pct ribbon ────────────────
export function drawConfidenceBand(elId, conv, org, bandPct = 0.1) {
  ensurePlotly();
  const xs = [],
    ys = [],
    lo = [],
    hi = [];
  for (let i = 0; i <= 20; i++) {
    const a = i / 20;
    const v = (1 - a) * conv[0] + a * org[0];
    xs.push(a * 100);
    ys.push(v);
    lo.push(v * (1 - bandPct));
    hi.push(v * (1 + bandPct));
  }
  const traces = [
    {
      x: xs,
      y: hi,
      type: "scatter",
      mode: "lines",
      line: { width: 0 },
      showlegend: false,
    },
    {
      x: xs,
      y: lo,
      type: "scatter",
      mode: "lines",
      line: { width: 0 },
      fill: "tonexty",
      fillcolor: "rgba(15,118,110,0.18)",
      name: `±${Math.round(bandPct * 100)}%`,
    },
    {
      x: xs,
      y: ys,
      type: "scatter",
      mode: "lines",
      line: { color: "#0f766e", width: 3 },
      name: "GWP (mean)",
    },
  ];
  const layout = {
    title: {
      text: `GWP vs Blend with ±${Math.round(bandPct * 100)}% Confidence Band`,
      x: 0.02,
      font: { size: 14, color: "#0f172a" },
    },
    xaxis: { title: "Organic blend (%)", gridcolor: "#e2e8f0" },
    yaxis: { title: "GWP (kg CO₂-eq)", gridcolor: "#e2e8f0" },
    height: 380,
    margin: { l: 70, r: 20, t: 50, b: 90 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: PLOT_FONT,
    showlegend: true,
    legend: PLOT_LEGEND_BOTTOM,
  };
  return Plotly.newPlot(elId, traces, layout, PLOT_CONFIG);
}

// ── Pareto with iso-cost-per-CO2 reference lines ──────────────────────────
export function drawParetoIso(elId, conv, org, costConv, costOrg, alpha) {
  ensurePlotly();
  const xs = [],
    ys = [],
    colors = [];
  for (let i = 0; i <= 20; i++) {
    const a = i / 20;
    xs.push((1 - a) * costConv + a * costOrg);
    ys.push((1 - a) * conv[0] + a * org[0]);
    colors.push(a * 100);
  }
  const selX = (1 - alpha) * costConv + alpha * costOrg;
  const selY = (1 - alpha) * conv[0] + alpha * org[0];
  const costMin = Math.min(costConv, costOrg) * 0.9;
  const costMax = Math.max(costConv, costOrg) * 1.1;

  const isoTraces = [];
  const isoSlopes = [
    ["Cheap-to-cut", 0.2, "#94a3b8"],
    ["Moderate", 0.5, "#64748b"],
    ["Expensive", 1.0, "#475569"],
  ];
  for (const [name, slope, col] of isoSlopes) {
    const intercept = conv[0] - slope * costConv;
    isoTraces.push({
      x: [costMin, costMax],
      y: [intercept + slope * costMin, intercept + slope * costMax],
      mode: "lines",
      type: "scatter",
      line: { color: col, width: 1, dash: "dash" },
      name: `Iso: ${name}`,
      opacity: 0.6,
    });
  }
  const traces = [
    ...isoTraces,
    {
      x: xs,
      y: ys,
      mode: "lines+markers",
      type: "scatter",
      line: { color: "#0f766e", width: 3 },
      marker: {
        size: 9,
        color: colors,
        colorscale: "Teal",
        showscale: true,
        colorbar: {
          title: "Org %",
          x: 1.02,
          xanchor: "left",
          thickness: 14,
          len: 0.8,
        },
      },
      name: "Frontier",
      hovertemplate: "%{x:,.0f} ₹/ha<br>%{y:,.2f} kg CO₂-eq<extra></extra>",
    },
    {
      x: [selX],
      y: [selY],
      mode: "markers",
      type: "scatter",
      marker: {
        size: 18,
        color: "#f97316",
        symbol: "diamond",
        line: { color: "#0f172a", width: 2 },
      },
      name: `Selected ${Math.round(alpha * 100)}%`,
    },
  ];
  const layout = {
    title: {
      text: "Cost-Climate Frontier with Iso-trade-off Lines",
      x: 0.02,
      font: { size: 14, color: "#0f172a" },
    },
    xaxis: { title: "Input Cost (₹/ha)", gridcolor: "#e2e8f0" },
    yaxis: { title: "GWP (kg CO₂-eq)", gridcolor: "#e2e8f0" },
    height: 440,
    margin: { l: 70, r: 110, t: 50, b: 110 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: PLOT_FONT,
    legend: {
      orientation: "h",
      x: 0,
      y: -0.25,
      xanchor: "left",
      yanchor: "top",
      font: { size: 11 },
    },
  };
  return Plotly.newPlot(elId, traces, layout, PLOT_CONFIG);
}

// ── Impact delta: % change of each impact vs conventional ─────────────────
export function drawImpactDelta(elId, conv, blendOut) {
  ensurePlotly();
  const pct = IMPACT_NAMES.map((_, i) =>
    conv[i] !== 0 ? ((blendOut[i] - conv[i]) / conv[i]) * 100 : 0,
  );
  const colors = pct.map((p) =>
    p < 0 ? "#16a34a" : p > 0 ? "#ef4444" : "#94a3b8",
  );
  const trace = {
    x: pct,
    y: IMPACT_NAMES,
    type: "bar",
    orientation: "h",
    marker: { color: colors },
    text: pct.map((p) => `${p >= 0 ? "+" : ""}${p.toFixed(1)}%`),
    textposition: "outside",
    cliponaxis: false,
  };
  // Enforce a sensible minimum x-axis range so the chart looks structured
  // even when every delta is 0% (e.g. when the slider is at 0% organic).
  const peak = Math.max(10, ...pct.map((p) => Math.abs(p)));
  const pad = peak * 0.25;
  const layout = {
    title: {
      text: "Impact Delta vs Conventional Baseline",
      x: 0.02,
      font: { size: 14, color: "#0f172a" },
    },
    xaxis: {
      title: "% change (negative = better)",
      gridcolor: "#e2e8f0",
      zeroline: true,
      zerolinecolor: "#0f172a",
      range: [-(peak + pad), peak + pad],
    },
    yaxis: { autorange: "reversed", automargin: true },
    height: 440,
    margin: { l: 160, r: 60, t: 60, b: 110 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: PLOT_FONT,
    showlegend: false,
  };
  return Plotly.newPlot(elId, [trace], layout, PLOT_CONFIG);
}

// ── Gradient-impact stacked bar (Tab 2 detailed breakdown) ────────────────
export function drawGradientImpactBar(elId, conv, blendOut, org) {
  ensurePlotly();
  const colors = ["#1d4ed8", "#f97316", "#16a34a"];
  const series = [
    { name: "Conventional", values: conv },
    { name: "Blend", values: blendOut },
    { name: "Organic", values: org },
  ];
  const traces = series.map((s, i) => ({
    x: s.values,
    y: IMPACT_NAMES,
    name: s.name,
    orientation: "h",
    type: "bar",
    marker: { color: colors[i] },
  }));
  const layout = {
    title: {
      text: "Impact Breakdown by Scenario",
      x: 0.02,
      font: { size: 14, color: "#0f172a" },
    },
    barmode: "group",
    height: 440,
    margin: { l: 160, r: 30, t: 50, b: 90 },
    xaxis: { title: "Impact value", gridcolor: "#e2e8f0" },
    yaxis: { autorange: "reversed" },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: PLOT_FONT,
    showlegend: true,
    legend: PLOT_LEGEND_BOTTOM,
  };
  return Plotly.newPlot(elId, traces, layout, PLOT_CONFIG);
}

// ── Cost comparison bar (Conv / Blend / Organic) ──────────────────────────
export function drawCostCompare(elId, costConv, costBlend, costOrg, alpha) {
  ensurePlotly();
  const labels = [
    "Conventional",
    `Blend (${Math.round(alpha * 100)}% Org)`,
    "Organic",
  ];
  const trace = {
    y: labels,
    x: [costConv, costBlend, costOrg],
    type: "bar",
    orientation: "h",
    marker: { color: ["#1d4ed8", "#f97316", "#16a34a"] },
    text: [costConv, costBlend, costOrg].map(
      (v) => `₹${Math.round(v).toLocaleString("en-IN")}`,
    ),
    textposition: "outside",
  };
  const layout = {
    title: {
      text: "Input Cost by Scenario",
      x: 0.02,
      font: { size: 14, color: "#0f172a" },
    },
    xaxis: { title: "Input Cost (₹/ha)", gridcolor: "#e2e8f0" },
    yaxis: { autorange: "reversed" },
    height: 240,
    margin: { l: 160, r: 60, t: 50, b: 50 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: PLOT_FONT,
    showlegend: false,
  };
  return Plotly.newPlot(elId, [trace], layout, PLOT_CONFIG);
}

// ── Comparison bar (A vs B, Tab 1 Compare-Two) ────────────────────────────
export function drawComparisonBars(
  elId,
  outA,
  outB,
  labelA = "Combination A",
  labelB = "Combination B",
) {
  ensurePlotly();
  const traces = [
    {
      x: outA,
      y: IMPACT_NAMES,
      type: "bar",
      orientation: "h",
      name: labelA,
      marker: { color: "#3b82f6" },
    },
    {
      x: outB,
      y: IMPACT_NAMES,
      type: "bar",
      orientation: "h",
      name: labelB,
      marker: { color: "#f97316" },
    },
  ];
  const layout = {
    barmode: "group",
    height: 420,
    margin: { l: 160, r: 30, t: 30, b: 90 },
    xaxis: { title: "Impact value", gridcolor: "#e2e8f0" },
    yaxis: { autorange: "reversed" },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: PLOT_FONT,
    showlegend: true,
    legend: PLOT_LEGEND_BOTTOM,
  };
  return Plotly.newPlot(elId, traces, layout, PLOT_CONFIG);
}

// ── Cost vs GWP scatter (A vs B) ──────────────────────────────────────────
export function drawCostScatter(
  elId,
  outA,
  outB,
  costA,
  costB,
  labelA = "A",
  labelB = "B",
) {
  ensurePlotly();
  const trace = {
    x: [costA, costB],
    y: [outA[0], outB[0]],
    text: [labelA, labelB],
    mode: "markers+text",
    type: "scatter",
    marker: { size: 18, color: ["#3b82f6", "#f97316"] },
    textposition: "top center",
  };
  const layout = {
    title: {
      text: "Cost vs GWP Trade-off",
      x: 0.02,
      font: { size: 14, color: "#0f172a" },
    },
    xaxis: { title: "Input Cost (₹/ha)", gridcolor: "#e2e8f0" },
    yaxis: { title: "GWP (kg CO₂-eq)", gridcolor: "#e2e8f0" },
    height: 320,
    margin: { l: 70, r: 30, t: 50, b: 50 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: PLOT_FONT,
    showlegend: false,
  };
  return Plotly.newPlot(elId, [trace], layout, PLOT_CONFIG);
}

// ── CCTS value chart (low / high price) ───────────────────────────────────
export function drawCctsValue(elId, valueLow, valueHigh) {
  ensurePlotly();
  const trace = {
    x: ["Low Price (₹600/t)", "High Price (₹900/t)"],
    y: [valueLow, valueHigh],
    type: "bar",
    marker: { color: ["#0ea5e9", "#16a34a"] },
    text: [valueLow, valueHigh].map(
      (v) => `₹${Math.round(v).toLocaleString("en-IN")}`,
    ),
    textposition: "outside",
    cliponaxis: false,
  };
  const layout = {
    title: {
      text: "Estimated Market Value Range (per ha)",
      x: 0.02,
      font: { size: 14, color: "#0f172a" },
    },
    yaxis: { title: "INR / ha", gridcolor: "#e2e8f0", automargin: true },
    height: 320,
    margin: { l: 70, r: 30, t: 70, b: 50 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: PLOT_FONT,
    showlegend: false,
  };
  return Plotly.newPlot(elId, [trace], layout, PLOT_CONFIG);
}
