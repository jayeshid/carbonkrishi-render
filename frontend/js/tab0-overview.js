// Tab 0 — Overview / Dashboard landing page.
//
// Renders a strip of KPI cards summarising what the system can do, wires up
// the welcome-page CTA and module-card jump buttons, and powers the topbar
// language switcher.

import { loadMeta } from "./api.js";
import { setLang, getLang, LANGS } from "./i18n.js";

const $ = (id) => document.getElementById(id);

export async function initTab0() {
  initTopbar();
  initJumpButtons();

  // KPI strip — server-driven where possible, otherwise sensible defaults.
  let meta = null;
  try {
    meta = await loadMeta();
  } catch {
    /* offline-friendly */
  }
  renderKpis(meta);
}

// ── Topbar: language select + sidebar toggle ──────────────────────────────
function initTopbar() {
  // Sync lang select with stored preference; broadcast change.
  const langSel = $("ck-lang-select");
  if (langSel) {
    // Populate (or trust the static options); set initial value.
    const initial = getLang();
    if ([...langSel.options].some((o) => o.value === initial))
      langSel.value = initial;
    langSel.addEventListener("change", () => {
      setLang(langSel.value);
      // If any inference card is currently rendered, give it a nudge by
      // dispatching a custom event other modules can listen for.
      window.dispatchEvent(
        new CustomEvent("ck:lang-change", { detail: langSel.value }),
      );
    });
  }

  // Sidebar toggle for narrow screens.
  const toggle = $("ck-side-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      document.body.classList.toggle("ck-sidebar-open");
    });
  }
}

// ── Module card jump-to-tab buttons ───────────────────────────────────────
function initJumpButtons() {
  document.querySelectorAll("[data-jump]").forEach((el) => {
    el.addEventListener("click", () => {
      const target = el.getAttribute("data-jump");
      const btn = document.querySelector(`.ck-tab[data-tab="${target}"]`);
      if (btn) btn.click();
    });
  });
}

// ── KPI cards ─────────────────────────────────────────────────────────────
function renderKpis(meta) {
  const host = $("ov-kpis");
  if (!host) return;

  const ranges = meta?.conv_ranges || {
    N: [120, 150],
    P: [40, 60],
    K: [30, 40],
    Zn: [10, 30],
  };
  const cost = meta?.cost_rates || {};
  const hasOrg = !!meta?.has_organic;
  const langs = LANGS.length;

  const kpis = [
    {
      icon: "🤖",
      title: "Models loaded",
      value: hasOrg ? "Conv + Org" : "Conv only",
      sub: hasOrg
        ? "Both Ridge regressors active"
        : "Organic stack unavailable",
      tone: hasOrg ? "green" : "amber",
    },
    {
      icon: "🌾",
      title: "Recommended N",
      value: `${ranges.N[0]}–${ranges.N[1]}`,
      sub: "kg/ha for irrigated rice",
      tone: "green",
    },
    {
      icon: "💲",
      title: "CCTS price band",
      value: "₹600–₹900",
      sub: "per t CO₂-eq",
      tone: "blue",
    },
    {
      icon: "🌍",
      title: "Typical GWP",
      value: "3,000–7,000",
      sub: "kg CO₂-eq per ha · season",
      tone: "teal",
    },
    {
      icon: "🗣️",
      title: "Languages",
      value: `${langs}`,
      sub: "EN · हिंदी · తెలుగు",
      tone: "purple",
    },
    {
      icon: "📚",
      title: "Training records",
      value: "13,042",
      sub: "OpenLCA parametric runs",
      tone: "indigo",
    },
  ];

  host.innerHTML = kpis
    .map(
      (k) => `
        <div class="ck-kpi-card tone-${k.tone}">
            <div class="ck-kpi-ico">${k.icon}</div>
            <div class="ck-kpi-body">
                <div class="ck-kpi-title">${k.title}</div>
                <div class="ck-kpi-value">${k.value}</div>
                <div class="ck-kpi-sub">${k.sub}</div>
            </div>
        </div>
    `,
    )
    .join("");
}
