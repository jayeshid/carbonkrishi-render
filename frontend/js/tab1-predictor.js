// Tab 1 — LCA Impact Predictor (Single + Compare-Two, Conventional / Organic).

import { api, loadMeta } from "./api.js";
import { fmt } from "./i18n.js";
import { drawRadar, drawComparisonBars, drawCostScatter } from "./charts.js";
import { renderInferenceSection } from "./inferences.js";
import {
    renderValueGauge, renderWinnerBadge, renderDiffArrow, renderBullet, renderWaffle,
} from "./widgets.js";

const $ = (id) => document.getElementById(id);

const IMPACT_NAMES = ["Global Warming", "Eutrophication", "Acidification", "Ecotoxicity"];
const IMPACT_UNITS = ["kg CO₂-eq", "kg P-eq", "kg SO₂-eq", "CTUe"];
const IMPACT_FMT_KEYS = ["num2", "num6", "num4", "num2"];

const COST_RATES = { N: 6.5, P: 28.0, K: 15.0, Zn: 120.0, Manure: 0.8, Compost: 3.5 };

export function initTab1() {
    const sysRadios = document.querySelectorAll('#t1-system input[name="t1-sys"]');
    const modeRadios = document.querySelectorAll('#t1-mode input[name="t1-mode"]');

    sysRadios.forEach(r => r.addEventListener("change", refreshLayout));
    modeRadios.forEach(r => r.addEventListener("change", refreshLayout));
    $("t1-predict").addEventListener("click", onPredict);

    loadMeta().then(meta => {
        if (!meta.has_organic) {
            const orgRadio = document.querySelector('#t1-system input[value="organic"]');
            if (orgRadio) {
                orgRadio.disabled = true;
                orgRadio.parentElement.title = "Organic model unavailable.";
                orgRadio.parentElement.style.opacity = 0.5;
            }
        }
    }).catch(() => {});

    refreshLayout();
}

function getSystem() { return document.querySelector('#t1-system input[name="t1-sys"]:checked').value; }
function getMode()   { return document.querySelector('#t1-mode input[name="t1-mode"]:checked').value; }

function refreshLayout() {
    const sys = getSystem(), mode = getMode();
    const isOrg = sys === "organic";
    const isCmp = mode === "compare";

    $("t1-conv-inputs").hidden = isOrg || isCmp;
    $("t1-org-inputs").hidden  = !isOrg || isCmp;
    $("t1-compare-inputs").hidden = !isCmp;
    $("t1-compare-A-conv").hidden = isOrg;
    $("t1-compare-A-org").hidden  = !isOrg;
    $("t1-compare-B-conv").hidden = isOrg;
    $("t1-compare-B-org").hidden  = !isOrg;

    $("t1-results").hidden = true;
    $("t1-compare-results").hidden = true;
    $("t1-warnings").innerHTML = "";

    $("t1-predict").textContent = isCmp ? "🔍 Compare Combinations" : "🔍 Predict";
}

async function onPredict() {
    const btn = $("t1-predict");
    const warnings = $("t1-warnings");
    warnings.innerHTML = "";
    btn.disabled = true;
    btn.textContent = "⏳ Working…";

    try {
        if (getMode() === "single") await runSingle();
        else await runCompare();
    } catch (e) {
        warnings.innerHTML = `<div class="ck-warning-card">❌ ${escapeHtml(e.message)}</div>`;
    } finally {
        btn.disabled = false;
        btn.textContent = getMode() === "compare" ? "🔍 Compare Combinations" : "🔍 Predict";
    }
}

