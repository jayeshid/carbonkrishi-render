"""Farmer-friendly multilingual inference engine (EN / HI / TE / MR).

Ported from app.py:1519-1798. Returns a structured dict per card
(title, body_html, color, refs) instead of a full HTML card; the
frontend wraps it in card chrome.

Allowed inline HTML in ``body_html``: <b>, <i>. These come from
hand-written templates (no user input), so direct innerHTML use
on the client is safe.
"""

from __future__ import annotations

from typing import Dict, List, Optional

from .constants import REFERENCES, SOURCES


# ── helpers ────────────────────────────────────────────────────────────────────

def _band(value: float, low: float, high: float):
    """Return (band, emoji, color) for a value relative to low/high thresholds."""
    if value < low:
        return ("low", "🟢", "#16a34a")
    if value > high:
        return ("high", "🔴", "#ef4444")
    return ("mid", "🟡", "#f59e0b")


def _t(en: str, hi: str, te: str, lang: str, mr: Optional[str] = None) -> str:
    # Marathi falls back to Hindi when explicit Marathi text is not provided.
    return {"en": en, "hi": hi, "te": te, "mr": mr if mr is not None else hi}.get(lang, en)


def _refs(*keys: str) -> List[Dict[str, str]]:
    """Return structured reference list for the frontend to render."""
    out = []
    for k in keys:
        name, url = SOURCES.get(k, (k, "#"))
        out.append({"key": k, "name": name, "url": url})
    return out


# ── main entry point ──────────────────────────────────────────────────────────

