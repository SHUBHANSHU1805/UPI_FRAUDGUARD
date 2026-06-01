"""
UPI Fraud Detection - ML Training Pipeline
Models: Random Forest, XGBoost
Handles class imbalance via SMOTE
Outputs: trained model, scaler, feature list, metrics report
"""

import os, json, warnings
import numpy as np
import pandas as pd
import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection   import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing     import StandardScaler, LabelEncoder
from sklearn.ensemble          import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics           import (classification_report, confusion_matrix,
                                        roc_auc_score, roc_curve,
                                        precision_recall_curve, average_precision_score,
                                        f1_score)
from sklearn.pipeline          import Pipeline
from imblearn.over_sampling    import SMOTE
from xgboost                   import XGBClassifier

warnings.filterwarnings("ignore")
np.random.seed(42)

BASE   = os.path.dirname(os.path.abspath(__file__))
DATA   = os.path.join(BASE, "data", "upi_transactions.csv")
MODELS = os.path.join(BASE, "models")
os.makedirs(MODELS, exist_ok=True)

# ─── 1. Load & Feature Engineering ───────────────────────────────────────────
def load_and_engineer(path):
    df = pd.read_csv(path, parse_dates=["timestamp"])
    print(f"Loaded {len(df):,} rows | Fraud rate: {df['is_fraud'].mean()*100:.1f}%")

    # ── Time features ──
    df["hour"]          = df["timestamp"].dt.hour
    df["day_of_week"]   = df["timestamp"].dt.dayofweek
    df["is_weekend"]    = (df["day_of_week"] >= 5).astype(int)
    df["month"]         = df["timestamp"].dt.month

    # ── Amount features ──
    df["log_amount"]    = np.log1p(df["amount"])
    df["amount_to_avg"] = df["amount"] / (df["avg_txn_amount_30d"] + 1)  # ratio vs normal behaviour
    df["is_large_txn"]  = (df["amount"] > df["amount"].quantile(0.95)).astype(int)

    # ── Velocity features ──
    df["txn_ratio_1h_24h"] = df["txn_count_last_1h"] / (df["txn_count_last_24h"] + 1)

    # ── Risk score composite ──
    df["risk_composite"] = (
        df["velocity_score"] * 0.35 +
        df["location_mismatch"] * 0.20 +
        df["device_changed"] * 0.20 +
        df["new_receiver"] * 0.15 +
        (df["pin_attempts"] - 1) / 2 * 0.10
    )

    # ── Encode categoricals ──
    cat_cols = ["sender_bank", "receiver_bank", "upi_app", "merchant_category"]
    le = LabelEncoder()
    for col in cat_cols:
        df[col + "_enc"] = le.fit_transform(df[col].astype(str))

    return df

# ─── 2. Select Features ───────────────────────────────────────────────────────
FEATURE_COLS = [
    # raw
    "log_amount", "transaction_hour", "is_night_txn", "device_changed",
    "new_receiver", "sender_account_age_days", "txn_count_last_1h",
    "txn_count_last_24h", "location_mismatch", "pin_attempts",
    "is_international", "failed_txn_last_24h", "velocity_score",
    # engineered
    "hour", "day_of_week", "is_weekend", "month",
    "amount_to_avg", "is_large_txn", "txn_ratio_1h_24h", "risk_composite",
    # encoded
    "sender_bank_enc", "receiver_bank_enc", "upi_app_enc", "merchant_category_enc",
]
TARGET = "is_fraud"