// ── SINGLE PREDICTION ──────────────────────────────────────────────────────
async function runSingle() {
    const sys = getSystem();
    let response, ctx, benchResp;

    if (sys === "conventional") {
        const N = +$("t1-N").value, P = +$("t1-P").value, K = +$("t1-K").value, Zn = +$("t1-Zn").value;
        response = await api.predictConventional({ N, P, K, Zn });
        ctx = { system: "conventional", N, P, K, Zn };
        benchResp = await api.predictConventional({ N: 150, P: 60, K: 40, Zn: 30 });
    } else {
        const manure = +$("t1-Manure").value, compost = +$("t1-Compost").value;
        response = await api.predictOrganic({ manure, compost });
        ctx = { system: "organic", manure, compost };
        benchResp = await api.predictOrganic({ manure: 15000, compost: 2000 });
    }

    renderWarnings(response.warnings);
    // Unhide BEFORE rendering so Plotly measures the real container width.
    $("t1-results").hidden = false;
    $("t1-compare-results").hidden = true;
    renderSingleResults(response.impacts, benchResp.impacts, ctx);
    $("t1-results").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderWarnings(warningsArr) {
    const box = $("t1-warnings");
    if (!warningsArr.length) {
        box.innerHTML = `<div class="ck-success-card">✅ All inputs within recommended ranges.</div>`;
        return;
    }
    box.innerHTML = `<div class="ck-warning-card">🚨 Out of range:<ul>${
        warningsArr.map(w => `<li>${w.nutrient} = ${w.value} ${w.unit} (valid: ${w.low}–${w.high})</li>`).join("")
    }</ul></div>`;
}

function renderSingleResults(imp, bench, ctx) {
    const vals = [imp.global_warming, imp.freshwater_eutrophication, imp.terrestrial_acidification, imp.terrestrial_ecotoxicity];
    const benchVals = [bench.global_warming, bench.freshwater_eutrophication, bench.terrestrial_acidification, bench.terrestrial_ecotoxicity];

    const costInr = ctx.system === "conventional"
        ? ctx.N * COST_RATES.N + ctx.P * COST_RATES.P + ctx.K * COST_RATES.K + ctx.Zn * COST_RATES.Zn
        : ctx.manure * COST_RATES.Manure + ctx.compost * COST_RATES.Compost;

    $("t1-m-cost").textContent = fmt.inr(costInr) + "/ha";
    $("t1-m-gwp").textContent  = fmt.num2(vals[0]) + " kg CO₂-eq";
    const risks = [
        { label: "Eutrophication", v: vals[1] / 0.001 },
        { label: "Acidification",  v: vals[2] / 0.02 },
        { label: "Ecotoxicity",    v: vals[3] / 5000 },
    ].sort((a, b) => b.v - a.v);
    $("t1-m-risk").textContent = risks[0].label;

    $("t1-m-gw").textContent = fmt.num2(vals[0]);
    $("t1-m-eu").textContent = fmt.num6(vals[1]);
    $("t1-m-ac").textContent = fmt.num4(vals[2]);
    $("t1-m-ec").textContent = fmt.num2(vals[3]);

    // Benchmark gauges (4 rings vs max-dose)
    const gaugeFmt = ["num2", "num6", "num4", "num2"];
    const gaugeIcons = ["🌍", "💧", "🌫️", "☠️"];
    $("t1-bench-gauges").innerHTML = IMPACT_NAMES.map((name, i) =>
        renderValueGauge(name, vals[i], benchVals[i], { unit: IMPACT_UNITS[i], icon: gaugeIcons[i], valueFmt: gaugeFmt[i] })
    ).join("");

    // Radar
    const youColor = ctx.system === "conventional" ? "#1d4ed8" : "#15803d";
    drawRadar("t1-radar", [
        { label: "Your Input", values: vals, color: youColor },
        { label: "Max Dose Benchmark", values: benchVals, color: "#ef4444" },
    ], "Your Input vs Benchmark");

    // Bullet charts (only for conventional, 4 nutrients)
    const bulletEl = $("t1-bullets");
    if (ctx.system === "conventional") {
        bulletEl.innerHTML =
            renderBullet(ctx.N,  120, 150, "Nitrogen (N)",   "kg/ha") +
            renderBullet(ctx.P,   40,  60, "Phosphorus (P)", "kg/ha") +
            renderBullet(ctx.K,   30,  40, "Potassium (K)",  "kg/ha") +
            renderBullet(ctx.Zn,  10,  30, "Zinc (Zn)",      "kg/ha");
    } else {
        bulletEl.innerHTML =
            renderBullet(ctx.manure,  5000, 15000, "Farm Yard Manure", "kg/ha") +
            renderBullet(ctx.compost, 1000,  2000, "Compost",          "kg/ha");
    }

    // GWP waffle (conventional only — uses per-kg coefficients)
    const waffleWrap = $("t1-waffle-wrap");
    if (ctx.system === "conventional") {
        const gwpCoef = [4.964134, 2.906595, 3.016340, 0.777299];
        const parts = [
            { label: "Nitrogen",   value: ctx.N  * gwpCoef[0], color: "#1f77b4" },
            { label: "Phosphorus", value: ctx.P  * gwpCoef[1], color: "#ff7f0e" },
            { label: "Potassium",  value: ctx.K  * gwpCoef[2], color: "#2ca02c" },
            { label: "Zinc",       value: ctx.Zn * gwpCoef[3], color: "#d62728" },
        ];
        $("t1-waffle").innerHTML = renderWaffle(parts, { totalLabel: "GWP" });
        waffleWrap.hidden = false;
    } else {
        waffleWrap.hidden = true;
    }

    // Inference cards
    renderInferenceSection($("t1-inferences"), [
        { domain: "gwp_total", value: vals[0], ctx: { irrigation: "", amendments_used: ctx.system === "organic" } },
        { domain: "ecotox",    value: vals[3], ctx: { zinc: ctx.Zn || 0 } },
    ]);
}

// ── COMPARE TWO ────────────────────────────────────────────────────────────
async function runCompare() {
    const sys = getSystem();
    let outA, outB, costA, costB, ctxA, ctxB;

    if (sys === "conventional") {
        const NA = +$("t1-NA").value, PA = +$("t1-PA").value, KA = +$("t1-KA").value, ZnA = +$("t1-ZnA").value;
        const NB = +$("t1-NB").value, PB = +$("t1-PB").value, KB = +$("t1-KB").value, ZnB = +$("t1-ZnB").value;
        const [rA, rB] = await Promise.all([
            api.predictConventional({ N: NA, P: PA, K: KA, Zn: ZnA }),
            api.predictConventional({ N: NB, P: PB, K: KB, Zn: ZnB }),
        ]);
        outA = impactsToArr(rA.impacts); outB = impactsToArr(rB.impacts);
        costA = NA * COST_RATES.N + PA * COST_RATES.P + KA * COST_RATES.K + ZnA * COST_RATES.Zn;
        costB = NB * COST_RATES.N + PB * COST_RATES.P + KB * COST_RATES.K + ZnB * COST_RATES.Zn;
        ctxA = { ZnA }; ctxB = { ZnB };
    } else {
        const MA = +$("t1-MA").value, CA = +$("t1-CA").value;
        const MB = +$("t1-MB").value, CB = +$("t1-CB").value;
        const [rA, rB] = await Promise.all([
            api.predictOrganic({ manure: MA, compost: CA }),
            api.predictOrganic({ manure: MB, compost: CB }),
        ]);
        outA = impactsToArr(rA.impacts); outB = impactsToArr(rB.impacts);
        costA = MA * COST_RATES.Manure + CA * COST_RATES.Compost;
        costB = MB * COST_RATES.Manure + CB * COST_RATES.Compost;
        ctxA = { ZnA: 0 }; ctxB = { ZnB: 0 };
    }

    // Unhide BEFORE rendering so Plotly measures the real container width.
    $("t1-results").hidden = true;
    $("t1-compare-results").hidden = false;

    const gwpWinner = outA[0] < outB[0] ? "A" : outB[0] < outA[0] ? "B" : "Tie";
    const costWinner = costA < costB ? "A" : costB < costA ? "B" : "Tie";
    $("t1-cmp-summary-gwp").innerHTML = `🌍 Lower GWP: <strong>Combination ${gwpWinner}</strong> (${fmt.num2(Math.min(outA[0], outB[0]))} kg CO₂-eq)`;
    $("t1-cmp-summary-cost").innerHTML = `💰 Cheaper: <strong>Combination ${costWinner}</strong> (${fmt.inr(Math.min(costA, costB))}/ha)`;

    // Comparison rows: A | B | winner
    const formats = ["num2", "num6", "num4", "num2"];
    const labels = ["🌍 Global Warming", "💧 Freshwater Eutrophication", "🌫️ Terrestrial Acidification", "☠️ Terrestrial Ecotoxicity"];
    let rows = "";
    for (let i = 0; i < 4; i++) {
        const f = fmt[formats[i]];
        rows += `<div class="ck-detail-row">
            <div class="ck-metric"><div class="ck-metric-label">${labels[i]} — A</div><div class="ck-metric-value">${f(outA[i])}</div><div class="ck-metric-unit">${IMPACT_UNITS[i]}</div></div>
            <div class="ck-metric"><div class="ck-metric-label">${labels[i]} — B</div><div class="ck-metric-value">${f(outB[i])}</div><div class="ck-metric-unit">${IMPACT_UNITS[i]}</div></div>
            ${renderWinnerBadge(outA[i], outB[i])}
        </div>`;
    }
    $("t1-cmp-rows").innerHTML = rows;
    drawComparisonBars("t1-cmp-bars", outA, outB);

    // Gauges B vs A (B as % of A)
    const gIcons = ["🌍", "💧", "🌫️", "☠️"];
    $("t1-cmp-gauges").innerHTML = IMPACT_NAMES.map((name, i) =>
        renderValueGauge(name, outB[i], outA[i], { unit: IMPACT_UNITS[i], icon: gIcons[i], valueFmt: formats[i] })
    ).join("");

    // Radar A vs B
    drawRadar("t1-cmp-radar", [
        { label: "Combination A", values: outA, color: "#3b82f6" },
        { label: "Combination B", values: outB, color: "#f97316" },
    ], "A vs B — Impact Profile");

    // Diff arrows
    let diffs = "";
    for (let i = 0; i < 4; i++) {
        diffs += renderDiffArrow(outA[i], outB[i], { unit: IMPACT_UNITS[i], label: IMPACT_NAMES[i], fmt: IMPACT_FMT_KEYS[i] });
    }
    diffs += renderDiffArrow(costA, costB, { unit: "₹/ha", label: "Input Cost", fmt: "int" });
    $("t1-cmp-diffs").innerHTML = diffs;

    // Cost vs GWP scatter
    drawCostScatter("t1-cmp-scatter", outA, outB, costA, costB, "Comb. A", "Comb. B");

    // Inference (interpret B)
    renderInferenceSection($("t1-cmp-inferences"), [
        { domain: "gwp_total", value: outB[0], ctx: { irrigation: "", amendments_used: sys === "organic" } },
        { domain: "ecotox",    value: outB[3], ctx: { zinc: ctxB.ZnB || 0 } },
    ]);

    $("t1-compare-results").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function impactsToArr(i) {
    return [i.global_warming, i.freshwater_eutrophication, i.terrestrial_acidification, i.terrestrial_ecotoxicity];
}

function escapeHtml(s) {
    return String(s).replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
}
