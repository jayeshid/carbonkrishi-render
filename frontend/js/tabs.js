// Top-level tab switcher (sidebar nav).
// Also updates the topbar title and closes the sidebar on mobile after a click.

const PAGE_SUBTITLES = {
    t0: "Climate-smart rice LCA analytics",
    t1: "Conventional / organic prediction · Compare-Two",
    t2: "Slider-driven blend · cost-climate frontier",
    t3: "Soil-carbon credit potential (CCTS)",
    t4: "Field emissions via IPCC + SALCA factors",
    t5: "Methodology · datasets · references",
};

export function initTabs() {
    const tabs = document.querySelectorAll(".ck-tab");
    const panels = document.querySelectorAll(".ck-tabpanel");
    const titleEl = document.getElementById("ck-page-title");
    const subEl   = document.getElementById("ck-page-sub");

    tabs.forEach(btn => {
        btn.addEventListener("click", () => activate(btn.dataset.tab, btn));
    });

    function activate(id, btn) {
        tabs.forEach(t => {
            const on = t.dataset.tab === id;
            t.classList.toggle("active", on);
            t.setAttribute("aria-selected", on ? "true" : "false");
        });
        panels.forEach(p => {
            const on = p.id === id;
            p.classList.toggle("active", on);
            p.hidden = !on;
        });

        // Update topbar title from the data-title attribute of the clicked tab.
        if (titleEl && btn) titleEl.textContent = btn.dataset.title || btn.textContent.trim();
        if (subEl) subEl.textContent = PAGE_SUBTITLES[id] || "";

        // Close sidebar on mobile after a tab click.
        document.body.classList.remove("ck-sidebar-open");

        // Scroll content area to top so the new page starts at the top.
        const main = document.querySelector(".ck-main");
        if (main) main.scrollTo({ top: 0, behavior: "smooth" });

        // After the tab is visible, ask every Plotly chart inside it to re-fit
        // its container width. Fixes charts that were drawn while their tab
        // was display:none and inherited a wrong (default) width.
        // We use double-rAF + a delayed safety net because a single rAF can
        // fire before the browser has fully laid out the newly-visible panel.
        const resizePanelCharts = () => {
            const panel = document.getElementById(id);
            if (!panel || !window.Plotly) return;
            panel.querySelectorAll(".js-plotly-plot").forEach((el) => {
                try { window.Plotly.Plots.resize(el); } catch { /* noop */ }
            });
        };
        requestAnimationFrame(() => requestAnimationFrame(resizePanelCharts));
        setTimeout(resizePanelCharts, 250);
    }
}

// Re-fit every Plotly chart on window resize so the dashboard stays responsive.
let _resizeTimer = null;
window.addEventListener("resize", () => {
    if (!window.Plotly) return;
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(() => {
        document.querySelectorAll(".js-plotly-plot").forEach((el) => {
            try { window.Plotly.Plots.resize(el); } catch { /* noop */ }
        });
    }, 120);
});
