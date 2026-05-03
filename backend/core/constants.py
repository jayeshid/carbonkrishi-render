"""Domain constants — input ranges, cost rates, impact data, references.

Extracted verbatim from the Streamlit ``app.py`` so behavior is identical.
"""

CONV_RANGES = {
    "N": (120, 150),
    "P": (40, 60),
    "K": (30, 40),
    "Zn": (10, 30),
}

ORG_RANGES = {
    "Manure": (5000, 15000),
    "Compost": (1000, 2000),
}

# Indian market rates (INR/kg)
COST_RATES = {
    "N_synthetic":  6.5,
    "P_synthetic":  28.0,
    "K_synthetic":  15.0,
    "Zn_synthetic": 120.0,
    "Manure":       0.8,
    "Compost":      3.5,
}

# Per-kg environmental footprint (computed independently in OpenLCA)
IMPACT_DATA = {
    "Input": ["Nitrogen (N)", "Phosphorus (P)", "Potassium (K)", "Zinc (Zn)"],
    "Global Warming (kg CO2-eq)": [4.964134, 2.906595, 3.016340, 0.777299],
    "Terrestrial Acidification (kg SO2-eq)": [0.021555, 0.014359, 0.012404, 0.006452],
    "Freshwater Eutrophication (kg P-eq)": [0.001469, 0.001000, 0.000679, 0.000460],
    "Terrestrial Ecotoxicity (CTUe)": [5.186745, 4.168297, 2.671163, 612.915864],
}

EMISSION_COLORS = {
    "CH4": "#1f77b4",
    "N2O": "#ff7f0e",
    "NO3": "#2ca02c",
    "NH3": "#d62728",
    "PO4": "#9467bd",
}

IMPACT_LABELS = [
    "Global Warming",
    "Freshwater Eutrophication",
    "Terrestrial Acidification",
    "Terrestrial Ecotoxicity",
]

IMPACT_UNITS = ["kg CO2-eq", "kg P-eq", "kg SO2-eq", "CTUe"]

# Numeric reference values used by the inference engine
REFERENCES = {
    "co2_per_km_car":     0.244,
    "co2_per_tree_year":  60.0,
    "co2_per_l_diesel":   2.69,
    "co2_per_lpg_cyl":    43.0,
    "rice_gwp_low":       3000,
    "rice_gwp_high":      7000,
    "ch4_flooded_low":    200,
    "ch4_flooded_high":   500,
    "no3_who_limit":      50.0,
    "no3_bis_limit":      45.0,
    "po4_algae_thresh":   0.1,
    "urea_price_inr_kg":  6.5,
    "farm_wage_inr_day":  350,
    "ccts_price_low":     600,
    "ccts_price_high":    900,
}

# Citation registry — (display name, URL)
SOURCES = {
    "epa":         ("EPA GHG Equivalencies Calculator (2024)",
                    "https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references"),
    "ipcc_ar6":    ("IPCC AR6 Working Group I (2021)",
                    "https://www.ipcc.ch/report/ar6/wg1/"),
    "ipcc_2019":   ("IPCC 2019 Refinement (N2O EF)",
                    "https://www.ipcc-nggip.iges.or.jp/public/2019rf/"),
    "ipcc_rice":   ("IPCC - Methane Emissions from Rice Cultivation",
                    "https://www.ipcc-nggip.iges.or.jp/public/gl/guidelin/ch4ref5.pdf"),
    "frontiers22": ("Frontiers in Sustainable Food Systems (2022)",
                    "https://www.frontiersin.org/journals/sustainable-food-systems/articles/10.3389/fsufs.2022.868479/full"),
    "who_no3":     ("WHO Nitrate/Nitrite Drinking-water Fact Sheet (2022)",
                    "https://cdn.who.int/media/docs/default-source/wash-documents/water-safety-and-quality/chemical-fact-sheets-2022/nitrate-and-nitrite-fact-sheet-2022.pdf"),
    "bis":         ("BIS IS 10500:2012 - Indian Drinking Water Standard",
                    "https://www.bis.gov.in/"),
    "gold_awm":    ("Gold Standard - AWD Methane Reduction Methodology",
                    "https://globalgoals.goldstandard.org/standards/437_V1.0_LUF_AGR_Methane-emission-reduction-by-AWM-practice-in-rice-cultivation.pdf"),
    "who_air":     ("WHO Global Air Quality Guidelines (2021)",
                    "https://www.who.int/publications/i/item/9789240034228"),
    "usda":        ("USDA Forest Service - Urban Tree Database",
                    "https://www.fs.usda.gov/treesearch/pubs/52933"),
    "moefcc_ccts": ("MoEFCC / BEE - Carbon Credit Trading Scheme (2024)",
                    "https://moef.gov.in/"),
    "verra":       ("Verra VM0042 - Improved Agricultural Land Management",
                    "https://verra.org/methodologies/vm0042-methodology-for-improved-agricultural-land-management-v2-0/"),
    "icar_inm":    ("ICAR - Integrated Nutrient Management",
                    "https://icar.org.in/"),
    "salca":       ("SALCA - Swiss Agricultural LCA Methodology",
                    "https://www.agroscope.admin.ch/agroscope/en/home/topics/environment-resources/life-cycle-assessment/salca.html"),
}
