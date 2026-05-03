// Tab 5 — Model Information.

import { loadMeta } from "./api.js";
import { drawImpactHeatmap } from "./charts.js";

const $ = (id) => document.getElementById(id);

export async function initTab5() {
    try {
        const meta = await loadMeta();
        renderIntensityTable(meta.impact_data);
        renderSources(meta.sources);
        // Per-kg footprint heatmap (log₁₀ scale)
        try {
            drawImpactHeatmap("t5-heatmap", meta.impact_data);
        } catch (chartErr) {
            $("t5-heatmap").innerHTML = `<p class="ck-muted">Heatmap unavailable: ${chartErr.message}</p>`;
        }
    } catch (e) {
        $("t5-intensity-table").innerHTML = `<div class="ck-warning-card">Failed to load metadata: ${e.message}</div>`;
    }

    // Validation plot images — bundled in /media/Plots/.
    const plots = $("t5-plots");
    const figs = [
        {
            src: "media/Plots/plot1_predicted_vs_actual.png",
            title: "Predicted vs Actual",
            caption: "Hold-out predictions plotted against ground-truth values across all four impact categories. Closer to the diagonal = better fit.",
        },
        {
            src: "media/Plots/plot2_feature_importance.png",
            title: "Feature Importance",
            caption: "Ridge-regression coefficient magnitudes per input feature. Higher bars = stronger driver of the predicted impact.",
        },
        {
            src: "media/Plots/plot3_input_vs_impact.png",
            title: "Input vs Impact",
            caption: "Marginal-effect curves showing how each input dose translates into predicted environmental impact.",
        },
    ];
    plots.innerHTML = `
        <div class="ck-plot-gallery">
            ${figs.map(f => `
                <figure class="ck-plot-figure">
                    <a href="${f.src}" target="_blank" rel="noopener" class="ck-plot-link">
                        <img src="${f.src}" alt="${f.title}" loading="lazy" />
                    </a>
                    <figcaption>
                        <strong>${f.title}</strong>
                        <span>${f.caption}</span>
                    </figcaption>
                </figure>
            `).join("")}
        </div>
    `;
}

function renderIntensityTable(data) {
    const cols = Object.keys(data).filter(k => k !== "Input");
    const html = `
        <table class="ck-table">
            <thead>
                <tr><th>Input</th>${cols.map(c => `<th>${c}</th>`).join("")}</tr>
            </thead>
            <tbody>
                ${data.Input.map((inp, i) => `
                    <tr>
                        <td><b>${inp}</b></td>
                        ${cols.map(c => `<td>${formatCell(data[c][i])}</td>`).join("")}
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
    $("t5-intensity-table").innerHTML = html;
}

function formatCell(v) {
    if (v == null) return "—";
    const n = Number(v);
    if (Math.abs(n) >= 100) return n.toFixed(2);
    if (Math.abs(n) >= 1)   return n.toFixed(4);
    return n.toFixed(6);
}

function renderSources(sources) {
    const items = Object.entries(sources)
        .map(([k, v]) => `<li><a href="${v.url}" target="_blank" rel="noopener">${v.name}</a></li>`)
        .join("");
    $("t5-sources").innerHTML = `<ul>${items}</ul>`;
}
