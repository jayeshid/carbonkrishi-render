// Renders the multilingual inference section ("What this means for your field").

import { api } from "./api.js";
import { LANGS, getLang, setLang } from "./i18n.js";

/**
 * Render an inference section into `container`.
 * `cards` is an array of { domain, value, ctx? } describing what to fetch.
 * Server returns { title, body_html, color, refs[] } per card per language.
 */
export async function renderInferenceSection(container, cards) {
    container.innerHTML = "";
    if (!cards || !cards.length) return;

    const heading = document.createElement("h3");
    heading.textContent = "📖 What this means for your field · आपके खेत के लिए मतलब · మీ పొలానికి అర్థం · तुमच्या शेतासाठी अर्थ";
    container.appendChild(heading);

    const langTabs = document.createElement("div");
    langTabs.className = "ck-lang-tabs";
    const langContent = document.createElement("div");
    const actions = document.createElement("div");
    actions.className = "ck-inference-actions";
    const printBtn = document.createElement("button");
    printBtn.type = "button";
    printBtn.className = "ck-btn ck-print-btn";
    printBtn.textContent = "💾 Save Report";
    printBtn.addEventListener("click", () => window.print());
    actions.appendChild(printBtn);
    container.appendChild(langTabs);
    container.appendChild(langContent);
    container.appendChild(actions);

    let activeLang = getLang();

    LANGS.forEach(({ code, label }) => {
        const btn = document.createElement("button");
        btn.className = "ck-lang-tab" + (code === activeLang ? " active" : "");
        btn.textContent = label;
        btn.addEventListener("click", () => {
            activeLang = code;
            setLang(code);
            langTabs.querySelectorAll(".ck-lang-tab").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            paint();
        });
        langTabs.appendChild(btn);
    });

    async function paint() {
        langContent.innerHTML = '<p class="ck-muted">Loading inferences…</p>';
        try {
            const results = await Promise.all(cards.map(c =>
                api.inferenceCard({ domain: c.domain, value: c.value, ctx: c.ctx || {}, lang: activeLang })
            ));
            langContent.innerHTML = results.map(card => `
                <div class="ck-inference-card" style="border-left-color:${card.color};">
                    <div class="title">${escapeAttr(card.title)}</div>
                    <div class="body">${card.body_html}</div>
                    <div class="refs">${
                        card.refs.map(r =>
                            `<a class="ck-ref-pill" href="${encodeURI(r.url)}" target="_blank" rel="noopener" title="${escapeAttr(r.name)}">↗ ${escapeAttr(r.key.toUpperCase())}</a>`
                        ).join("")
                    }</div>
                </div>
            `).join("");
        } catch (e) {
            langContent.innerHTML = `<div class="ck-warning-card">Failed to load inferences: ${e.message}</div>`;
        }
    }

    paint();
}

function escapeAttr(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
