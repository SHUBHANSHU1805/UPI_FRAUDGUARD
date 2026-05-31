"""
Predict Blueprint  (JWT-protected)
POST /api/predict           → single transaction
POST /api/predict/batch     → up to 500 transactions
GET  /api/health            → public health check
GET  /api/model/info        → model metadata (protected)
"""

import os, json, logging
from datetime import datetime

import numpy  as np
import pandas as pd
import joblib
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

predict_bp = Blueprint("predict", __name__)
log = logging.getLogger(__name__)

# ── Load ML artifacts ─────────────────────────────────────────────────────────
BASE   = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.join(BASE, "..", "models")

model  = joblib.load(os.path.join(MODELS, "fraud_model.pkl"))
scaler = joblib.load(os.path.join(MODELS, "scaler.pkl"))
with open(os.path.join(MODELS, "features.json"))      as f: FEATURES      = json.load(f)
with open(os.path.join(MODELS, "model_summary.json")) as f: MODEL_SUMMARY = json.load(f)

BANKS = ["SBI","HDFC","ICICI","Axis","Kotak","PNB","BOB","Canara"]
APPS  = ["GPay","PhonePe","Paytm","BHIM","Amazon Pay","WhatsApp Pay"]
CATS  = ["Grocery","Food","Travel","Electronics","Clothing","Utility",
         "Medical","Education","Entertainment","Transfer"]

def _enc(val, lst):
    try:    return lst.index(val)
    except: return len(lst)

# ── Feature engineering (mirrors train.py exactly) ────────────────────────────
def build_features(txn: dict) -> pd.DataFrame:
    ts  = datetime.fromisoformat(txn.get("timestamp", datetime.utcnow().isoformat()))
    amt = float(txn.get("amount", 0))
    avg = float(txn.get("avg_txn_amount_30d", amt or 1))
    h   = ts.hour
    row = {
        "log_amount"              : np.log1p(amt),
        "transaction_hour"        : h,
        "is_night_txn"            : int(h < 6 or h >= 22),
        "device_changed"          : int(txn.get("device_changed", 0)),
        "new_receiver"            : int(txn.get("new_receiver", 0)),
        "sender_account_age_days" : int(txn.get("sender_account_age_days", 365)),
        "txn_count_last_1h"       : int(txn.get("txn_count_last_1h", 1)),
        "txn_count_last_24h"      : int(txn.get("txn_count_last_24h", 5)),
        "location_mismatch"       : int(txn.get("location_mismatch", 0)),
        "pin_attempts"            : int(txn.get("pin_attempts", 1)),
        "is_international"        : int(txn.get("is_international", 0)),
        "failed_txn_last_24h"     : int(txn.get("failed_txn_last_24h", 0)),
        "velocity_score"          : float(txn.get("velocity_score", 0.1)),
        "hour"                    : h,
        "day_of_week"             : ts.weekday(),
        "is_weekend"              : int(ts.weekday() >= 5),
        "month"                   : ts.month,
        "amount_to_avg"           : amt / (avg + 1),
        "is_large_txn"            : int(amt > 50000),
        "txn_ratio_1h_24h"        : int(txn.get("txn_count_last_1h", 1)) /
                                    (int(txn.get("txn_count_last_24h", 5)) + 1),
        "risk_composite"          : (
            float(txn.get("velocity_score",    0.1))  * 0.35 +
            int(txn.get("location_mismatch",   0))    * 0.20 +
            int(txn.get("device_changed",      0))    * 0.20 +
            int(txn.get("new_receiver",        0))    * 0.15 +
            (int(txn.get("pin_attempts",       1)) - 1) / 2 * 0.10
        ),
        "sender_bank_enc"         : _enc(txn.get("sender_bank",        "SBI"),      BANKS),
        "receiver_bank_enc"       : _enc(txn.get("receiver_bank",      "HDFC"),     BANKS),
        "upi_app_enc"             : _enc(txn.get("upi_app",            "GPay"),     APPS),
        "merchant_category_enc"   : _enc(txn.get("merchant_category",  "Transfer"), CATS),
    }
    return pd.DataFrame([row])[FEATURES]

def _predict_one(txn: dict) -> dict:
    X    = build_features(txn)
    Xs   = scaler.transform(X)
    prob = float(model.predict_proba(Xs)[0][1])
    pred = int(prob >= 0.50)
    risk = ("LOW" if prob < 0.30 else
            "MEDIUM" if prob < 0.60 else
            "HIGH"   if prob < 0.85 else "CRITICAL")
    return {
        "is_fraud"   : pred,
        "fraud_prob" : round(prob, 4),
        "risk_level" : risk,
        "confidence" : round(max(prob, 1 - prob), 4),
    }

# ── Routes ────────────────────────────────────────────────────────────────────
@predict_bp.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": MODEL_SUMMARY["model_name"],
                    "timestamp": datetime.utcnow().isoformat()})

@predict_bp.route("/model/info", methods=["GET"])
@jwt_required()
def model_info():
    return jsonify(MODEL_SUMMARY)

@predict_bp.route("/predict", methods=["POST"])
@jwt_required()
def predict():
    data = request.get_json(force=True)
    if not data:
        return jsonify({"error": "Empty body"}), 400
    try:
        result = _predict_one(data)
        log.info(f"[user:{get_jwt_identity()}] fraud={result['is_fraud']} "
                 f"prob={result['fraud_prob']:.3f} risk={result['risk_level']}")
        return jsonify(result)
    except Exception as e:
        log.exception("Prediction error")
        return jsonify({"error": str(e)}), 500

@predict_bp.route("/predict/batch", methods=["POST"])
@jwt_required()
def predict_batch():
    data = request.get_json(force=True) or {}
    txns = data.get("transactions", [])
    if not txns:
        return jsonify({"error": "No transactions provided"}), 400
    if len(txns) > 500:
        return jsonify({"error": "Max 500 per batch"}), 400
    try:
        results     = [_predict_one(t) for t in txns]
        fraud_count = sum(r["is_fraud"] for r in results)
        return jsonify({
            "total"       : len(results),
            "fraud_count" : fraud_count,
            "fraud_rate"  : round(fraud_count / len(results), 4),
            "predictions" : results,
        })
    except Exception as e:
        log.exception("Batch error")
        return jsonify({"error": str(e)}), 500