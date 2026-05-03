// Thin fetch wrapper. Same-origin by default; override CK_API_BASE on window for cross-origin.

const BASE = (typeof window !== "undefined" && window.CK_API_BASE) || "";

async function call(path, opts = {}) {
    const res = await fetch(BASE + path, {
        headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
        ...opts,
    });
    if (!res.ok) {
        let detail;
        try { detail = (await res.json()).detail; } catch { detail = res.statusText; }
        throw new Error(`API ${res.status}: ${detail}`);
    }
    return res.json();
}

const post = (path, body) => call(path, { method: "POST", body: JSON.stringify(body) });
const get  = (path)       => call(path, { method: "GET" });

export const api = {
    meta:               ()      => get("/api/meta"),
    predictConventional: (body) => post("/api/predict/conventional", body),
    predictOrganic:      (body) => post("/api/predict/organic", body),
    blend:               (body) => post("/api/blend", body),
    fieldEmissions:      (body) => post("/api/emissions/field", body),
    socCredits:          (body) => post("/api/credits/soc", body),
    inferenceCard:       (body) => post("/api/inference/card", body),
};

// One-shot meta loader, cached for the session.
let _metaPromise = null;
export function loadMeta() {
    if (!_metaPromise) _metaPromise = api.meta();
    return _metaPromise;
}
