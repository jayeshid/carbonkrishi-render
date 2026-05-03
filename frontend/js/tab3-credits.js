// Tab 3 — Carbon Credit Potential (CCTS).

import { api } from "./api.js";
import { fmt } from "./i18n.js";
import { drawCreditSource, drawBufferEffect, drawCctsValue } from "./charts.js";
import { renderInferenceSection } from "./inferences.js";
import { renderValueGauge } from "./widgets.js";

const $ = (id) => document.getElementById(id);

export function initTab3() {
    $("t3-calc").addEventListener("click", calc);
    const slider = $("t3-buffer");
    slider.addEventListener("input", () => {
        $("t3-buffer-label").textContent = slider.value + "%";
        if (!$("t3-results").hidden) calc();
    });

    // Validate inputs informationally
    ["t3-Manure", "t3-Compost"].forEach(id => $(id).addEventListener("change", validate));
    validate();
}

function validate() {
    const m = +$("t3-Manure").value, c = +$("t3-Compost").value;
    const issues = [];
    if (m < 5000 || m > 15000) issues.push(`Manure = ${m} (valid: 5,000–15,000)`);
    if (c < 1000 || c >  2000) issues.push(`Compost = ${c} (valid: 1,000–2,000)`);
    const box = $("t3-warnings");
    box.innerHTML = issues.length
        ? `<div class="ck-warning-card">⚠️ Inputs outside recommended organic ranges: ${issues.join(", ")}</div>`
        : "";
}

async function calc() {
    const btn = $("t3-calc");
    btn.disabled = true; btn.textContent = "⏳ Calculating…";
    try {
        const body = {
            manure:  +$("t3-Manure").value,
            compost: +$("t3-Compost").value,
            buffer_pct: +$("t3-buffer").value,
        };
        const [r, bench] = await Promise.all([
            api.socCredits(body),
            api.socCredits({ manure: 15000, compost: 2000, buffer_pct: body.buffer_pct }),
        ]);
        // Unhide BEFORE rendering so Plotly measures the real container width.
        $("t3-results").hidden = false;
        render(r, bench);
        $("t3-results").scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (e) {
        $("t3-results").hidden = false;
        $("t3-results").innerHTML = `<div class="ck-warning-card">❌ ${e.message}</div>`;
    } finally {
        btn.disabled = false; btn.textContent = "💎 Calculate Credits";
    }
}

function render(r, bench) {
    $("t3-m-credits").textContent = fmt.num3(r.credits_tco2);
    $("t3-m-before").textContent  = fmt.num3(r.soc_before_buffer_tco2);
    $("t3-m-buffer").textContent  = fmt.num3(r.buffer_withheld_tco2);

    // Benchmark gauges (vs max-dose)
    $("t3-bench-gauges").innerHTML =
        renderValueGauge("Credits Earned",     r.credits_tco2,           bench.credits_tco2,           { unit: "t CO₂/ha", icon: "🌱", valueFmt: "num3" }) +
        renderValueGauge("SOC Stored",         r.soc_before_buffer_tco2, bench.soc_before_buffer_tco2, { unit: "t CO₂/ha", icon: "📦", valueFmt: "num3" }) +
        renderValueGauge("FYM Contribution",   r.fym_credits_tco2,       bench.fym_credits_tco2,       { unit: "t CO₂/ha", icon: "🐄", valueFmt: "num3" }) +
        renderValueGauge("Compost Contribution", r.compost_credits_tco2, bench.compost_credits_tco2,   { unit: "t CO₂/ha", icon: "🍂", valueFmt: "num3" });

    // Value callout
    $("t3-value-box").innerHTML = `<strong>${fmt.inr(r.value_low_inr)} – ${fmt.inr(r.value_high_inr)}</strong> per ha · based on ₹600 – ₹900 per t CO₂-eq.`;

    // Charts
    drawCreditSource("t3-source", r.fym_credits_tco2, r.compost_credits_tco2);
    drawBufferEffect("t3-bufchart", r.soc_before_buffer_tco2, r.credits_tco2, r.buffer_withheld_tco2);
    drawCctsValue("t3-value-chart", r.value_low_inr, r.value_high_inr);

    renderInferenceSection($("t3-inferences"), [
        { domain: "credits", value: r.credits_tco2, ctx: {} },
    ]);
}
