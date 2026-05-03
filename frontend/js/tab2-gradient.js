// Tab 2 — Organic-Conventional Gradient (slider-driven blend).

import { api, loadMeta } from "./api.js";
import { fmt } from "./i18n.js";
import {
  drawBlendTrend,
  drawSpeedometer,
  drawConfidenceBand,
  drawStreamgraph,
  drawRadar,
  drawParetoIso,
  drawImpactDelta,
  drawGradientImpactBar,
  drawCostCompare,
} from "./charts.js";
import { renderInferenceSection } from "./inferences.js";
import { renderGauge, renderScenarioCard, renderTable } from "./widgets.js";

const $ = (id) => document.getElementById(id);

const IMPACT_LABELS = [
  "🌍 Global Warming",
  "💧 Eutrophication",
  "🌫️ Acidification",
  "☠️ Ecotoxicity",
];
const IMPACT_UNITS = ["kg CO₂-eq", "kg P-eq", "kg SO₂-eq", "CTUe"];
const IMPACT_FMT = ["num2", "num6", "num4", "num2"];

let debounceTimer = null;

export function initTab2() {
  const slider = $("t2-alpha");
  const label = $("t2-alpha-label");
  const btn = $("t2-recompute");

  slider.addEventListener("input", () => {
    label.textContent = slider.value + "%";
    updateModeBanner(+slider.value);
    scheduleRecompute();
  });
  btn.addEventListener("click", recompute);

  ["t2-N", "t2-P", "t2-K", "t2-Zn", "t2-Manure", "t2-Compost"].forEach((id) =>
    $(id).addEventListener("change", scheduleRecompute),
  );

  loadMeta()
    .then((meta) => {
      if (!meta.has_organic) {
        $("t2")
          .querySelector(".ck-input-block")
          .insertAdjacentHTML(
            "afterbegin",
            `<div class="ck-warning-card">⚠ Organic model unavailable; gradient analysis disabled.</div>`,
          );
        $("t2-recompute").disabled = true;
        $("t2-alpha").disabled = true;
      }
      // Note: results section stays hidden on initial load. It appears only
      // after the user moves the slider, edits an input, or clicks Recompute.
    })
    .catch(() => {});
}

function updateModeBanner(pct) {
  const el = $("t2-mode-banner");
  if (pct === 0) {
    el.className = "ck-callout info";
    el.innerHTML = "🧪 Currently showing: <strong>Fully Conventional</strong>";
  } else if (pct === 100) {
    el.className = "ck-callout success";
    el.innerHTML = "🌿 Currently showing: <strong>Fully Organic</strong>";
  } else {
    el.className = "ck-callout info";
    el.innerHTML = `🔄 Currently showing: <strong>${pct}% Organic / ${100 - pct}% Conventional</strong>`;
  }
}

function scheduleRecompute() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(recompute, 250);
}

async function recompute() {
  const btn = $("t2-recompute");
  btn.disabled = true;

  // Validate (informational only).
  const N = +$("t2-N").value,
    P = +$("t2-P").value,
    K = +$("t2-K").value,
    Zn = +$("t2-Zn").value;
  const manure = +$("t2-Manure").value,
    compost = +$("t2-Compost").value;
  const alpha = +$("t2-alpha").value / 100;

  renderInputWarnings(N, P, K, Zn);

  try {
    const r = await api.blend({ N, P, K, Zn, manure, compost, alpha });
    $("t2-results").hidden = false;
    renderResults(r, alpha);
  } catch (e) {
    $("t2-results").hidden = false;
    $("t2-results").innerHTML =
      `<div class="ck-warning-card">❌ ${e.message}</div>`;
  } finally {
    btn.disabled = false;
  }
}

function renderInputWarnings(N, P, K, Zn) {
  const ranges = { N: [120, 150], P: [40, 60], K: [30, 40], Zn: [10, 30] };
  const oor = Object.entries({ N, P, K, Zn }).filter(
    ([k, v]) => v < ranges[k][0] || v > ranges[k][1],
  );
  const box = $("t2-warnings");
  if (!oor.length) {
    box.innerHTML = "";
    return;
  }
  box.innerHTML = `<div class="ck-warning-card">⚠️ Conventional inputs out of range: ${oor
    .map(([k, v]) => `${k} = ${v} (valid: ${ranges[k][0]}–${ranges[k][1]})`)
    .join(", ")}</div>`;
}

