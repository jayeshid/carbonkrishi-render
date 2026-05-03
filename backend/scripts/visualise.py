import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split

# ── Load Data & Train Models ───────────────────────────────────────────────────
df = pd.read_csv(r"C:\Users\scvst\Desktop\ML Project\Trial Run 2 ML.csv")

X1 = df[['N_rate', 'P_rate', 'K_rate', 'Zn_rate']]
y1 = df[['global_warming', 'freshwater_eutrophication', 'terrestrial_acidification']]
X2 = df[['Zn_rate']]
y2 = df['terrestrial_ecotoxicity']

X1_train, X1_test, y1_train, y1_test = train_test_split(X1, y1, test_size=0.2, random_state=42)
X2_train, X2_test, y2_train, y2_test = train_test_split(X2, y2, test_size=0.2, random_state=42)

model1 = RandomForestRegressor(n_estimators=100, random_state=42)
model1.fit(X1_train, y1_train)
y1_pred = model1.predict(X1_test)

model2 = LinearRegression()
model2.fit(X2_train, y2_train)
y2_pred = model2.predict(X2_test)

targets     = ['Global Warming', 'Freshwater Eutrophication', 'Terrestrial Acidification', 'Terrestrial Ecotoxicity']
units       = ['kg CO₂-eq', 'kg P-eq', 'kg SO₂-eq', 'CTUe']
all_actual  = list(y1_test.values.T) + [y2_test.values]
all_pred    = list(y1_pred.T)        + [y2_pred]

# ── PLOT 1: Predicted vs Actual ────────────────────────────────────────────────
fig, axes = plt.subplots(2, 2, figsize=(12, 10))
fig.suptitle('Predicted vs Actual — All Impact Categories', fontsize=15, fontweight='bold')
axes = axes.flatten()

for i in range(4):
    ax = axes[i]
    ax.scatter(all_actual[i], all_pred[i], alpha=0.5, color='steelblue', edgecolors='white', s=40)
    mn = min(all_actual[i].min(), all_pred[i].min())
    mx = max(all_actual[i].max(), all_pred[i].max())
    ax.plot([mn, mx], [mn, mx], 'r--', linewidth=1.5, label='Perfect Fit')
    ax.set_xlabel(f'Actual ({units[i]})')
    ax.set_ylabel(f'Predicted ({units[i]})')
    ax.set_title(targets[i])
    ax.legend()

plt.tight_layout()
plt.savefig(r"C:\Users\scvst\Desktop\ML Project\plot1_predicted_vs_actual.png", dpi=150)
print("✅ Saved: plot1_predicted_vs_actual.png")

# ── PLOT 2: Feature Importance ─────────────────────────────────────────────────
fig, axes = plt.subplots(1, 3, figsize=(14, 5))
fig.suptitle('Feature Importance — N, P, K, Zn per Impact Category', fontsize=13, fontweight='bold')
features = ['N', 'P', 'K', 'Zn']
colors   = ['#2ecc71', '#3498db', '#e67e22', '#9b59b6']

for i, name in enumerate(['Global Warming', 'Freshwater Eutrophication', 'Terrestrial Acidification']):
    m = RandomForestRegressor(n_estimators=100, random_state=42)
    m.fit(X1, y1.iloc[:, i])
    axes[i].bar(features, m.feature_importances_, color=colors)
    axes[i].set_title(name)
    axes[i].set_ylabel('Importance')
    axes[i].set_ylim(0, 1)
    for j, v in enumerate(m.feature_importances_):
        axes[i].text(j, v + 0.02, f'{v:.2f}', ha='center', fontsize=10)

plt.tight_layout()
plt.savefig(r"C:\Users\scvst\Desktop\ML Project\plot2_feature_importance.png", dpi=150)
print("✅ Saved: plot2_feature_importance.png")

# ── PLOT 3: Input vs Impact Line Plots ────────────────────────────────────────
fig, axes = plt.subplots(2, 2, figsize=(12, 10))
fig.suptitle('Fertiliser Input vs Predicted Impact', fontsize=14, fontweight='bold')

# N vs GWP
n_range = np.linspace(120, 150, 100)
base = {'P': 50, 'K': 35, 'Zn': 20}
inputs_n = pd.DataFrame({'N_rate': n_range, 'P_rate': base['P'], 'K_rate': base['K'], 'Zn_rate': base['Zn']})
gwp_pred = model1.predict(inputs_n)[:, 0]
axes[0,0].plot(n_range, gwp_pred, color='#e74c3c', linewidth=2)
axes[0,0].set_xlabel('Nitrogen (kg/ha)')
axes[0,0].set_ylabel('Global Warming (kg CO₂-eq)')
axes[0,0].set_title('N vs Global Warming')

# P vs Eutrophication
p_range = np.linspace(40, 60, 100)
inputs_p = pd.DataFrame({'N_rate': 135, 'P_rate': p_range, 'K_rate': base['K'], 'Zn_rate': base['Zn']})
eu_pred = model1.predict(inputs_p)[:, 1]
axes[0,1].plot(p_range, eu_pred, color='#3498db', linewidth=2)
axes[0,1].set_xlabel('Phosphorus (kg/ha)')
axes[0,1].set_ylabel('Freshwater Eutrophication (kg P-eq)')
axes[0,1].set_title('P vs Freshwater Eutrophication')

# K vs Acidification
k_range = np.linspace(30, 40, 100)
inputs_k = pd.DataFrame({'N_rate': 135, 'P_rate': 50, 'K_rate': k_range, 'Zn_rate': base['Zn']})
ac_pred = model1.predict(inputs_k)[:, 2]
axes[1,0].plot(k_range, ac_pred, color='#2ecc71', linewidth=2)
axes[1,0].set_xlabel('Potassium (kg/ha)')
axes[1,0].set_ylabel('Terrestrial Acidification (kg SO₂-eq)')
axes[1,0].set_title('K vs Terrestrial Acidification')

# Zn vs Ecotoxicity
zn_range = np.linspace(10, 30, 100)
inputs_zn = pd.DataFrame({'Zn_rate': zn_range})
eco_pred_line = model2.predict(inputs_zn)
axes[1,1].plot(zn_range, eco_pred_line, color='#9b59b6', linewidth=2)
axes[1,1].set_xlabel('Zinc (kg/ha)')
axes[1,1].set_ylabel('Terrestrial Ecotoxicity (CTUe)')
axes[1,1].set_title('Zn vs Terrestrial Ecotoxicity')

plt.tight_layout()
plt.savefig(r"C:\Users\scvst\Desktop\ML Project\plot3_input_vs_impact.png", dpi=150)
print("✅ Saved: plot3_input_vs_impact.png")

plt.show()
print("\n✅ All 3 plots generated and saved to your ML Project folder!")