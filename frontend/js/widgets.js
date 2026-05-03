// HTML widget renderers — direct ports of render_*_html helpers from app.py.
// All return HTML strings safe to assign via innerHTML (no user input is ever
// interpolated into them).

import { fmt as F } from "./i18n.js";

// ── Gauge: % change vs baseline (conic gradient) ────────────────────────────
export function renderGauge(label, valuePct, { icon = "", inverse = true, maxAbs = 60 } = {}) {
    let color;
    if (valuePct === 0) color = "#94a3b8";
    else if ((valuePct < 0) === inverse) color = "#16a34a";
    else color = "#ef4444";

    const pctCapped = Math.min(Math.abs(valuePct) / maxAbs * 100, 100);
    const arrow = valuePct < 0 ? "▼" : valuePct > 0 ? "▲" : "■";
    return `
        <div class="ck-gauge">
            <div class="ck-gauge-label">${icon} ${escAttr(label)}</div>
            <div class="ck-gauge-ring" style="background: conic-gradient(${color} 0% ${pctCapped.toFixed(1)}%, #e5e7eb ${pctCapped.toFixed(1)}% 100%);">
                <div class="ck-gauge-inner">
                    <div class="ck-gauge-value" style="color:${color};">${arrow} ${Math.abs(valuePct).toFixed(1)}%</div>
                    <div class="ck-gauge-sub">vs CONV</div>
                </div>
            </div>
        </div>`;
}

// ── Value gauge: current value as % of a max benchmark ──────────────────────
export function renderValueGauge(label, value, maxValue, { unit = "", icon = "", valueFmt = "num2" } = {}) {
    const pct = (maxValue && maxValue > 0) ? (value / maxValue * 100) : 0;
    const pctCapped = Math.max(0, Math.min(pct, 100));
    const color = pctCapped < 50 ? "#16a34a" : pctCapped < 80 ? "#f59e0b" : "#ef4444";
    const formatter = F[valueFmt] || F.num2;

    return `
        <div class="ck-gauge">
            <div class="ck-gauge-label">${icon} ${escAttr(label)}</div>
            <div class="ck-gauge-ring" style="background: conic-gradient(${color} 0% ${pctCapped.toFixed(1)}%, #e5e7eb ${pctCapped.toFixed(1)}% 100%);">
                <div class="ck-gauge-inner">
                    <div class="ck-gauge-value-large">${formatter(value)}</div>
                    <div class="ck-gauge-sub">${escAttr(unit)}</div>
                </div>
            </div>
            <div class="ck-gauge-bench" style="color:${color};">${pct.toFixed(0)}% of benchmark</div>
        </div>`;
}

// ── Winner badge for A vs B comparisons ────────────────────────────────────
export function renderWinnerBadge(valueA, valueB) {
    let label, klass;
    if (valueA < valueB) { label = "Lower: A"; klass = "win-a"; }
    else if (valueB < valueA) { label = "Lower: B"; klass = "win-b"; }
    else { label = "Tie"; klass = "tie"; }
    return `<div class="ck-winner-wrap"><div class="ck-winner-badge ${klass}">${label}</div></div>`;
}

// ── Diff arrow: A vs B, %-difference ───────────────────────────────────────
export function renderDiffArrow(valueA, valueB, { unit = "", label = "", fmt = "num2" } = {}) {
    const pct = valueA === 0 ? 0 : (valueB - valueA) / valueA * 100;
    let color, arrow, verdict;
    if (pct < 0)      { color = "#16a34a"; arrow = "▼"; verdict = "B is greener"; }
    else if (pct > 0) { color = "#ef4444"; arrow = "▲"; verdict = "B is worse"; }
    else              { color = "#64748b"; arrow = "■"; verdict = "Tie"; }
    const formatter = F[fmt] || F.num2;

    return `
        <div class="ck-diff-arrow">
            <div class="ck-diff-side">
                <div class="ck-diff-tag">A</div>
                <div class="ck-diff-val">${formatter(valueA)} ${escAttr(unit)}</div>
            </div>
            <div class="ck-diff-mid">
                <div class="ck-diff-arrow-glyph" style="color:${color};">${arrow}</div>
                <div class="ck-diff-pct" style="color:${color};">${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%</div>
                <div class="ck-diff-verdict">${verdict}</div>
            </div>
            <div class="ck-diff-side">
                <div class="ck-diff-tag">B</div>
                <div class="ck-diff-val">${formatter(valueB)} ${escAttr(unit)}</div>
            </div>
            <div class="ck-diff-label">${escAttr(label)}</div>
        </div>`;
}