function renderResults(r, alpha) {
  const conv = [
    r.conventional.global_warming,
    r.conventional.freshwater_eutrophication,
    r.conventional.terrestrial_acidification,
    r.conventional.terrestrial_ecotoxicity,
  ];
  const org = [
    r.organic.global_warming,
    r.organic.freshwater_eutrophication,
    r.organic.terrestrial_acidification,
    r.organic.terrestrial_ecotoxicity,
  ];
  const blendOut = [
    r.blend.global_warming,
    r.blend.freshwater_eutrophication,
    r.blend.terrestrial_acidification,
    r.blend.terrestrial_ecotoxicity,
  ];

  const costConv = r.cost_conventional_inr;
  const costOrg = r.cost_organic_inr;
  const costBlend = r.cost_blend_inr;

  const gwpPct = conv[0] !== 0 ? ((blendOut[0] - conv[0]) / conv[0]) * 100 : 0;
  const costPct =
    costConv !== 0 ? ((costBlend - costConv) / costConv) * 100 : 0;
  const acidPct = conv[2] !== 0 ? ((blendOut[2] - conv[2]) / conv[2]) * 100 : 0;
  const eutroPct =
    conv[1] !== 0 ? ((blendOut[1] - conv[1]) / conv[1]) * 100 : 0;

  // % gauges
  $("t2-pct-gauges").innerHTML =
    renderGauge("Global Warming", gwpPct, { icon: "🌍" }) +
    renderGauge("Input Cost", costPct, { icon: "💰", inverse: false }) +
    renderGauge("Acidification", acidPct, { icon: "🌫️" }) +
    renderGauge("Eutrophication", eutroPct, { icon: "💧" });

  // Speedometers
  drawSpeedometer("t2-sp-gwp", gwpPct, "GWP %");
  drawSpeedometer("t2-sp-cost", costPct, "Cost %", { inverse: false });
  drawSpeedometer("t2-sp-acid", acidPct, "Acid. %");
  drawSpeedometer("t2-sp-eutro", eutroPct, "Eutro. %");

  // Scenario cards
  $("t2-scenarios").innerHTML =
    renderScenarioCard({
      title: "Conventional",
      subtitle: "Current baseline synthetic system.",
      accent: "#1d4ed8",
      gwp: conv[0],
      cost: costConv,
    }) +
    renderScenarioCard({
      title: "Blend",
      subtitle: "Current organic/conventional transition.",
      accent: "#b45309",
      gwp: blendOut[0],
      cost: costBlend,
    }) +
    renderScenarioCard({
      title: "Organic",
      subtitle: "Full organic amendment values.",
      accent: "#15803d",
      gwp: org[0],
      cost: costOrg,
    });

  // Detailed impact table (4 rows × 3 columns)
  let detail = "";
  for (let i = 0; i < 4; i++) {
    const formatter = fmt[IMPACT_FMT[i]];
    const dPct = conv[i] !== 0 ? ((blendOut[i] - conv[i]) / conv[i]) * 100 : 0;
    const cls = dPct < 0 ? "neg" : dPct > 0 ? "pos" : "";
    detail += `<div class="ck-detail-row">
            <div class="ck-metric"><div class="ck-metric-label">${IMPACT_LABELS[i]} — Conv.</div><div class="ck-metric-value">${formatter(conv[i])}</div><div class="ck-metric-unit">${IMPACT_UNITS[i]}</div></div>
            <div class="ck-metric"><div class="ck-metric-label">${IMPACT_LABELS[i]} — Blend</div><div class="ck-metric-value">${formatter(blendOut[i])}</div><div class="ck-metric-unit">${IMPACT_UNITS[i]}</div><div class="delta ${cls}">${dPct >= 0 ? "+" : ""}${dPct.toFixed(1)}% vs Conv.</div></div>
            <div class="ck-metric"><div class="ck-metric-label">${IMPACT_LABELS[i]} — Organic</div><div class="ck-metric-value">${formatter(org[i])}</div><div class="ck-metric-unit">${IMPACT_UNITS[i]}</div></div>
        </div>`;
  }
  $("t2-detail").innerHTML = detail;

  // Breakdown chart
  drawGradientImpactBar("t2-breakdown", conv, blendOut, org);

  // Cost section
  const costDelta = costBlend - costConv;
  $("t2-m-cost-c").textContent = fmt.inr(costConv) + "/ha";
  $("t2-m-cost").textContent = fmt.inr(costBlend) + "/ha";
  $("t2-m-cost-o").textContent = fmt.inr(costOrg) + "/ha";
  const dEl = $("t2-cost-delta");
  dEl.textContent = `${costDelta >= 0 ? "+" : ""}${fmt.inr(costDelta)} vs Conv.`;
  dEl.className =
    "delta " + (costDelta < 0 ? "neg" : costDelta > 0 ? "pos" : "");
  drawCostCompare("t2-cost-chart", costConv, costBlend, costOrg, alpha);

  // Trend + confidence + streamgraph
  drawBlendTrend("t2-trend", conv, org, alpha);
  drawConfidenceBand("t2-cband", conv, org, 0.1);
  drawStreamgraph("t2-stream", conv, org);

  // Three-scenario radar
  drawRadar(
    "t2-radar3",
    [
      { label: "Conventional", values: conv, color: "#1d4ed8" },
      {
        label: `Blend (${Math.round(alpha * 100)}% Org)`,
        values: blendOut,
        color: "#f97316",
      },
      { label: "Organic", values: org, color: "#16a34a" },
    ],
    "Conv vs Blend vs Organic",
  );

  // Decision charts
  drawParetoIso("t2-frontier", conv, org, costConv, costOrg, alpha);
  drawImpactDelta("t2-delta", conv, blendOut);
  drawParetoIso("t2-pareto", conv, org, costConv, costOrg, alpha);

  // Cost-per-CO2 callout
  const gwpReduction = conv[0] - blendOut[0];
  const callout = $("t2-cost-callout");
  if (gwpReduction > 0 && costDelta > 0) {
    callout.className = "ck-callout info";
    callout.innerHTML = `💡 Reducing <strong>${gwpReduction.toFixed(1)} kg CO₂-eq/ha</strong> costs an extra <strong>₹${(costDelta / gwpReduction).toFixed(1)} per kg CO₂ avoided</strong>`;
  } else if (gwpReduction > 0 && costDelta <= 0) {
    callout.className = "ck-callout success";
    callout.innerHTML = `✅ Reducing <strong>${gwpReduction.toFixed(1)} kg CO₂-eq/ha</strong> while <strong>saving ₹${Math.abs(costDelta).toFixed(0)}/ha</strong>`;
  } else if (gwpReduction < 0) {
    callout.className = "ck-callout warning";
    callout.innerHTML = `⚠️ This blend <strong>increases</strong> GWP vs conventional — consider adjusting your organic inputs.`;
  } else {
    callout.className = "ck-callout info";
    callout.textContent = "No GWP change at this blend point.";
  }

  // Full comparison table
  $("t2-fulltable").innerHTML = renderTable(
    [
      "Impact Category",
      "Conventional",
      `Blend (${Math.round(alpha * 100)}% Org)`,
      "Full Organic",
      "Δ Conv→Blend",
    ],
    IMPACT_LABELS.map((lbl, i) => {
      const formatter = fmt[IMPACT_FMT[i]];
      const dPct =
        conv[i] !== 0 ? ((blendOut[i] - conv[i]) / conv[i]) * 100 : 0;
      return [
        `${lbl.replace(/^[^\s]+\s/, "")} (${IMPACT_UNITS[i]})`,
        formatter(conv[i]),
        formatter(blendOut[i]),
        formatter(org[i]),
        `${dPct >= 0 ? "+" : ""}${dPct.toFixed(1)}%`,
      ];
    }),
  );

  // Inference cards
  renderInferenceSection($("t2-inferences"), [
    {
      domain: "gwp_total",
      value: blendOut[0],
      ctx: { irrigation: "", amendments_used: alpha > 0 },
    },
    {
      domain: "blend_savings",
      value: gwpReduction,
      ctx: { gwp_saved: gwpReduction, cost_delta: costDelta, alpha },
    },
  ]);
}
