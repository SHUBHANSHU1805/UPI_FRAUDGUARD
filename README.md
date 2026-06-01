# 🛡 UPI FraudGuard

> Real-time UPI transaction fraud detection — RandomForest ML model · Flask JWT API · React dashboard

---

## 📁 Project Structure

```
upi_fraud_v2/
├── api/                        ← Flask backend
│   ├── app.py                  ← entry point (create_app)
│   ├── auth.py                 ← JWT auth blueprint
│   ├── predict.py              ← ML prediction blueprint
│   ├── database.py             ← SQLAlchemy + User model
│   ├── requirements.txt
│   └── .env.example
│
├── models/                     ← Trained ML artifacts (from train.py)
│   ├── fraud_model.pkl
│   ├── scaler.pkl
│   ├── features.json
│   └── model_summary.json
│
├── data/
│   ├── generate_dataset.py     ← synthetic data generator
│   └── upi_transactions.csv
│
├── train.py                    ← ML training pipeline
│
└── frontend/                   ← React + Vite
    ├── index.html
    ├── vite.config.js          ← proxies /api → Flask :5000
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx             ← router + protected routes
        ├── api.js              ← Axios + JWT auto-refresh interceptor
        ├── hooks/
        │   └── useAuth.js      ← global auth state
        ├── components/
        │   └── AuthCard.jsx    ← shared auth UI primitives
        └── pages/
            ├── LoginPage.jsx
            ├── RegisterPage.jsx
            └── DashboardPage.jsx
```

---

## 🚀 Setup — Step by Step

### Step 1 — Clone / navigate to project root

```bash
cd upi_fraud_v2
```

---

### Step 2 — Train the ML model (skip if models/ already exists)

```bash
# From project root
python data/generate_dataset.py   # creates data/upi_transactions.csv
python train.py                   # trains RandomForest + XGBoost, saves models/
```

You should see `models/fraud_model.pkl`, `scaler.pkl`, `features.json`, `model_summary.json` after this.

---

### Step 3 — Set up the Flask backend

```bash
cd api

# Create a virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and edit the env file
cp .env.example .env
# Open .env and change SECRET_KEY and JWT_SECRET_KEY to random strings
```

**Generate secure keys (run in Python):**
```python
import secrets
print(secrets.token_hex(32))   # run twice — one for each key
```

Paste the outputs into `.env`.

---

### Step 4 — Run the Flask backend

```bash
# Still inside api/ with venv active
python app.py
```

You should see:
```
🚀 UPI FraudGuard API → http://localhost:5000
```

The SQLite database (`fraudguard.db`) is created automatically on first run.

**Verify it works:**
```bash
curl http://localhost:5000/api/health
# → {"status":"ok","model":"RandomForest",...}
```

---

### Step 5 — Set up the React frontend

Open a **new terminal** (keep Flask running in the first one):

```bash
cd frontend

# Install Node dependencies
npm install

# Start the dev server
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in 300ms
  ➜  Local:   http://localhost:5173/
```

---

### Step 6 — Open the app

Go to **http://localhost:5173** in your browser.

1. Click **"Create one"** to register your first account
2. Log in → you land on the live dashboard
3. The JWT access token (1h) and refresh token (7d) are stored in `localStorage` automatically

---

## 🌐 API Reference

All prediction endpoints require `Authorization: Bearer <access_token>` header.

### Auth

| Method | Endpoint              | Body                          | Description           |
|--------|-----------------------|-------------------------------|-----------------------|
| POST   | `/api/auth/register`  | `{name, email, password}`     | Create account        |
| POST   | `/api/auth/login`     | `{email, password}`           | Get tokens            |
| POST   | `/api/auth/refresh`   | _(refresh token in header)_   | Rotate access token   |
| GET    | `/api/auth/me`        | —                             | Current user info     |
| POST   | `/api/auth/logout`    | —                             | Invalidate (client)   |

### Prediction

| Method | Endpoint               | Description                        |
|--------|------------------------|------------------------------------|
| GET    | `/api/health`          | Public health check                |
| GET    | `/api/model/info`      | Model metrics & feature list       |
| POST   | `/api/predict`         | Single transaction → fraud result  |
| POST   | `/api/predict/batch`   | Up to 500 transactions at once     |

**Single predict request body:**
```json
{
  "amount": 25000,
  "timestamp": "2024-06-15T02:30:00",
  "sender_bank": "SBI",
  "receiver_bank": "HDFC",
  "upi_app": "GPay",
  "merchant_category": "Transfer",
  "sender_account_age_days": 45,
  "txn_count_last_1h": 6,
  "txn_count_last_24h": 12,
  "avg_txn_amount_30d": 3000,
  "device_changed": 1,
  "new_receiver": 1,
  "location_mismatch": 1,
  "pin_attempts": 2,
  "is_international": 0,
  "failed_txn_last_24h": 2,
  "velocity_score": 0.75
}
```

**Response:**
```json
{
  "is_fraud": 1,
  "fraud_prob": 0.9341,
  "risk_level": "CRITICAL",
  "confidence": 0.9341
}
```

---

## 🔄 How JWT Auth Works (flow)

```
Register/Login
    └─→ Flask returns access_token (1h) + refresh_token (7d)
            └─→ React stores both in localStorage

Every API call
    └─→ Axios interceptor attaches: Authorization: Bearer <access_token>

On 401 (token expired)
    └─→ Axios interceptor hits POST /api/auth/refresh with refresh_token
            ├─→ Success → new access_token saved, original request retried
            └─→ Failure → user redirected to /login
```

---

## 🏗 Production Checklist

- [ ] Change `SECRET_KEY` and `JWT_SECRET_KEY` to strong random strings
- [ ] Switch `SQLALCHEMY_DATABASE_URI` to PostgreSQL
- [ ] Set `FLASK_DEBUG=0`
- [ ] Build React for production: `npm run build` (outputs `frontend/dist/`)
- [ ] Serve `dist/` via Nginx or Flask's `send_from_directory`
- [ ] Add HTTPS (Let's Encrypt / Cloudflare)
- [ ] Move tokens from `localStorage` to `httpOnly` cookies for XSS protection
- [ ] Add rate limiting (`flask-limiter`) on auth endpoints
- [ ] Store ML models in S3 / GCS instead of on disk

---

## 🧪 Test the API manually

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Test1234"}'

# Login
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Predict (single)
curl -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"amount":250000,"sender_bank":"SBI","receiver_bank":"HDFC","upi_app":"GPay","merchant_category":"Transfer","sender_account_age_days":30,"txn_count_last_1h":8,"txn_count_last_24h":20,"avg_txn_amount_30d":2000,"device_changed":1,"new_receiver":1,"location_mismatch":1,"pin_attempts":3,"is_international":0,"failed_txn_last_24h":3,"velocity_score":0.88,"timestamp":"2024-06-15T02:00:00"}'
```