def build_inference_card(
    domain: str,
    value: float,
    ctx: Optional[dict] = None,
    lang: str = "en",
) -> Optional[Dict]:
    """Return {title, body_html, color, refs} for one inference card.

    Domains: gwp_total, ch4, n2o, no3, nh3, po4, ecotox, credits, blend_savings.
    Returns None if the domain is unknown.
    """
    R = REFERENCES
    ctx = ctx or {}
    title = ""
    body = ""
    color = "#0ea5e9"
    refs: List[Dict[str, str]] = []

    if domain == "gwp_total":
        km = value / R["co2_per_km_car"]
        trees = value / R["co2_per_tree_year"]
        band, _emoji, color = _band(value, R["rice_gwp_low"], R["rice_gwp_high"])
        title = _t("🌍 Global Warming",
                   "🌍 जलवायु प्रभाव (Global Warming)",
                   "🌍 వాతావరణ ప్రభావం (Global Warming)", lang,
                   mr="🌍 हवामान परिणाम (Global Warming)")
        irrig = ctx.get("irrigation", "")
        amendments_used = ctx.get("amendments_used", False)
        if band == "low":
            body = _t(
                f"Excellent — your <b>{value:,.0f} kg CO₂-eq/ha</b> is <b>below</b> the typical 3,000–7,000 kg/ha range for irrigated rice, equivalent to driving only <b>~{km:,.0f} km</b> or what <b>~{trees:.0f} trees</b> absorb in a year. Keep this low-input strategy and consider documenting it for CCTS soil-carbon credits.",
                f"बहुत अच्छा — आपका <b>{value:,.0f} kg CO₂-eq/ha</b> सिंचित धान के सामान्य 3,000–7,000 kg/ha स्तर से <b>कम</b> है, यानी कार से सिर्फ़ <b>~{km:,.0f} किमी</b> चलाने जितना या <b>~{trees:.0f} पेड़</b> एक साल में जितना सोखते हैं। इस कम-इनपुट तरीक़े को बनाए रखें और CCTS soil-carbon credits के लिए दस्तावेज़ बनाएँ।",
                f"అద్భుతం — మీ <b>{value:,.0f} kg CO₂-eq/ha</b> సాధారణ 3,000–7,000 kg/ha కంటే <b>తక్కువ</b>, అంటే కేవలం <b>~{km:,.0f} కి.మీ.</b> కారు నడిపినంత లేదా <b>~{trees:.0f} చెట్లు</b> ఒక ఏడాదిలో పీల్చుకునేంత. ఈ low-input విధానాన్ని కొనసాగించి CCTS soil-carbon credits కోసం రికార్డ్ చేయండి.",
                lang,
                mr=f"उत्तम — तुमचा <b>{value:,.0f} kg CO₂-eq/ha</b> सिंचित भातशेतीच्या नेहमीच्या 3,000–7,000 kg/ha पातळीपेक्षा <b>कमी</b> आहे, म्हणजे कारने फक्त <b>~{km:,.0f} किमी</b> चालवण्याइतके किंवा <b>~{trees:.0f} झाडे</b> वर्षभरात शोषून घेतात तितके. ही कमी-input पद्धत कायम ठेवा आणि CCTS soil-carbon credits साठी नोंद ठेवा.")
        elif band == "mid":
            tip_en = "switching to <b>AWD irrigation</b> cuts CH₄ by 30–70%, and splitting urea into 3 doses cuts N₂O ~20%"
            tip_hi = "<b>AWD सिंचाई</b> से CH₄ 30–70% कम होता है, और यूरिया को 3 बार में देने से N₂O ~20% कम होता है"
            tip_te = "<b>AWD పద్ధతి</b> తో CH₄ 30–70% తగ్గుతుంది, యూరియాను 3 సార్లు వేస్తే N₂O ~20% తగ్గుతుంది"
            tip_mr = "<b>AWD सिंचन</b> केल्याने CH₄ 30–70% कमी होते, आणि युरिया 3 हप्त्यांत दिल्याने N₂O ~20% कमी होते"
            if irrig == "Alternate Wetting and Drying":
                tip_en = "you're already using AWD — next gains come from neem-coated urea and 5 t/ha FYM substitution"
                tip_hi = "आप पहले से AWD कर रहे हैं — अगला लाभ neem-coated urea और 5 t/ha FYM से मिलेगा"
                tip_te = "మీరు ఇప్పటికే AWD వాడుతున్నారు — తదుపరి మెరుగు neem-coated urea మరియు 5 t/ha FYM వల్ల వస్తుంది"
                tip_mr = "तुम्ही आधीच AWD वापरत आहात — पुढचा फायदा neem-coated urea आणि 5 t/ha शेणखत बदलामुळे मिळेल"
            body = _t(
                f"Your <b>{value:,.0f} kg CO₂-eq/ha</b> sits in the <b>middle</b> of the typical 3,000–7,000 kg/ha range — equivalent to driving <b>~{km:,.0f} km</b>. There's clear room to improve: {tip_en}.",
                f"आपका <b>{value:,.0f} kg CO₂-eq/ha</b> सामान्य 3,000–7,000 kg/ha स्तर के <b>बीच</b> में है — कार से <b>~{km:,.0f} किमी</b> चलाने जितना। सुधार की गुंजाइश है: {tip_hi}।",
                f"మీ <b>{value:,.0f} kg CO₂-eq/ha</b> సాధారణ 3,000–7,000 kg/ha రేంజ్ <b>మధ్యలో</b> ఉంది — <b>~{km:,.0f} కి.మీ.</b> కారు నడిపినంత. మెరుగుపరచటానికి అవకాశం: {tip_te}.",
                lang,
                mr=f"तुमचा <b>{value:,.0f} kg CO₂-eq/ha</b> नेहमीच्या 3,000–7,000 kg/ha पातळीच्या <b>मध्यभागी</b> आहे — कारने <b>~{km:,.0f} किमी</b> चालवण्याइतके. सुधारणेला वाव आहे: {tip_mr}.")
        else:
            urgent_en = "adopt <b>AWD irrigation</b> (cuts CH₄ 30–70%), split urea into 3 doses, and substitute 20% synthetic N with FYM/compost"
            urgent_hi = "<b>AWD सिंचाई</b> अपनाएँ (CH₄ 30–70% कम), यूरिया को 3 बार में दें, और 20% सिंथेटिक N को FYM/compost से बदलें"
            urgent_te = "<b>AWD పద్ధతి</b> అవలంబించండి (CH₄ 30–70% తగ్గింపు), యూరియాను 3 సార్లు వేయండి, 20% synthetic N ను FYM/compost తో భర్తీ చేయండి"
            urgent_mr = "<b>AWD सिंचन</b> स्वीकारा (CH₄ 30–70% कमी), युरिया 3 हप्त्यांत द्या, आणि 20% synthetic N शेणखत/कंपोस्टने बदला"
            if not amendments_used:
                urgent_en += "; <b>start with 5 t/ha FYM</b> — biggest win for both emissions and soil carbon credits"
                urgent_hi += "; <b>5 t/ha FYM से शुरू करें</b> — उत्सर्जन और soil carbon credits दोनों के लिए सबसे बड़ा फ़ायदा"
                urgent_te += "; <b>5 t/ha FYM తో మొదలుపెట్టండి</b> — ఉద్గారాలు మరియు soil carbon credits రెండింటికీ అతిపెద్ద లాభం"
                urgent_mr += "; <b>5 t/ha शेणखताने सुरुवात करा</b> — उत्सर्जन आणि soil carbon credits दोन्हीसाठी सर्वात मोठा फायदा"
            body = _t(
                f"⚠️ Your <b>{value:,.0f} kg CO₂-eq/ha</b> is <b>above</b> the typical 3,000–7,000 kg/ha range — equivalent to driving <b>~{km:,.0f} km</b>. Priority actions: {urgent_en}.",
                f"⚠️ आपका <b>{value:,.0f} kg CO₂-eq/ha</b> सामान्य 3,000–7,000 kg/ha स्तर से <b>ऊपर</b> है — कार से <b>~{km:,.0f} किमी</b> चलाने जितना। प्राथमिकता: {urgent_hi}।",
                f"⚠️ మీ <b>{value:,.0f} kg CO₂-eq/ha</b> సాధారణ 3,000–7,000 kg/ha రేంజ్‌ను <b>మించింది</b> — <b>~{km:,.0f} కి.మీ.</b> కారు నడిపినంత. ప్రాధాన్యత: {urgent_te}.",
                lang,
                mr=f"⚠️ तुमचा <b>{value:,.0f} kg CO₂-eq/ha</b> नेहमीच्या 3,000–7,000 kg/ha पातळीपेक्षा <b>जास्त</b> आहे — कारने <b>~{km:,.0f} किमी</b> चालवण्याइतके. प्राथमिकता: {urgent_mr}.")
        refs = _refs("epa", "frontiers22", "ipcc_ar6", "gold_awm")

    elif domain == "ch4":
        co2eq = value * 27.9
        band, _e, color = _band(value, R["ch4_flooded_low"] * 0.4, R["ch4_flooded_high"] * 0.7)
        title = _t("🔥 Methane (CH₄)", "🔥 मीथेन (CH₄)", "🔥 మీథేన్ (CH₄)", lang, mr="🔥 मिथेन (CH₄)")
        irrig = ctx.get("irrigation", "")
        if irrig == "Alternate Wetting and Drying":
            extra_en = "You're already using AWD (cutting CH₄ by ~30–70% vs continuous flooding) — fine-tune drainage timing and avoid incorporating fresh straw under flood for an extra <b>~10–15%</b> reduction."
            extra_hi = "आप पहले से AWD कर रहे हैं (continuous flooding की तुलना में CH₄ ~30–70% कम) — drainage समय सुधारें और ताज़ा पुआल पानी में न मिलाएँ — <b>~10–15%</b> और कमी संभव।"
            extra_te = "మీరు ఇప్పటికే AWD వాడుతున్నారు (continuous flooding తో పోలిస్తే CH₄ ~30–70% తక్కువ) — drainage timing సరిచేసి, ఫ్రెష్ గడ్డిని నీటిలో కలపొద్దు — మరో <b>~10–15%</b> తగ్గింపు."
            extra_mr = "तुम्ही आधीच AWD वापरत आहात (continuous flooding च्या तुलनेत CH₄ ~30–70% कमी) — drainage वेळ सुधारा आणि ताजे पेंढा पाण्यात मिसळवू नका — आणखी <b>~10–15%</b> कपात शक्य."
        elif irrig == "Rainfed":
            extra_en = "Rainfed systems already have low CH₄ (~<b>60–80% lower</b> than continuously flooded paddies); focus on N management instead — split urea + neem-coating cuts N₂O by another ~20%."
            extra_hi = "Rainfed में CH₄ पहले से कम है (~<b>60–80%</b> लगातार सिंचित से कम); ध्यान N प्रबंधन पर दें — split urea + neem-coating से N₂O ~20% कम।"
            extra_te = "Rainfed లో CH₄ ఇప్పటికే తక్కువ (~<b>60–80%</b> continuous flooding కంటే తక్కువ); దృష్టి N management పై పెట్టండి — split urea + neem-coating తో N₂O ~20% తగ్గింపు."
            extra_mr = "Rainfed मध्ये CH₄ आधीच कमी आहे (continuous flooding पेक्षा ~<b>60–80% कमी</b>); N व्यवस्थापनावर लक्ष द्या — split urea + neem-coating ने N₂O ~20% कमी."
        else:
            extra_en = "Practising <b>AWD</b> — draining the field 2–3 times mid-season — is the single biggest CH₄ reducer (<b>cuts 30–70%</b>); adding 5 t/ha FYM instead of fresh straw saves another ~10%."
            extra_hi = "<b>AWD</b> अपनाना — मध्य-सीज़न में 2–3 बार पानी निकालना — CH₄ कम करने का सबसे बड़ा तरीक़ा है (<b>30–70% कमी</b>); ताज़ी पुआल की जगह 5 t/ha FYM डालने से ~10% और बचत।"
            extra_te = "<b>AWD</b> పద్ధతి — mid-season లో 2–3 సార్లు నీరు తీసేయడం — CH₄ తగ్గించడంలో అతిపెద్ద చర్య (<b>30–70% తగ్గింపు</b>); ఫ్రెష్ గడ్డికి బదులు 5 t/ha FYM వేస్తే మరో ~10% ఆదా."
            extra_mr = "<b>AWD</b> अवलंबणे — मध्य-हंगामात 2–3 वेळा पाणी काढणे — CH₄ कमी करण्याचा सर्वात मोठा मार्ग आहे (<b>30–70% कपात</b>); ताज्या पेंढ्याएवजी 5 t/ha शेणखत दिल्यास आणखी ~10% बचत."
        if band == "low":
            pct_below = (1 - value / 350) * 100
            body = _t(
                f"🟢 Your paddy releases <b>{value:,.1f} kg CH₄/ha/season</b> (= {co2eq:,.0f} kg CO₂-eq) — <b>well below</b> the IPCC default of 200–500 kg/ha for fully-flooded paddies (you're roughly <b>{pct_below:.0f}% lower</b> than the 350 kg/ha midpoint). {extra_en}",
                f"🟢 आपके खेत से <b>{value:,.1f} kg CH₄/ha/season</b> (= {co2eq:,.0f} kg CO₂-eq) — IPCC default 200–500 kg/ha से <b>बहुत कम</b> (350 kg/ha मिडपॉइंट से लगभग <b>{pct_below:.0f}% कम</b>)। {extra_hi}",
                f"🟢 మీ పొలం నుంచి <b>{value:,.1f} kg CH₄/ha/season</b> (= {co2eq:,.0f} kg CO₂-eq) — IPCC default 200–500 kg/ha కంటే <b>చాలా తక్కువ</b> (350 kg/ha మిడ్‌పాయింట్ కంటే ~<b>{pct_below:.0f}% తక్కువ</b>). {extra_te}",
                lang,
                mr=f"🟢 तुमच्या भातशेतीतून <b>{value:,.1f} kg CH₄/ha/season</b> (= {co2eq:,.0f} kg CO₂-eq) — IPCC default 200–500 kg/ha पेक्षा <b>खूप कमी</b> (350 kg/ha मध्यबिंदूपेक्षा सुमारे <b>{pct_below:.0f}% कमी</b>). {extra_mr}")
        elif band == "mid":
            saved_lo, saved_hi = value * 0.3, value * 0.7
            inr_lo = value * 0.5 * 27.9 * 0.0009 * 1000
            inr_hi = value * 0.7 * 27.9 * 0.0009 * 1000
            body = _t(
                f"Your paddy releases <b>{value:,.1f} kg CH₄/ha/season</b> (= {co2eq:,.0f} kg CO₂-eq), within the IPCC default 200–500 kg/ha range for flooded paddies. Adopting AWD here can <b>cut CH₄ by 30–70%</b> (≈ {saved_lo:,.0f}–{saved_hi:,.0f} kg/ha saved, worth ₹{inr_lo:,.0f}–₹{inr_hi:,.0f}/ha at CCTS rates). {extra_en}",
                f"आपके खेत से <b>{value:,.1f} kg CH₄/ha/season</b> (= {co2eq:,.0f} kg CO₂-eq) निकल रहा है, जो IPCC default 200–500 kg/ha के बीच है। AWD अपनाने से <b>CH₄ 30–70% कम</b> हो सकता है (≈ {saved_lo:,.0f}–{saved_hi:,.0f} kg/ha बचत, CCTS दर पर ₹{inr_lo:,.0f}–₹{inr_hi:,.0f}/ha)। {extra_hi}",
                f"మీ పొలం నుంచి <b>{value:,.1f} kg CH₄/ha/season</b> (= {co2eq:,.0f} kg CO₂-eq) విడుదలవుతోంది, IPCC default 200–500 kg/ha రేంజ్‌లో. AWD అవలంబిస్తే <b>CH₄ 30–70% తగ్గుతుంది</b> (≈ {saved_lo:,.0f}–{saved_hi:,.0f} kg/ha ఆదా, CCTS ధర వద్ద ₹{inr_lo:,.0f}–₹{inr_hi:,.0f}/ha). {extra_te}",
                lang,
                mr=f"तुमच्या भातशेतीतून <b>{value:,.1f} kg CH₄/ha/season</b> (= {co2eq:,.0f} kg CO₂-eq) बाहेर पडत आहे, जे IPCC default 200–500 kg/ha च्या मध्यवर्ती आहे. AWD स्वीकारल्यास <b>CH₄ 30–70% कमी</b> होऊ शकते (≈ {saved_lo:,.0f}–{saved_hi:,.0f} kg/ha बचत, CCTS दराने ₹{inr_lo:,.0f}–₹{inr_hi:,.0f}/ha). {extra_mr}")
        else:
            pct_above = (value / 350 - 1) * 100
            saved_lo, saved_hi = value * 0.3, value * 0.7
            body = _t(
                f"⚠️ Your paddy releases <b>{value:,.1f} kg CH₄/ha/season</b> (= {co2eq:,.0f} kg CO₂-eq) — <b>{pct_above:.0f}% above</b> the IPCC 350 kg/ha midpoint. {extra_en} Expect a <b>30–70% cut on adoption</b> (≈ {saved_lo:,.0f}–{saved_hi:,.0f} kg CH₄/ha saved).",
                f"⚠️ आपके खेत से <b>{value:,.1f} kg CH₄/ha/season</b> (= {co2eq:,.0f} kg CO₂-eq) — IPCC 350 kg/ha मिडपॉइंट से <b>{pct_above:.0f}% ज़्यादा</b>। {extra_hi} <b>30–70% तक कमी</b> संभव (≈ {saved_lo:,.0f}–{saved_hi:,.0f} kg CH₄/ha बचत)।",
                f"⚠️ మీ పొలం నుంచి <b>{value:,.1f} kg CH₄/ha/season</b> (= {co2eq:,.0f} kg CO₂-eq) — IPCC 350 kg/ha మిడ్‌పాయింట్ కంటే <b>{pct_above:.0f}% ఎక్కువ</b>. {extra_te} అమలుతో <b>30–70% తగ్గింపు</b> (≈ {saved_lo:,.0f}–{saved_hi:,.0f} kg CH₄/ha ఆదా).",
                lang,
                mr=f"⚠️ तुमच्या भातशेतीतून <b>{value:,.1f} kg CH₄/ha/season</b> (= {co2eq:,.0f} kg CO₂-eq) — IPCC 350 kg/ha मध्यबिंदूपेक्षा <b>{pct_above:.0f}% जास्त</b>. {extra_mr} अमलानंतर <b>30–70% कपात</b> शक्य (≈ {saved_lo:,.0f}–{saved_hi:,.0f} kg CH₄/ha बचत).")
        refs = _refs("ipcc_rice", "gold_awm", "ipcc_ar6")

    elif domain == "n2o":
        co2eq = value * 273
        _band_, emoji, color = _band(value, 1.0, 3.0)
        title = _t("⚡ Nitrous Oxide (N₂O)", "⚡ नाइट्रस ऑक्साइड (N₂O)", "⚡ నైట్రస్ ఆక్సైడ్ (N₂O)", lang,
                   mr="⚡ नायट्रस ऑक्साइड (N₂O)")
        n_high = ctx.get("synthetic_n", 0) > 145
        action_en = "Apply N in <b>3 splits</b> (basal + tillering + panicle initiation) and use neem-coated urea to cut this by ~20%"
        action_hi = "N को <b>3 बार में</b> दें (basal + tillering + panicle initiation) और neem-coated urea से ~20% कमी करें"
        action_te = "N ను <b>3 splits</b> లో (basal + tillering + panicle initiation) వేయండి, neem-coated urea తో ~20% తగ్గించండి"
        action_mr = "N <b>3 हप्त्यांत</b> द्या (basal + tillering + panicle initiation) आणि neem-coated urea वापरून ~20% कमी करा"
        if n_high:
            action_en = "Your N is high (>145 kg/ha) — first cut N to ~135 kg/ha, then split into 3 doses with neem-coated urea"
            action_hi = "आपका N ज़्यादा है (>145 kg/ha) — पहले N घटाकर ~135 kg/ha करें, फिर 3 बार में neem-coated urea से दें"
            action_te = "మీ N ఎక్కువగా ఉంది (>145 kg/ha) — ముందు N ను ~135 kg/ha కు తగ్గించి, 3 splits లో neem-coated urea తో వేయండి"
            action_mr = "तुमचा N जास्त आहे (>145 kg/ha) — प्रथम N कमी करून ~135 kg/ha करा, नंतर 3 हप्त्यांत neem-coated urea द्वारे द्या"
        body = _t(
            f"{emoji} Your N₂O emission of <b>{value:,.3f} kg/ha</b> equals <b>{co2eq:,.1f} kg CO₂-eq</b> (N₂O is 273× stronger than CO₂). IPCC default: ~1% of applied N is lost as N₂O. {action_en}.",
            f"{emoji} आपका N₂O उत्सर्जन <b>{value:,.3f} kg/ha</b> = <b>{co2eq:,.1f} kg CO₂-eq</b> (N₂O CO₂ से 273× ज़्यादा शक्तिशाली)। IPCC default: लगाए गए N का ~1% N₂O के रूप में निकलता है। {action_hi}।",
            f"{emoji} మీ N₂O ఉద్గారం <b>{value:,.3f} kg/ha</b> = <b>{co2eq:,.1f} kg CO₂-eq</b> (N₂O అనేది CO₂ కంటే 273× శక్తివంతం). IPCC default: వేసిన N లో ~1% N₂O గా పోతుంది. {action_te}.",
            lang,
            mr=f"{emoji} तुमचे N₂O उत्सर्जन <b>{value:,.3f} kg/ha</b> = <b>{co2eq:,.1f} kg CO₂-eq</b> (N₂O CO₂ पेक्षा 273× जास्त प्रभावी). IPCC default: दिलेल्या N च्या ~1% N₂O म्हणून वायुमंडळात जातो. {action_mr}.")
        refs = _refs("ipcc_ar6", "ipcc_2019")

    elif domain == "no3":
        mg_per_l = value / 1.0
        band, emoji, color = _band(mg_per_l, R["no3_bis_limit"] * 0.5, R["no3_bis_limit"])
        title = _t("💦 Nitrate (NO₃⁻)", "💦 नाइट्रेट (NO₃⁻)", "💦 నైట్రేట్ (NO₃⁻)", lang,
                   mr="💦 नायट्रेट (NO₃⁻)")
        if band == "high":
            warn_en = "⚠️ Above this risks <i>methaemoglobinaemia (\"blue-baby\")</i> in infants drinking groundwater nearby."
            warn_hi = "⚠️ इससे ऊपर पास के groundwater पीने वाले शिशुओं में <i>methaemoglobinaemia (\"blue-baby\")</i> का ख़तरा।"
            warn_te = "⚠️ ఇంతకన్నా ఎక్కువైతే చుట్టుపక్కల groundwater తాగే శిశువులకు <i>methaemoglobinaemia (\"blue-baby\")</i> ప్రమాదం."
            warn_mr = "⚠️ याच्यावर जवळचे groundwater पिणाऱ्या लहान बाळांमध्ये <i>methaemoglobinaemia (\"blue-baby\")</i> चा धोका."
        else:
            warn_en = "This stays below WHO/BIS limits, but cumulative N losses still reduce yield efficiency."
            warn_hi = "यह WHO/BIS सीमा से नीचे है, फिर भी कुल N नुक़सान yield efficiency कम करता है।"
            warn_te = "ఇది WHO/BIS పరిమితి కంటే తక్కువ, అయినా మొత్తం N నష్టం yield efficiency ను తగ్గిస్తుంది."
            warn_mr = "हे WHO/BIS मर्यादेखाली आहे, परंतु एकूण N नुकसान yield efficiency कमी करते."
        body = _t(
            f"{emoji} Approximately <b>{mg_per_l:.1f} mg/L</b> could leach into local groundwater (1,000 m³/ha runoff proxy). WHO drinking-water limit: <b>50 mg/L</b>; BIS IS 10500: <b>45 mg/L</b>. {warn_en} Avoid topdressing N before heavy rain and maintain bunds & vegetative buffers — these practices can <b>cut NO₃⁻ leaching by 30–50%</b>, and switching to split-N + neem-coated urea adds another <b>~20%</b> reduction.",
            f"{emoji} लगभग <b>{mg_per_l:.1f} mg/L</b> स्थानीय groundwater में जा सकता है (1,000 m³/ha runoff अनुमान)। WHO सीमा: <b>50 mg/L</b>; BIS IS 10500: <b>45 mg/L</b>। {warn_hi} भारी बारिश से पहले N न डालें और मेड़ व वनस्पति buffer बनाएँ — ये उपाय <b>NO₃⁻ leaching 30–50% तक कम</b> करते हैं, और split-N + neem-coated urea से <b>~20%</b> और कमी होती है।",
            f"{emoji} సుమారు <b>{mg_per_l:.1f} mg/L</b> స్థానిక groundwater లోకి వెళ్ళవచ్చు (1,000 m³/ha runoff అంచనా). WHO పరిమితి: <b>50 mg/L</b>; BIS IS 10500: <b>45 mg/L</b>. {warn_te} భారీ వర్షానికి ముందు N వేయొద్దు, బండ్లు మరియు vegetative buffers నిర్వహించండి — ఈ చర్యలు <b>NO₃⁻ leaching ను 30–50% తగ్గిస్తాయి</b>, split-N + neem-coated urea తో మరో <b>~20%</b> తగ్గింపు.",
            lang,
            mr=f"{emoji} सुमारे <b>{mg_per_l:.1f} mg/L</b> स्थानिक groundwater मध्ये झिरपू शकते (1,000 m³/ha runoff अंदाज). WHO मर्यादा: <b>50 mg/L</b>; BIS IS 10500: <b>45 mg/L</b>. {warn_mr} मोठ्या पावसाआधी N टाकू नका आणि बांध व वनस्पती buffers टिकवा — हे उपाय <b>NO₃⁻ झिरप 30–50% कमी</b> करतात, split-N + neem-coated urea ने आणखी <b>~20%</b> कपात.")
        refs = _refs("who_no3", "bis")

    elif domain == "nh3":
        _b, emoji, color = _band(value, 5, 15)
        title = _t("🌬️ Ammonia (NH₃)", "🌬️ अमोनिया (NH₃)", "🌬️ అమ్మోనియా (NH₃)", lang,
                   mr="🌬️ अमोनिया (NH₃)")
        body = _t(
            f"{emoji} Your <b>{value:,.2f} kg NH₃/ha</b> volatilises into air, contributing to <b>PM₂.₅ formation</b> (linked to respiratory illness) and acidifies soil over time, reducing nutrient availability. Incorporate urea within 24 h, avoid hot/windy mid-day spreading, and use neem-coated urea to cut NH₃ loss by 10–15%.",
            f"{emoji} आपका <b>{value:,.2f} kg NH₃/ha</b> हवा में मिलकर <b>PM₂.₅</b> बनाता है (श्वसन रोगों से जुड़ा) और मिट्टी को धीरे-धीरे अम्लीय करता है, पोषक उपलब्धता घटाता है। यूरिया 24 घंटे में मिट्टी में मिलाएँ, गर्म/तेज़ हवा वाले दिनों में न डालें, और neem-coated urea से NH₃ नुक़सान 10–15% कम करें।",
            f"{emoji} మీ <b>{value:,.2f} kg NH₃/ha</b> గాలిలో కలిసి <b>PM₂.₅</b> ఏర్పడటానికి దారితీస్తుంది (శ్వాసకోశ వ్యాధులతో సంబంధం), మట్టిని క్రమంగా అమ్లీయం చేస్తుంది, పోషక లభ్యత తగ్గుతుంది. యూరియాను 24 గంటల్లో మట్టిలో కలపండి, వేడి/గాలి ఎక్కువ ఉన్న middays లో వేయొద్దు, neem-coated urea తో NH₃ నష్టం 10–15% తగ్గించండి.",
            lang,
            mr=f"{emoji} तुमचे <b>{value:,.2f} kg NH₃/ha</b> हवेत मिसळून <b>PM₂.₅</b> तयार करते (श्वसन आजाराशी संबंधित) आणि माती हळूहळू आम्लधर्मी करते, पोषण कमी करते. युरिया 24 तासांत मातीत मिसळा, गरम/वार्‍याच्या दुपारी टाकू नका, neem-coated urea वापरून NH₃ नुकसान 10–15% कमी करा.")
        refs = _refs("who_air", "salca")

    elif domain == "po4":
        _b, emoji, color = _band(value, 0.05, 0.2)
        title = _t("💧 Phosphate (PO₄³⁻)", "💧 फॉस्फेट (PO₄³⁻)", "💧 ఫాస్ఫేట్ (PO₄³⁻)", lang,
                   mr="💧 फॉस्फेट (PO₄³⁻)")
        body = _t(
            f"{emoji} Your <b>{value:,.3f} kg PO₄/ha</b> runoff fuels <b>algal blooms</b> in ponds and irrigation tanks once concentrations exceed <b>0.1 mg P/L</b>, killing fish through oxygen depletion. Apply DAP only at recommended rates with <b>band placement (cuts P runoff by 40–60%)</b>, never just before predicted rainfall, and add 5 t/ha FYM to substitute <b>~25%</b> of synthetic P needs.",
            f"{emoji} आपका <b>{value:,.3f} kg PO₄/ha</b> runoff तालाबों में <b>algal blooms</b> पैदा करता है जब P >0.1 mg/L हो — मछलियाँ ऑक्सीजन की कमी से मरती हैं। DAP केवल अनुशंसित मात्रा में, <b>band placement (P runoff 40–60% कम)</b> से डालें, बारिश से पहले कभी नहीं, और 5 t/ha FYM से <b>~25%</b> सिंथेटिक P की जगह लें।",
            f"{emoji} మీ <b>{value:,.3f} kg PO₄/ha</b> runoff చెరువుల్లో <b>algal blooms</b> కు దారితీస్తుంది (P >0.1 mg/L వద్ద) — చేపలు ఆక్సిజన్ లేక చనిపోతాయి. DAP ను సిఫార్సు చేసిన మోతాదులో <b>band placement (P runoff 40–60% తగ్గింపు)</b> తో మాత్రమే వేయండి, వర్షానికి ముందు ఎప్పుడూ వేయొద్దు, 5 t/ha FYM తో <b>~25%</b> synthetic P ను భర్తీ చేయండి.",
            lang,
            mr=f"{emoji} तुमचा <b>{value:,.3f} kg PO₄/ha</b> runoff तळ्यांमध्ये P >0.1 mg/L झाल्यावर <b>शैवाळ फुलोरा (algal blooms)</b> निर्माण करतो — मासे ऑक्सिजनच्या कमतरतेने मरतात. DAP फक्त शिफारस केलेल्या प्रमाणात, <b>band placement (P runoff 40–60% कमी)</b> ने द्या; पावसाआधी कधीच टाकू नका, आणि 5 t/ha शेणखताने <b>~25%</b> synthetic P बदला.")
        refs = _refs("who_no3", "salca")

    elif domain == "ecotox":
        _b, emoji, color = _band(value, 5_000, 20_000)
        title = _t("☠️ Ecotoxicity", "☠️ इको-विषाक्तता (Ecotoxicity)", "☠️ ఎకో-టాక్సిసిటీ (Ecotoxicity)", lang,
                   mr="☠️ परिसंस्था-विषाक्तता (Ecotoxicity)")
        zn = ctx.get("zinc", 0)
        zn_note_en = f" Your Zn input is {zn:.0f} kg/ha — " + ("at safe levels." if zn <= 20 else "<b>above 20 kg/ha</b>; reduce unless soil-test confirms deficiency.")
        zn_note_hi = f" आपका Zn input {zn:.0f} kg/ha है — " + ("सुरक्षित स्तर पर।" if zn <= 20 else "<b>20 kg/ha से ऊपर</b>; soil-test से कमी की पुष्टि न हो तो घटाएँ।")
        zn_note_te = f" మీ Zn input {zn:.0f} kg/ha — " + ("సురక్షిత స్థాయిలో." if zn <= 20 else "<b>20 kg/ha కంటే ఎక్కువ</b>; soil-test లో deficiency నిర్ధారిస్తే తప్ప తగ్గించండి.")
        zn_note_mr = f" तुमचा Zn input {zn:.0f} kg/ha — " + ("सुरक्षित पातळीवर." if zn <= 20 else "<b>20 kg/ha पेक्षा जास्त</b>; soil-test मध्ये कमतरता सिद्ध झाल्याशिवाय कमी करा.")
        body = _t(
            f"{emoji} Your soil ecotoxicity score of <b>{value:,.0f} CTUe</b> is driven mostly by Zinc — Zn alone is <b>~120× more toxic per kg</b> than N, P, K (612.9 vs 2.7–5.2 CTUe/kg).{zn_note_en} Split Zn applications with FYM rather than concentrated dose — this can <b>cut ecotoxicity by 40–60%</b>, and substituting 5 t/ha FYM for synthetic Zn delivers another <b>~20%</b> reduction.",
            f"{emoji} आपका मिट्टी ecotoxicity स्कोर <b>{value:,.0f} CTUe</b> मुख्यतः Zinc से आता है — Zn प्रति kg <b>~120× अधिक विषाक्त</b> है N, P, K की तुलना में (612.9 vs 2.7–5.2 CTUe/kg)।{zn_note_hi} Zn को एक साथ नहीं, FYM के साथ split करके दें — इससे <b>ecotoxicity 40–60% कम</b> होती है, और 5 t/ha FYM से synthetic Zn बदलने पर <b>~20%</b> और कमी।",
            f"{emoji} మీ మట్టి ecotoxicity స్కోర్ <b>{value:,.0f} CTUe</b> ముఖ్యంగా Zinc వల్ల — Zn ప్రతి kg <b>~120× ఎక్కువ విషపూరితం</b> N, P, K కంటే (612.9 vs 2.7–5.2 CTUe/kg).{zn_note_te} Zn ను ఒకేసారి కాకుండా FYM తో splits లో వేయండి — దీనితో <b>ecotoxicity 40–60% తగ్గుతుంది</b>, 5 t/ha FYM తో synthetic Zn భర్తీ చేస్తే మరో <b>~20%</b> తగ్గింపు.",
            lang,
            mr=f"{emoji} तुमच्या मातीचा ecotoxicity स्कोर <b>{value:,.0f} CTUe</b> मुख्यतः Zinc मुळे — Zn प्रति kg <b>~120× जास्त विषारी</b> आहे N, P, K च्या तुलनेत (612.9 vs 2.7–5.2 CTUe/kg).{zn_note_mr} Zn एकाच वेळी न देता शेणखतासोबत splits मध्ये द्या — यामुळे <b>ecotoxicity 40–60% कमी</b> होते, आणि 5 t/ha शेणखताने synthetic Zn बदलल्यास आणखी <b>~20%</b> कपात.")
        refs = _refs("salca", "icar_inm")

    elif domain == "credits":
        inr_low = value * R["ccts_price_low"]
        inr_high = value * R["ccts_price_high"]
        bags = inr_high / (R["urea_price_inr_kg"] * 45)
        wages = inr_high / R["farm_wage_inr_day"]
        band, emoji, color = _band(value, 0.3, 1.0)
        title = _t("💎 Carbon Credit Potential", "💎 कार्बन क्रेडिट संभावना", "💎 కార్బన్ క్రెడిట్ సామర్థ్యం", lang,
                   mr="💎 कार्बन क्रेडिट क्षमता")
        if band == "low":
            tone_en = "is on the lower side. To reach a meaningful credit volume, raise FYM to ~10 t/ha and add 1.5–2 t/ha compost"
            tone_hi = "कम है। meaningful credits के लिए FYM बढ़ाकर ~10 t/ha करें और 1.5–2 t/ha compost जोड़ें"
            tone_te = "తక్కువగా ఉంది. meaningful credits కోసం FYM ను ~10 t/ha కు పెంచి, 1.5–2 t/ha compost జోడించండి"
            tone_mr = "कमी आहे. लक्षणीय credits साठी शेणखत ~10 t/ha पर्यंत वाढवा आणि 1.5–2 t/ha कंपोस्ट घाला"
        elif band == "mid":
            tone_en = "is moderate. Maintain a 3-season log of FYM/compost rates with photos and soil-test data"
            tone_hi = "मध्यम है। 3 सीज़न का FYM/compost log, फ़ोटो और soil-test data रखें"
            tone_te = "మధ్యస్థంగా ఉంది. 3 సీజన్ల FYM/compost log, ఫొటోలు, soil-test data నిర్వహించండి"
            tone_mr = "मध्यम आहे. 3 हंगामांचे शेणखत/कंपोस्टचे log, फोटो आणि soil-test data ठेवा"
        else:
            tone_en = "is strong. Register now with a verified aggregator (NCDEX / Verra / Gold Standard) to monetise this"
            tone_hi = "बहुत अच्छी है। अभी verified aggregator (NCDEX / Verra / Gold Standard) के साथ register करें"
            tone_te = "చాలా బలంగా ఉంది. వెంటనే verified aggregator (NCDEX / Verra / Gold Standard) తో register చేసుకోండి"
            tone_mr = "उत्तम आहे. आत्ताच verified aggregator (NCDEX / Verra / Gold Standard) सोबत नोंदणी करा"
        body = _t(
            f"{emoji} Your potential of <b>{value:.3f} t CO₂-eq/ha</b> translates to <b>₹{inr_low:,.0f}–₹{inr_high:,.0f}/ha</b> at the CCTS price band of ₹600–₹900/t — equivalent to <b>~{bags:.1f} bags of urea</b> or <b>~{wages:.0f} days of farm wages</b>. This {tone_en}.",
            f"{emoji} आपकी संभावना <b>{value:.3f} t CO₂-eq/ha</b> = <b>₹{inr_low:,.0f}–₹{inr_high:,.0f}/ha</b> (CCTS दर ₹600–₹900/t) — यानी <b>~{bags:.1f} bags यूरिया</b> या <b>~{wages:.0f} दिन की मज़दूरी</b>। यह {tone_hi}।",
            f"{emoji} మీ సామర్థ్యం <b>{value:.3f} t CO₂-eq/ha</b> = <b>₹{inr_low:,.0f}–₹{inr_high:,.0f}/ha</b> (CCTS ధర ₹600–₹900/t) — అంటే <b>~{bags:.1f} bags యూరియా</b> లేదా <b>~{wages:.0f} రోజుల వేతనం</b>. ఇది {tone_te}.",
            lang,
            mr=f"{emoji} तुमची क्षमता <b>{value:.3f} t CO₂-eq/ha</b> = <b>₹{inr_low:,.0f}–₹{inr_high:,.0f}/ha</b> (CCTS दर ₹600–₹900/t) — म्हणजे <b>~{bags:.1f} bags युरिया</b> किंवा <b>~{wages:.0f} दिवसांची मजुरी</b>. ही {tone_mr}.")
        refs = _refs("moefcc_ccts", "verra", "gold_awm")

    elif domain == "blend_savings":
        gwp_saved = ctx.get("gwp_saved", 0)
        cost_delta = ctx.get("cost_delta", 0)
        alpha = ctx.get("alpha", 0)
        title = _t("🌱 Blend Trade-off", "🌱 मिश्रण समझौता (Blend)", "🌱 Blend ట్రేడ్-ఆఫ్", lang,
                   mr="🌱 मिश्रण तडजोड (Blend)")
        if alpha == 0:
            color = "#0ea5e9"
            body = _t(
                "Move the slider above 0% to see how shifting toward organic affects emissions, cost, and credit potential.",
                "Slider को 0% से ऊपर ले जाएँ और देखें organic की ओर बढ़ने पर उत्सर्जन, लागत और credits कैसे बदलते हैं।",
                "Slider ను 0% పైన పెంచి organic వైపు మారితే ఉద్గారాలు, ఖర్చు మరియు credits ఎలా మారతాయో చూడండి.",
                lang,
                mr="Slider 0% च्या वर हलवा आणि organic कडे वळल्यावर उत्सर्जन, खर्च आणि credits कसे बदलतात ते पाहा.")
        elif gwp_saved <= 0:
            color = "#f59e0b"
            body = _t(
                f"⚠️ This blend <b>increases</b> GWP compared to fully conventional (Δ = +{abs(gwp_saved):,.1f} kg CO₂-eq/ha). Reduce organic input volumes or check for over-application of FYM (>15 t/ha drives high CH₄).",
                f"⚠️ यह मिश्रण पूरी तरह conventional की तुलना में GWP <b>बढ़ाता</b> है (Δ = +{abs(gwp_saved):,.1f} kg CO₂-eq/ha)। organic input घटाएँ या FYM over-application जाँचें (>15 t/ha CH₄ बढ़ाता है)।",
                f"⚠️ ఈ blend పూర్తి conventional తో పోలిస్తే GWP ను <b>పెంచుతుంది</b> (Δ = +{abs(gwp_saved):,.1f} kg CO₂-eq/ha). organic input తగ్గించండి లేదా FYM over-application తనిఖీ చేయండి (>15 t/ha వద్ద CH₄ పెరుగుతుంది).",
                lang,
                mr=f"⚠️ हे मिश्रण पूर्णतः conventional च्या तुलनेत GWP <b>वाढवते</b> (Δ = +{abs(gwp_saved):,.1f} kg CO₂-eq/ha). organic input कमी करा किंवा शेणखताचा अतिवापर तपासा (>15 t/ha मुळे CH₄ वाढतो).")
        else:
            km = gwp_saved / R["co2_per_km_car"]
            trees = gwp_saved / R["co2_per_tree_year"]
            ratio = cost_delta / gwp_saved if gwp_saved else 0
            if cost_delta < 0:
                color = "#16a34a"
                cost_phrase_en = f"AND <b>saves ₹{abs(cost_delta):,.0f}/ha</b>"
                cost_phrase_hi = f"और <b>₹{abs(cost_delta):,.0f}/ha बचाता</b> है"
                cost_phrase_te = f"మరియు <b>₹{abs(cost_delta):,.0f}/ha ఆదా</b> చేస్తుంది"
                cost_phrase_mr = f"आणि <b>₹{abs(cost_delta):,.0f}/ha वाचवते</b>"
            else:
                color = "#16a34a"
                cost_phrase_en = f"at an extra <b>₹{cost_delta:,.0f}/ha</b> (₹{ratio:,.1f} per kg CO₂ avoided)"
                cost_phrase_hi = f"<b>₹{cost_delta:,.0f}/ha अतिरिक्त</b> लागत पर (₹{ratio:,.1f}/kg CO₂)"
                cost_phrase_te = f"<b>₹{cost_delta:,.0f}/ha అదనపు</b> ఖర్చుతో (₹{ratio:,.1f}/kg CO₂)"
                cost_phrase_mr = f"<b>₹{cost_delta:,.0f}/ha जादा</b> खर्चात (₹{ratio:,.1f}/kg CO₂)"
            body = _t(
                f"This {int(alpha*100)}% organic blend avoids <b>{gwp_saved:,.1f} kg CO₂-eq/ha</b> ({km:,.0f} km of car driving, ~{trees:.1f} trees of yearly absorption) {cost_phrase_en}. Recover any cost gap via CCTS soil-carbon credits (Tab 3) or PM-PRANAM organic incentives.",
                f"यह {int(alpha*100)}% organic मिश्रण <b>{gwp_saved:,.1f} kg CO₂-eq/ha</b> बचाता है ({km:,.0f} किमी कार + ~{trees:.1f} पेड़/साल) {cost_phrase_hi}। लागत अंतर CCTS soil-carbon credits (Tab 3) या PM-PRANAM से वसूलें।",
                f"ఈ {int(alpha*100)}% organic blend <b>{gwp_saved:,.1f} kg CO₂-eq/ha</b> ఆదా చేస్తుంది ({km:,.0f} కి.మీ. కారు + ~{trees:.1f} చెట్లు/ఏడాది) {cost_phrase_te}. ఖర్చు తేడాను CCTS soil-carbon credits (Tab 3) లేదా PM-PRANAM తో recover చేయండి.",
                lang,
                mr=f"हे {int(alpha*100)}% organic मिश्रण <b>{gwp_saved:,.1f} kg CO₂-eq/ha</b> वाचवते ({km:,.0f} किमी कार + ~{trees:.1f} झाडे/वर्ष) {cost_phrase_mr}. खर्चातील फरक CCTS soil-carbon credits (Tab 3) किंवा PM-PRANAM द्वारे भरून काढा.")
        refs = _refs("epa", "moefcc_ccts", "frontiers22")

    else:
        return None

    if not body:
        return None

    return {
        "title": title,
        "body_html": body,
        "color": color,
        "refs": refs,
    }