// ── Scenario card (Conv / Blend / Organic summary) ─────────────────────────
export function renderScenarioCard({ title, subtitle, accent, gwp, cost }) {
    return `
        <div class="ck-scenario-card">
            <div class="ck-scenario-head">
                <div class="ck-scenario-accent" style="background:${accent};"></div>
                <div>
                    <h4 style="margin:0; color:${accent};">${escAttr(title)}</h4>
                    <p style="margin:0.35rem 0 0; color:#475569;">${escAttr(subtitle)}</p>
                </div>
            </div>
            <p class="ck-scenario-line">GWP: ${F.num2(gwp)} kg CO₂-eq</p>
            <p class="ck-scenario-line">Cost: ${F.inr(cost)}/ha</p>
        </div>`;
}

// ── Waffle: 100 squares colored by share ───────────────────────────────────
export function renderWaffle(parts, { totalLabel = "GWP", squares = 100 } = {}) {
    const total = parts.reduce((s, p) => s + p.value, 0) || 1;
    const counts = parts.map(p => ({ ...p, count: Math.round(p.value / total * squares) }));
    const sum = counts.reduce((s, p) => s + p.count, 0);
    if (sum !== squares && counts.length) counts[counts.length - 1].count += (squares - sum);

    let cells = "";
    for (const p of counts) {
        for (let i = 0; i < p.count; i++) {
            cells += `<div class="ck-waffle-cell" style="background:${p.color};" title="${escAttr(p.label)}"></div>`;
        }
    }
    const legend = counts.map(p =>
        `<div class="ck-waffle-legend-item">
            <span class="ck-waffle-swatch" style="background:${p.color};"></span>
            <span>${escAttr(p.label)} — ${(p.value / total * 100).toFixed(1)}%</span>
        </div>`).join("");

    return `
        <div class="ck-waffle-wrap">
            <div class="ck-waffle-header">${escAttr(totalLabel)} share by source</div>
            <div class="ck-waffle-grid">${cells}</div>
            <div class="ck-waffle-legend">${legend}</div>
        </div>`;
}

// ── Simple summary table ───────────────────────────────────────────────────
export function renderTable(columns, rows) {
    return `<table class="ck-table">
        <thead><tr>${columns.map(c => `<th>${escAttr(c)}</th>`).join("")}</tr></thead>
        <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${typeof c === "number" ? F.num4(c) : escAttr(c)}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>`;
}

// ── Bullet chart (linear, three zones) — pure SVG, no library ─────────────
export function renderBullet(value, low, high, label, unit = "") {
    const span = Math.max(high - low, 1);
    const bandMin = Math.max(low - span * 0.5, 0);
    const bandMax = high + span * 0.5;
    const W = 320, H = 64;
    const x = v => ((v - bandMin) / (bandMax - bandMin)) * (W - 20) + 10;
    const valueClamped = Math.max(bandMin, Math.min(bandMax, value));

    return `
        <div class="ck-bullet">
            <div class="ck-bullet-title">${escAttr(label)} <span class="ck-bullet-unit">${escAttr(unit)}</span></div>
            <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" xmlns="http://www.w3.org/2000/svg">
                <rect x="${x(bandMin)}" y="22" width="${x(low)-x(bandMin)}" height="20" fill="#fde68a" rx="4"></rect>
                <rect x="${x(low)}"     y="22" width="${x(high)-x(low)}"     height="20" fill="#86efac" rx="4"></rect>
                <rect x="${x(high)}"    y="22" width="${x(bandMax)-x(high)}" height="20" fill="#fca5a5" rx="4"></rect>
                <line x1="${x(valueClamped)}" x2="${x(valueClamped)}" y1="14" y2="50" stroke="#0f172a" stroke-width="4"></line>
                <text x="${x(valueClamped)}" y="11" text-anchor="middle" font-size="11" font-weight="700" fill="#0f172a">${F.num2(value)}</text>
                <text x="10" y="60" font-size="10" fill="#64748b">${F.num2(bandMin)}</text>
                <text x="${W-10}" y="60" text-anchor="end" font-size="10" fill="#64748b">${F.num2(bandMax)}</text>
                <text x="${x(low)}" y="60" text-anchor="middle" font-size="10" fill="#475569">${F.num2(low)}</text>
                <text x="${x(high)}" y="60" text-anchor="middle" font-size="10" fill="#475569">${F.num2(high)}</text>
            </svg>
        </div>`;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function escAttr(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
