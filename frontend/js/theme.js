// theme.js — light / dark theme controller
// ----------------------------------------------------------------------------
// Sets `data-theme` on <html> based on (in order):
//   1. localStorage pref (user's previous explicit choice)
//   2. matchMedia("(prefers-color-scheme: dark)")  (OS preference, first visit)
//   3. Default = "dark"  (project's original look)
// Wires up any element with [data-theme-toggle] to flip between dark/light
// and persist the choice. Updates the toggle's aria-label and inner icon.
// ----------------------------------------------------------------------------

(function () {
    const STORAGE_KEY = "ck-theme";
    const root = document.documentElement;

    function readStored() {
        try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
    }
    function writeStored(v) {
        try { localStorage.setItem(STORAGE_KEY, v); } catch { /* private mode */ }
    }
    function systemPref() {
        return window.matchMedia
            && window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark" : "light";
    }
    function resolveInitial() {
        const stored = readStored();
        if (stored === "dark" || stored === "light") return stored;
        // Brand spec: light is the canonical visual identity. We still respect
        // an explicit OS preference for dark, but default to light otherwise.
        return systemPref() === "dark" ? "dark" : "light";
    }

    function apply(theme) {
        root.setAttribute("data-theme", theme);
        root.style.colorScheme = theme;
        // Tell every Plotly chart to repaint its labels for the new theme.
        if (window.Plotly) {
            document.querySelectorAll(".js-plotly-plot").forEach((el) => {
                try { window.Plotly.Plots.resize(el); } catch { /* noop */ }
            });
        }
        // Update every toggle button's icon + aria-label.
        document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
            const isDark = theme === "dark";
            btn.setAttribute("aria-label",
                isDark ? "Switch to light mode" : "Switch to dark mode");
            btn.setAttribute("title",
                isDark ? "Switch to light mode" : "Switch to dark mode");
            btn.setAttribute("aria-pressed", String(isDark));
            // Inner content: sun icon when dark (click → switch to light),
            // moon icon when light (click → switch to dark).
            btn.textContent = isDark ? "☀" : "🌙";
        });
    }

    // ── Pre-paint application (runs as soon as this script is parsed) ──
    apply(resolveInitial());

    function toggle() {
        const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        writeStored(next);
        apply(next);
    }

    // Wire up toggle buttons after DOM is ready.
    function bind() {
        document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
            if (btn.dataset.themeBound) return;
            btn.dataset.themeBound = "1";
            btn.addEventListener("click", toggle);
        });
        apply(root.getAttribute("data-theme") || resolveInitial());
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bind);
    } else {
        bind();
    }

    // React to OS preference changes (only when user hasn't pinned a choice).
    if (window.matchMedia) {
        const mql = window.matchMedia("(prefers-color-scheme: dark)");
        const onChange = () => {
            if (readStored()) return; // user has explicit preference, ignore OS
            apply(mql.matches ? "dark" : "light");
        };
        if (mql.addEventListener) mql.addEventListener("change", onChange);
        else if (mql.addListener) mql.addListener(onChange);
    }

    // Expose minimal API for debugging / programmatic use.
    window.ckTheme = {
        get current() { return root.getAttribute("data-theme"); },
        set: (v) => { if (v === "dark" || v === "light") { writeStored(v); apply(v); } },
        toggle,
        clear: () => { try { localStorage.removeItem(STORAGE_KEY); } catch {} apply(resolveInitial()); },
    };
})();
