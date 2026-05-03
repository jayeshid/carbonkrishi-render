// Tab 4 — Field Emission Calculator.

import { api } from "./api.js";
import { fmt } from "./i18n.js";
import { drawEmissionBar, drawEmissionPie, drawSankey, drawTreemap } from "./charts.js";
import { renderInferenceSection } from "./inferences.js";
import { renderValueGauge, renderTable } from "./widgets.js";

const $ = (id) => document.getElementById(id);

export function initTab4() {
    $("t4-calc").addEventListener("click", calc);
}

async function calc() {
    const btn = $("t4-calc");
    btn.disabled = true; btn.textContent = "⏳ Calculating…";
    try {
        const body = {
            synthetic_n: +$("t4-N").value,
            synthetic_p: +$("t4-P").value,
            irrigation: $("t4-irrigation").value,
            amendment_1: $("t4-am1").value,
            amendment_2: $("t4-am2").value,
        };
        // Fetch user emissions and the upper-bound benchmark in parallel.
        const [e, bench] = await Promise.all([
            api.fieldEmissions(body),
            api.fieldEmissions({
                synthetic_n: 150, synthetic_p: 60,
                irrigation: "Fully Flooded",
                amendment_1: "None", amendment_2: "None",
            }),
        ]);
        // Unhide BEFORE rendering so Plotly measures the real container width.
        // Drawing into a still-hidden (display:none) element gives Plotly a
        // fallback width and produces cramped charts until the next resize event.
        $("t4-results").hidden = false;
        render(e, bench, body);
        $("t4-results").scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (err) {
        $("t4-results").hidden = false;
        $("t4-results").innerHTML = `<div class="ck-warning-card">❌ ${err.message}</div>`;
    } finally {
        btn.disabled = false; btn.textContent = "📈 Calculate Field Emissions";
    }
}

function render(e, bench, body) {
    // Top metric tiles
    $("t4-m-ch4").textContent = fmt.num2(e.CH4);
    $("t4-m-n2o").textContent = fmt.num4(e.N2O);
    $("t4-m-no3").textContent = fmt.num4(e.NO3);
    $("t4-m-nh3").textContent = fmt.num4(e.NH3);
    $("t4-m-po4").textContent = fmt.num4(e.PO4);

    // Benchmark gauges (5 rings vs Fully-Flooded max-N max-P baseline)
    const rows = [
        { label: "CH₄", icon: "🔥", val: e.CH4, mx: bench.CH4, fmtKey: "num2" },
        { label: "N₂O", icon: "⚡", val: e.N2O, mx: bench.N2O, fmtKey: "num4" },
        { label: "NO₃", icon: "💦", val: e.NO3, mx: bench.NO3, fmtKey: "num4" },
        { label: "NH₃", icon: "🌬️", val: e.NH3, mx: bench.NH3, fmtKey: "num4" },
        { label: "PO₄", icon: "💧", val: e.PO4, mx: bench.PO4, fmtKey: "num4" },
    ];
    $("t4-bench-gauges").innerHTML = rows.map(r =>
        renderValueGauge(r.label, r.val, r.mx, { unit: "kg/ha", icon: r.icon, valueFmt: r.fmtKey })
    ).join("");

    // Summary table (with methodology column)
    $("t4-summary").innerHTML = renderTable(
        ["Emission", "Value (kg/ha/season)", "Methodology"],
        [
            ["CH₄", e.CH4, "IPCC"],
            ["N₂O", e.N2O, "IPCC"],
            ["NO₃", e.NO3, "IPCC"],
            ["NH₃", e.NH3, "IPCC"],
            ["PO₄", e.PO4, "SALCA"],
        ]
    );

    // Charts
    drawEmissionBar("t4-bar", e);
    drawEmissionPie("t4-pie", e);
    drawSankey("t4-sankey", e, body.synthetic_n, body.synthetic_p, body.amendment_1, body.amendment_2);
    drawTreemap("t4-treemap", e);

    // Inferences (5 cards)
    renderInferenceSection($("t4-inferences"), [
        { domain: "ch4", value: e.CH4, ctx: { irrigation: body.irrigation } },
        { domain: "n2o", value: e.N2O, ctx: { synthetic_n: body.synthetic_n } },
        { domain: "no3", value: e.NO3, ctx: {} },
        { domain: "nh3", value: e.NH3, ctx: {} },
        { domain: "po4", value: e.PO4, ctx: {} },
    ]);
}