# ─── 3. Train ─────────────────────────────────────────────────────────────────
def train(df):
    X = df[FEATURE_COLS]
    y = df[TARGET]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"\nTrain: {len(X_train):,} | Test: {len(X_test):,}")
    print(f"Train fraud: {y_train.sum()} | Test fraud: {y_test.sum()}")

    # Scale
    scaler  = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s  = scaler.transform(X_test)

    # SMOTE on training set only
    smote = SMOTE(random_state=42, k_neighbors=5)
    X_res, y_res = smote.fit_resample(X_train_s, y_train)
    print(f"\nAfter SMOTE -> {y_res.value_counts().to_dict()}")

    # ── Model zoo ──
    models = {
        "RandomForest": RandomForestClassifier(
            n_estimators=200, max_depth=12, min_samples_leaf=5,
            class_weight="balanced", random_state=42, n_jobs=-1
        ),
        "XGBoost": XGBClassifier(
            n_estimators=300, max_depth=6, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8,
            scale_pos_weight=1,           # SMOTE already balanced
            eval_metric="logloss", random_state=42,
            use_label_encoder=False
        ),
    }

    results = {}
    for name, clf in models.items():
        print(f"\n== Training {name} ==")
        clf.fit(X_res, y_res)

        y_pred  = clf.predict(X_test_s)
        y_prob  = clf.predict_proba(X_test_s)[:, 1]
        roc_auc = roc_auc_score(y_test, y_prob)
        pr_auc  = average_precision_score(y_test, y_prob)
        f1      = f1_score(y_test, y_pred)

        print(classification_report(y_test, y_pred, target_names=["Legit", "Fraud"]))
        print(f"ROC-AUC : {roc_auc:.4f} | PR-AUC: {pr_auc:.4f} | F1: {f1:.4f}")

        results[name] = {
            "clf": clf, "y_pred": y_pred, "y_prob": y_prob,
            "roc_auc": roc_auc, "pr_auc": pr_auc, "f1": f1,
        }

    # ── Pick best by ROC-AUC ──
    best_name = max(results, key=lambda k: results[k]["roc_auc"])
    best      = results[best_name]
    print(f"\nBest model: {best_name} (ROC-AUC={best['roc_auc']:.4f})")

    return best_name, best["clf"], scaler, X_test_s, y_test, best["y_pred"], best["y_prob"], results

# ─── 4. Plots ─────────────────────────────────────────────────────────────────
def make_plots(best_name, clf, scaler, X_test_s, y_test, y_pred, y_prob, results):
    fig, axes = plt.subplots(2, 3, figsize=(18, 11))
    fig.suptitle("UPI Fraud Detection — Model Evaluation", fontsize=16, fontweight="bold")
    palette = {"Fraud": "#e74c3c", "Legit": "#2ecc71"}

    # 1. Confusion Matrix
    ax = axes[0, 0]
    cm = confusion_matrix(y_test, y_pred)
    sns.heatmap(cm, annot=True, fmt="d", cmap="Reds", ax=ax,
                xticklabels=["Legit", "Fraud"], yticklabels=["Legit", "Fraud"])
    ax.set_title(f"Confusion Matrix ({best_name})")
    ax.set_ylabel("Actual"); ax.set_xlabel("Predicted")

    # 2. ROC Curves (all models)
    ax = axes[0, 1]
    for name, r in results.items():
        fpr, tpr, _ = roc_curve(y_test, r["y_prob"])
        ax.plot(fpr, tpr, label=f"{name} (AUC={r['roc_auc']:.3f})", linewidth=2)
    ax.plot([0, 1], [0, 1], "k--", linewidth=1)
    ax.set_title("ROC Curves"); ax.set_xlabel("FPR"); ax.set_ylabel("TPR")
    ax.legend(); ax.grid(alpha=0.3)

    # 3. Precision-Recall Curves
    ax = axes[0, 2]
    for name, r in results.items():
        prec, rec, _ = precision_recall_curve(y_test, r["y_prob"])
        ax.plot(rec, prec, label=f"{name} (AP={r['pr_auc']:.3f})", linewidth=2)
    ax.set_title("Precision-Recall Curves"); ax.set_xlabel("Recall"); ax.set_ylabel("Precision")
    ax.legend(); ax.grid(alpha=0.3)

    # 4. Feature Importances (top 15)
    ax = axes[1, 0]
    importances = pd.Series(clf.feature_importances_, index=FEATURE_COLS).nlargest(15)
    importances.sort_values().plot(kind="barh", ax=ax, color="#3498db")
    ax.set_title(f"Top 15 Features ({best_name})"); ax.set_xlabel("Importance")

    # 5. Fraud Score Distribution
    ax = axes[1, 1]
    scores_fraud = y_prob[y_test == 1]
    scores_legit = y_prob[y_test == 0]
    ax.hist(scores_legit, bins=50, alpha=0.6, color="#2ecc71", label="Legit", density=True)
    ax.hist(scores_fraud, bins=50, alpha=0.6, color="#e74c3c", label="Fraud", density=True)
    ax.axvline(0.5, color="black", linestyle="--", label="Threshold 0.5")
    ax.set_title("Fraud Probability Distribution")
    ax.set_xlabel("Predicted Probability"); ax.set_ylabel("Density")
    ax.legend(); ax.grid(alpha=0.3)

    # 6. Model Comparison Bar
    ax = axes[1, 2]
    metrics_df = pd.DataFrame({
        "Model"  : list(results.keys()),
        "ROC-AUC": [r["roc_auc"] for r in results.values()],
        "PR-AUC" : [r["pr_auc"]  for r in results.values()],
        "F1"     : [r["f1"]      for r in results.values()],
    }).set_index("Model")
    metrics_df.plot(kind="bar", ax=ax, colormap="Set2", rot=0)
    ax.set_title("Model Comparison"); ax.set_ylabel("Score"); ax.set_ylim(0, 1)
    ax.legend(loc="lower right"); ax.grid(axis="y", alpha=0.3)

    plt.tight_layout()
    out = os.path.join(MODELS, "evaluation_plots.png")
    plt.savefig(out, dpi=130, bbox_inches="tight")
    plt.close()
    print(f"\nPlots saved -> {out}")
    return out

