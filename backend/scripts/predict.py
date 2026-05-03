import joblib
import pandas as pd

# ── Load Saved Models ──────────────────────────────────────────────────────────
model1 = joblib.load(r"C:\Users\scvst\Desktop\ML Project\model1_env_impacts.pkl")
model2 = joblib.load(r"C:\Users\scvst\Desktop\ML Project\model2_ecotoxicity.pkl")

print("=" * 55)
print("   🌱 Rice Fertiliser Impact Predictor")
print("=" * 55)
print("Enter fertiliser application rates (in kg/ha):\n")

# ── Get User Inputs ────────────────────────────────────────────────────────────
while True:
    try:
        N  = float(input("  Nitrogen (N)   [120 - 150 kg]: "))
        P  = float(input("  Phosphorus (P) [ 40 -  60 kg]: "))
        K  = float(input("  Potassium (K)  [ 30 -  40 kg]: "))
        Zn = float(input("  Zinc (Zn)      [ 10 -  30 kg]: "))
        break
    except ValueError:
        print("\n  ⚠️  Please enter valid numbers. Try again.\n")

# ── Input Validation ───────────────────────────────────────────────────────────
ranges = {
    'N':  (120, 150),
    'P':  (40, 60),
    'K':  (30, 40),
    'Zn': (10, 30)
}

inputs = {'N': N, 'P': P, 'K': K, 'Zn': Zn}
out_of_range = []

for nutrient, (low, high) in ranges.items():
    if not (low <= inputs[nutrient] <= high):
        out_of_range.append(f"  ⚠️  {nutrient} = {inputs[nutrient]} is outside trained range ({low}-{high} kg)")

if out_of_range:
    print("\n" + "=" * 55)
    print("   ⚠️  WARNING — Out of Range Inputs Detected")
    print("=" * 55)
    for w in out_of_range:
        print(w)
    print("  Results may be unreliable. Use within trained ranges.")

# ── Predict ────────────────────────────────────────────────────────────────────
env_inputs = pd.DataFrame([[N, P, K, Zn]], columns=['N_rate', 'P_rate', 'K_rate', 'Zn_rate'])
eco_inputs = pd.DataFrame([[Zn]], columns=['Zn_rate'])

env_pred = model1.predict(env_inputs)[0]
eco_pred = model2.predict(eco_inputs)[0]

# ── Display Results ────────────────────────────────────────────────────────────
print("\n" + "=" * 55)
print("   📊 Predicted Environmental Impact Scores")
print("=" * 55)
print(f"  Global Warming              : {env_pred[0]:>12.4f} kg CO₂-eq")
print(f"  Freshwater Eutrophication   : {env_pred[1]:>12.6f} kg P-eq")
print(f"  Terrestrial Acidification   : {env_pred[2]:>12.4f} kg SO₂-eq")
print(f"  Terrestrial Ecotoxicity     : {eco_pred:>12.4f} CTUe")
print("=" * 55)

print("\nWant to try another combination? Run the script again!")