// Top-level bootstrap.

import { initTabs } from "./tabs.js";
import { initTab0 } from "./tab0-overview.js";
import { initTab1 } from "./tab1-predictor.js";
import { initTab2 } from "./tab2-gradient.js";
import { initTab3 } from "./tab3-credits.js";
import { initTab4 } from "./tab4-emissions.js";
import { initTab5 } from "./tab5-info.js";

function boot() {
  initTabs();
  initTab0();
  initTab1();
  initTab2();
  initTab3();
  initTab4();
  initTab5();
  initChartResize();
}

// Force every Plotly chart to refit its container on resize / orientation
// change / sidebar toggle so charts never overflow or stay clipped.
function initChartResize() {
  if (typeof Plotly === "undefined") return;
  let raf = 0;
  const resizeAll = () => {
    document
      .querySelectorAll(".ck-chart, .ck-speedo, .js-plotly-plot")
      .forEach((el) => {
        try {
          Plotly.Plots.resize(el);
        } catch (_) {
          /* not a plotly node yet */
        }
      });
  };
  const onResize = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(resizeAll);
  };
  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", onResize);
  // Re-fit when sidebar toggles (mobile drawer changes available width).
  new MutationObserver(onResize).observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