# ─── 5. Save Artifacts ────────────────────────────────────────────────────────
def save_artifacts(best_name, clf, scaler, y_test, y_pred, y_prob):
    joblib.dump(clf,    os.path.join(MODELS, "fraud_model.pkl"))
    joblib.dump(scaler, os.path.join(MODELS, "scaler.pkl"))

    # Feature list for API
    with open(os.path.join(MODELS, "features.json"), "w") as f:
        json.dump(FEATURE_COLS, f, indent=2)

    # Metrics
    roc_auc = roc_auc_score(y_test, y_prob)
    pr_auc  = average_precision_score(y_test, y_prob)
    report  = classification_report(y_test, y_pred,
                                     target_names=["Legit", "Fraud"], output_dict=True)
    summary = {
        "model_name"  : best_name,
        "roc_auc"     : round(roc_auc, 4),
        "pr_auc"      : round(pr_auc,  4),
        "f1_fraud"    : round(report["Fraud"]["f1-score"], 4),
        "precision_fraud": round(report["Fraud"]["precision"], 4),
        "recall_fraud": round(report["Fraud"]["recall"], 4),
        "feature_cols": FEATURE_COLS,
    }
    with open(os.path.join(MODELS, "model_summary.json"), "w") as f:
        json.dump(summary, f, indent=2)

    print(f"\nArtifacts saved to {MODELS}/")
    print(f"   fraud_model.pkl | scaler.pkl | features.json | model_summary.json")
    return summary

# ─── Main ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    df = load_and_engineer(DATA)
    best_name, clf, scaler, X_test_s, y_test, y_pred, y_prob, all_results = train(df)
    make_plots(best_name, clf, scaler, X_test_s, y_test, y_pred, y_prob, all_results)
    summary = save_artifacts(best_name, clf, scaler, y_test, y_pred, y_prob)

    print("\n" + "="*55)
    print("  FINAL MODEL SUMMARY")
    print("="*55)
    for k, v in summary.items():
        if k != "feature_cols":
            print(f"  {k:<22}: {v}")
    print("="*55)