"""
UPI Fraud Detection - Synthetic Dataset Generator
Generates realistic UPI transaction data with fraud patterns
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import random
import os

np.random.seed(42)
random.seed(42)

# ─── Constants ────────────────────────────────────────────────────────────────
N_LEGIT   = 45000
N_FRAUD   = 5000   # ~10% fraud (will be handled by SMOTE later)
BANKS     = ["SBI", "HDFC", "ICICI", "Axis", "Kotak", "PNB", "BOB", "Canara"]
UPI_APPS  = ["GPay", "PhonePe", "Paytm", "BHIM", "Amazon Pay", "WhatsApp Pay"]
MERCHANT_CATS = ["Grocery", "Food", "Travel", "Electronics", "Clothing", "Utility",
                 "Medical", "Education", "Entertainment", "Transfer"]
FRAUD_PATTERNS = ["account_takeover", "phishing", "sim_swap", "social_engineering", "none"]

START_DATE = datetime(2023, 1, 1)
END_DATE   = datetime(2024, 12, 31)

def rand_date():
    delta = END_DATE - START_DATE
    return START_DATE + timedelta(seconds=random.randint(0, int(delta.total_seconds())))

def generate_vpa(bank=None):
    b = bank.lower().replace(" ", "") if bank else random.choice([b.lower() for b in BANKS])
    user = ''.join(random.choices("abcdefghijklmnopqrstuvwxyz0123456789", k=random.randint(4, 10)))
    return f"{user}@{b}"

# ─── Legitimate Transactions ──────────────────────────────────────────────────
def gen_legit(n):
    rows = []
    for _ in range(n):
        ts        = rand_date()
        bank      = random.choice(BANKS)
        amount    = round(np.random.lognormal(mean=6.5, sigma=1.2), 2)  # ₹100–₹50k typical
        amount    = min(amount, 200000)
        hour      = ts.hour
        rows.append({
            "transaction_id"        : f"TXN{random.randint(10**9, 10**10-1)}",
            "timestamp"             : ts,
            "amount"                : amount,
            "sender_vpa"            : generate_vpa(bank),
            "receiver_vpa"          : generate_vpa(),
            "sender_bank"           : bank,
            "receiver_bank"         : random.choice(BANKS),
            "upi_app"               : random.choice(UPI_APPS),
            "merchant_category"     : random.choice(MERCHANT_CATS),
            "transaction_hour"      : hour,
            "is_night_txn"          : int(hour < 6 or hour >= 22),
            "device_changed"        : int(random.random() < 0.03),   # rarely changes device
            "new_receiver"          : int(random.random() < 0.25),   # 25% new payee
            "sender_account_age_days": random.randint(180, 3650),
            "txn_count_last_1h"     : random.randint(0, 3),
            "txn_count_last_24h"    : random.randint(1, 15),
            "avg_txn_amount_30d"    : round(np.random.lognormal(6.4, 1.0), 2),
            "location_mismatch"     : int(random.random() < 0.05),
            "pin_attempts"          : 1,
            "is_international"      : 0,
            "failed_txn_last_24h"   : random.randint(0, 1),
            "velocity_score"        : round(random.uniform(0, 0.3), 3),
            "is_fraud"              : 0,
            "fraud_pattern"         : "none",
        })
    return rows

# ─── Fraudulent Transactions ──────────────────────────────────────────────────
def gen_fraud(n):
    rows = []
    patterns = ["account_takeover", "phishing", "sim_swap", "social_engineering"]

    for _ in range(n):
        ts      = rand_date()
        bank    = random.choice(BANKS)
        pattern = random.choice(patterns)
        hour    = ts.hour

        # Amount: fraudsters tend to move large sums quickly
        if pattern in ("account_takeover", "sim_swap"):
            amount = round(np.random.uniform(10000, 500000), 2)
        elif pattern == "phishing":
            amount = round(np.random.uniform(500, 50000), 2)
        else:
            amount = round(np.random.uniform(1000, 100000), 2)

        rows.append({
            "transaction_id"        : f"TXN{random.randint(10**9, 10**10-1)}",
            "timestamp"             : ts,
            "amount"                : amount,
            "sender_vpa"            : generate_vpa(bank),
            "receiver_vpa"          : generate_vpa(),
            "sender_bank"           : bank,
            "receiver_bank"         : random.choice(BANKS),
            "upi_app"               : random.choice(UPI_APPS),
            "merchant_category"     : random.choice(MERCHANT_CATS),
            "transaction_hour"      : hour,
            "is_night_txn"          : int(hour < 6 or hour >= 22),
            # Fraud signals ↓
            "device_changed"        : int(random.random() < (0.8 if pattern == "sim_swap" else 0.4)),
            "new_receiver"          : int(random.random() < 0.85),
            "sender_account_age_days": random.randint(1, 365) if pattern == "account_takeover"
                                       else random.randint(30, 3650),
            "txn_count_last_1h"     : random.randint(3, 15),   # burst activity
            "txn_count_last_24h"    : random.randint(5, 40),
            "avg_txn_amount_30d"    : round(np.random.lognormal(5.5, 1.0), 2),
            "location_mismatch"     : int(random.random() < 0.70),
            "pin_attempts"          : random.choices([1, 2, 3], weights=[0.3, 0.4, 0.3])[0],
            "is_international"      : int(random.random() < 0.15),
            "failed_txn_last_24h"   : random.randint(1, 5),
            "velocity_score"        : round(random.uniform(0.5, 1.0), 3),
            "is_fraud"              : 1,
            "fraud_pattern"         : pattern,
        })
    return rows

# ─── Build & Save ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("Generating dataset...")
    data = gen_legit(N_LEGIT) + gen_fraud(N_FRAUD)
    df   = pd.DataFrame(data).sample(frac=1, random_state=42).reset_index(drop=True)

    out = os.path.join(os.path.dirname(__file__), "upi_transactions.csv")
    df.to_csv(out, index=False)

    print(f"✅ Dataset saved → {out}")
    print(f"   Total rows : {len(df):,}")
    print(f"   Fraud rows : {df['is_fraud'].sum():,}  ({df['is_fraud'].mean()*100:.1f}%)")
    print(f"   Columns    : {list(df.columns)}")