import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import GroupKFold, cross_val_score
from sklearn.metrics import r2_score

# ── Load Data ──────────────────────────────────────────────────────────────────
df = pd.read_csv(r"C:\Users\scvst\Desktop\ML Project\Trial Run 2 ML.csv")

X1 = df[['N_rate', 'P_rate', 'K_rate', 'Zn_rate']]
y1 = df[['global_warming', 'freshwater_eutrophication', 'terrestrial_acidification']]
X2 = df[['Zn_rate']]
y2 = df['terrestrial_ecotoxicity']
groups = df['sample_type']

model1 = RandomForestRegressor(n_estimators=100, random_state=42)
model2 = LinearRegression()
gkf = GroupKFold(n_splits=5)

targets = ['Global Warming', 'Freshwater Eutrophication', 'Terrestrial Acidification']

print("=" * 65)
print("MODEL 1 — Group K-Fold CV  N, P, K, Zn → Env Impacts")
print(f"{'Impact Category':<30} {'Mean R²':>10} {'Std R²':>10} {'Min R²':>10}")
print("=" * 65)

for i, name in enumerate(targets):
    scores = []
    for train_idx, test_idx in gkf.split(X1, y1.iloc[:, i], groups):
        model1.fit(X1.iloc[train_idx], y1.iloc[train_idx, i])
        preds = model1.predict(X1.iloc[test_idx])
        scores.append(r2_score(y1.iloc[test_idx, i], preds))
    scores = np.array(scores)
    print(f"{name:<30} {scores.mean():>10.4f} {scores.std():>10.4f} {scores.min():>10.4f}")

print("\n" + "=" * 65)
print("MODEL 2 — Group K-Fold CV  Zn → Ecotoxicity")
print(f"{'Impact Category':<30} {'Mean R²':>10} {'Std R²':>10} {'Min R²':>10}")
print("=" * 65)

scores2 = []
for train_idx, test_idx in gkf.split(X2, y2, groups):
    model2.fit(X2.iloc[train_idx], y2.iloc[train_idx])
    preds2 = model2.predict(X2.iloc[test_idx])
    scores2.append(r2_score(y2.iloc[test_idx], preds2))
scores2 = np.array(scores2)
print(f"{'Terrestrial Ecotoxicity':<30} {scores2.mean():>10.4f} {scores2.std():>10.4f} {scores2.min():>10.4f}")
print("=" * 65)