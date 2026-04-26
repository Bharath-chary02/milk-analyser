from flask import Flask, request, jsonify
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score

app = Flask(__name__)

# ─────────────────────────────────────────────
#  Reproducible dataset generation
#  Uses numpy seeded RNG → true randomness, no linear sequences
# ─────────────────────────────────────────────
rng = np.random.default_rng(seed=42)

def make_pure(n=100):
    ph   = rng.uniform(6.4, 6.8, n).round(2)
    temp = rng.uniform(20.0, 40.0, n).round(1)
    cond = rng.uniform(400, 580, n).round(0)
    return np.column_stack([ph, temp, cond])

def make_watered(n=100):
    # 90 core samples: conductivity skewed LOW (beta a=1,b=3 → most values near 250–400)
    ph_c   = rng.uniform(6.8, 7.2, 90).round(2)
    temp_c = rng.uniform(20.0, 40.0, 90).round(1)
    cond_c = (250 + rng.beta(1, 3, 90) * (500 - 250)).round(0)   # skewed below ~380

    # 10 borderline samples (realistic tap-water overlap zone: 500–540)
    ph_b   = rng.uniform(6.85, 7.15, 10).round(2)
    temp_b = rng.uniform(20.0, 40.0, 10).round(1)
    cond_b = rng.uniform(500, 542, 10).round(0)

    ph   = np.concatenate([ph_c,   ph_b])
    temp = np.concatenate([temp_c, temp_b])
    cond = np.concatenate([cond_c, cond_b])
    return np.column_stack([ph, temp, cond])

def make_urea(n=100):
    # 90 core samples: conductivity skewed HIGH (beta a=3,b=1 → most values near 620–710)
    ph_c   = rng.uniform(6.8, 7.3, 90).round(2)
    temp_c = rng.uniform(20.0, 40.0, 90).round(1)
    cond_c = (558 + rng.beta(3, 1, 90) * (710 - 558)).round(0)   # skewed above ~630

    # 10 borderline samples (overlap zone: 542–565)
    ph_b   = rng.uniform(6.9, 7.2, 10).round(2)
    temp_b = rng.uniform(20.0, 40.0, 10).round(1)
    cond_b = rng.uniform(542, 566, 10).round(0)

    ph   = np.concatenate([ph_c,   ph_b])
    temp = np.concatenate([temp_c, temp_b])
    cond = np.concatenate([cond_c, cond_b])
    return np.column_stack([ph, temp, cond])

def make_detergent(n=100):
    ph   = rng.uniform(7.5, 9.0, n).round(2)
    temp = rng.uniform(20.0, 40.0, n).round(1)
    cond = rng.uniform(800, 1500, n).round(0)
    return np.column_stack([ph, temp, cond])

X_pure      = make_pure()
X_watered   = make_watered()
X_urea      = make_urea()
X_detergent = make_detergent()

X_train = np.vstack([X_pure, X_watered, X_urea, X_detergent]).tolist()
y_train = (
    ['Pure']      * 100 +
    ['Watered']   * 100 +
    ['Urea']      * 100 +
    ['Detergent'] * 100
)

# ─────────────────────────────────────────────
#  Train model
# ─────────────────────────────────────────────
model = RandomForestClassifier(
    n_estimators=300,
    max_depth=12,
    min_samples_leaf=2,      # prevents over-fitting on borderline samples
    class_weight='balanced',
    random_state=42
)
model.fit(X_train, y_train)

scores = cross_val_score(model, X_train, y_train, cv=5, scoring='f1_macro')
print(f"CV F1-macro: {scores.mean()*100:.2f}% (+/- {scores.std()*100:.2f}%)")

# ─────────────────────────────────────────────
#  Prediction API
# ─────────────────────────────────────────────
@app.route('/predict', methods=['POST'])
def predict():
    try:
        data        = request.get_json()
        ph          = float(data['ph'])
        temperature = float(data['temperature'])
        conductivity= float(data['conductivity'])

        features    = np.array([[ph, temperature, conductivity]])
        prediction  = model.predict(features)[0]
        proba       = model.predict_proba(features)[0]
        confidence  = round(float(max(proba)) * 100, 2)

        # expose all class probabilities for debugging
        class_probs = {
            cls: round(float(p) * 100, 2)
            for cls, p in zip(model.classes_, proba)
        }

        return jsonify({
            'result':      prediction,
            'confidence':  confidence,
            'class_probs': class_probs
        })
    except (KeyError, ValueError, TypeError) as e:
        return jsonify({'error': str(e)}), 400

# ─────────────────────────────────────────────
#  Health check
# ─────────────────────────────────────────────
@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ML service running', 'classes': model.classes_.tolist()})

if __name__ == '__main__':
    app.run(port=5000, debug=True)