import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
import numpy as np
import joblib

# ── Load Data ──────────────────────────────────────────────────────────────────
path = input("Enter full path to your new CSV file:\n> ").strip()

df = pd.read_csv(path)
print(f"\n✅ Loaded {len(df)} rows successfully!")

# ── Features & Targets ─────────────────────────────────────────────────────────
X1 = df[['N_rate', 'P_rate', 'K_rate', 'Zn_rate']]
y1 = df[['global_warming', 'freshwater_eutrophication', 'terrestrial_acidification']]
X2 = df[['Zn_rate']]
y2 = df['terrestrial_ecotoxicity']

# ── Train ──────────────────────────────────────────────────────────────────────
X1_train, X1_test, y1_train, y1_test = train_test_split(X1, y1, test_size=0.2, random_state=42)
X2_train, X2_test, y2_train, y2_test = train_test_split(X2, y2, test_size=0.2, random_state=42)

print("\n⏳ Training models...")

model1 = RandomForestRegressor(n_estimators=100, random_state=42)
model1.fit(X1_train, y1_train)

model2 = LinearRegression()
model2.fit(X2_train, y2_train)

# ── Evaluate ───────────────────────────────────────────────────────────────────
y1_pred = model1.predict(X1_test)
y2_pred = model2.predict(X2_test)

targets = ['Global Warming', 'Freshwater Eutrophication',
           'Terrestrial Acidification', 'Terrestrial Ecotoxicity']

all_actual = list(y1_test.values.T) + [y2_test.values]
all_pred   = list(y1_pred.T)        + [y2_pred]

print("\n" + "=" * 65)
print("NEW MODEL PERFORMANCE")
print(f"{'Impact Category':<30} {'R²':>8} {'MAE':>12} {'RMSE':>12}")
print("=" * 65)
for i, name in enumerate(targets):
    r2   = r2_score(all_actual[i], all_pred[i])
    mae  = mean_absolute_error(all_actual[i], all_pred[i])
    rmse = np.sqrt(mean_squared_error(all_actual[i], all_pred[i]))
    print(f"{name:<30} {r2:>8.4f} {mae:>12.4f} {rmse:>12.4f}")
print("=" * 65)

# ── Save ───────────────────────────────────────────────────────────────────────
confirm = input("\nSave these models? This will overwrite the existing ones. (yes/no): ").strip().lower()

if confirm == 'yes':
    joblib.dump(model1, r"C:\Users\scvst\Desktop\ML Project\model1_env_impacts.pkl")
    joblib.dump(model2, r"C:\Users\scvst\Desktop\ML Project\model2_ecotoxicity.pkl")
    print("\n✅ Models saved! Your predictor is now updated.")
else:
    print("\n❌ Models not saved. Old models still in place.")