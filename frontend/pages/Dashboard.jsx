/**
 * DashboardPage.jsx
 * Full authenticated UPI fraud detection dashboard.
 * Uses JWT token from localStorage (attached automatically by api.js interceptor).
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { predictAPI } from "../src/api";
import { useAuth } from "../src/hooks/useAuth";

/* ─── Theme ─────────────────────────────────────────────────────────────────── */
const T = {
    bg: "#0d1117", surface: "#161b22", surf2: "#21262d",
    border: "#30363d", text: "#e6edf3", muted: "#8b949e", faint: "#3d444d",
    red: "#f85149", green: "#3fb950", amber: "#d29922", blue: "#58a6ff", purple: "#bc8cff",
    redBg: "#2d1b1a", greenBg: "#1a2d1e", amberBg: "#2d2514",
};
const RISK_COLOR = { LOW: T.green, MEDIUM: T.amber, HIGH: T.red, CRITICAL: "#ff4444" };
const RISK_BG = { LOW: T.greenBg, MEDIUM: T.amberBg, HIGH: T.redBg, CRITICAL: "#3d0a0a" };

/* ─── Data helpers ───────────────────────────────────────────────────────────── */
const BANKS = ["SBI", "HDFC", "ICICI", "Axis", "Kotak", "PNB", "BOB", "Canara"];
const APPS = ["GPay", "PhonePe", "Paytm", "BHIM", "Amazon Pay", "WhatsApp Pay"];
const CATS = ["Grocery", "Food", "Travel", "Electronics", "Clothing", "Utility", "Medical", "Education", "Entertainment", "Transfer"];

const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
const ri = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const rf = (a, b) => parseFloat((Math.random() * (b - a) + a).toFixed(2));
const fmtINR = (n) => "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const uid = () => "TXN" + Math.floor(Math.random() * 9e9 + 1e9);

function makeRandTxn(forcefraud = false) {
    const isFraud = forcefraud || Math.random() < 0.12;
    return {
        transaction_id: uid(),
        timestamp: new Date().toISOString(),
        amount: isFraud ? rf(8000, 300000) : rf(50, 12000),
        sender_bank: rnd(BANKS), receiver_bank: rnd(BANKS),
        upi_app: rnd(APPS), merchant_category: rnd(CATS),
        sender_account_age_days: isFraud ? ri(1, 90) : ri(200, 3650),
        txn_count_last_1h: isFraud ? ri(4, 14) : ri(0, 2),
        txn_count_last_24h: isFraud ? ri(8, 35) : ri(1, 8),
        avg_txn_amount_30d: rf(200, 8000),
        device_changed: isFraud ? (Math.random() < 0.7 ? 1 : 0) : 0,
        new_receiver: isFraud ? 1 : (Math.random() < 0.3 ? 1 : 0),
        location_mismatch: isFraud ? (Math.random() < 0.7 ? 1 : 0) : 0,
        pin_attempts: isFraud ? ri(1, 3) : 1,
        is_international: isFraud ? (Math.random() < 0.15 ? 1 : 0) : 0,
        failed_txn_last_24h: isFraud ? ri(1, 5) : 0,
        velocity_score: isFraud ? rf(0.55, 0.98) : rf(0.01, 0.25),
        _isFraud: isFraud,
    };
}

/* ─── Sub-components ─────────────────────────────────────────────────────────── */
function StatCard({ label, value, sub, accent }) {
    return (
        <div style={{
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9,
            padding: "14px 16px", borderTop: `2px solid ${accent}`,
        }}>
            <div style={{ fontSize: 10, color: T.muted, fontFamily: "Syne, sans-serif", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: accent, fontFamily: "Syne, sans-serif" }}>{value}</div>
            {sub && <div style={{ fontSize: 10, color: T.muted, marginTop: 3 }}>{sub}</div>}
        </div>
    );
}

function RiskBadge({ level, prob }) {
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: RISK_BG[level], color: RISK_COLOR[level],
            border: `1px solid ${RISK_COLOR[level]}44`, borderRadius: 5,
            padding: "2px 8px", fontSize: 11, fontWeight: 700,
        }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: RISK_COLOR[level], display: "inline-block" }} />
            {level} · {(prob * 100).toFixed(1)}%
        </span>
    );
}

function Toggle({ label, value, onChange }) {
    return (
        <button onClick={() => onChange(!value)} style={{
            padding: "7px 4px", borderRadius: 5, fontSize: 10, fontFamily: "inherit",
            cursor: "pointer", textAlign: "center", border: "1px solid",
            borderColor: value ? `${T.amber}44` : T.border,
            background: value ? T.amberBg : T.surf2,
            color: value ? T.amber : T.muted, transition: "all .2s",
        }}>
            {label}<br /><b style={{ fontSize: 11 }}>{value ? "ON" : "OFF"}</b>
        </button>
    );
}

const IS = { // inputStyle
    width: "100%", background: T.surf2, border: `1px solid ${T.border}`,
    color: T.text, borderRadius: 5, padding: "6px 10px", fontSize: 12,
    fontFamily: "inherit", outline: "none", transition: "border .2s",
};
const LS = { fontSize: 10, color: T.muted, marginBottom: 3, textTransform: "uppercase", letterSpacing: ".06em", display: "block" }; // labelStyle

const FEAT_IMPORTANCE = [
    { f: "velocity_score", v: 18 }, { f: "risk_composite", v: 15 },
    { f: "amount_to_avg", v: 12 }, { f: "txn_count_1h", v: 10 },
    { f: "location_mismatch", v: 9 }, { f: "device_changed", v: 8 },
    { f: "log_amount", v: 7 }, { f: "new_receiver", v: 6 },
].sort((a, b) => a.v - b.v);

/* ─── Main Dashboard ─────────────────────────────────────────────────────────── */
export default function DashboardPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    /* ── state ── */
    const [txns, setTxns] = useState([]);
    const [results, setResults] = useState({});
    const [stats, setStats] = useState({ total: 0, frauds: 0, blocked: 0 });
    const [riskCts, setRiskCts] = useState({ LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 });
    const [trend, setTrend] = useState(Array.from({ length: 14 }, (_, i) => ({ t: `${i * 5}s`, l: 0, f: 0 })));
    const [alert, setAlert] = useState(null);
    const [live, setLive] = useState(true);

    /* checker form */
    const [form, setForm] = useState({
        amount: "25000", upi_app: "GPay", sender_bank: "SBI", merchant_category: "Transfer",
        sender_account_age_days: "45", txn_count_last_1h: "6", txn_count_last_24h: "12",
        velocity_score: "0.75", device_changed: true, new_receiver: true,
        location_mismatch: true, is_international: false,
    });
    const [checking, setChecking] = useState(false);
    const [checkRes, setCheckRes] = useState(null);
    const sf = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

    /* ── process one transaction ── */
    const processTxn = useCallback(async (txn) => {
        const id = txn.transaction_id;
        setTxns(p => [txn, ...p.slice(0, 49)]);
        setResults(p => ({ ...p, [id]: null }));

        try {
            const { data: result } = await predictAPI.single(txn);
            setResults(p => ({ ...p, [id]: result }));
            setStats(p => ({
                total: p.total + 1,
                frauds: p.frauds + result.is_fraud,
                blocked: p.blocked + (result.risk_level === "HIGH" || result.risk_level === "CRITICAL" ? 1 : 0),
            }));
            setRiskCts(p => ({ ...p, [result.risk_level]: (p[result.risk_level] || 0) + 1 }));

            /* trend */
            const now = new Date();
            const tKey = `${now.getMinutes()}:${String(Math.floor(now.getSeconds() / 10) * 10).padStart(2, "0")}`;
            setTrend(p => {
                const last = p[p.length - 1];
                if (last.t === tKey)
                    return [...p.slice(0, -1), { t: tKey, l: last.l + (result.is_fraud ? 0 : 1), f: last.f + result.is_fraud }];
                return [...p.slice(1), { t: tKey, l: result.is_fraud ? 0 : 1, f: result.is_fraud }];
            });

            if (result.is_fraud && result.risk_level !== "LOW") {
                setAlert({ id: id.slice(-8), amount: txn.amount, risk: result.risk_level, prob: result.fraud_prob });
                setTimeout(() => setAlert(null), 5000);
            }
        } catch (err) {
            console.error("Predict error", err);
        }
    }, []);

    /* ── live feed interval ── */
    useEffect(() => {
        if (!live) return;
        const iv = setInterval(() => processTxn(makeRandTxn()), 1800);
        return () => clearInterval(iv);
    }, [live, processTxn]);

    /* ── checker submit ── */
    async function analyzeForm() {
        setChecking(true); setCheckRes(null);
        const txn = {
            ...makeRandTxn(), // fill non-form fields with defaults
            amount: parseFloat(form.amount),
            upi_app: form.upi_app, sender_bank: form.sender_bank,
            merchant_category: form.merchant_category,
            sender_account_age_days: parseInt(form.sender_account_age_days),
            txn_count_last_1h: parseInt(form.txn_count_last_1h),
            txn_count_last_24h: parseInt(form.txn_count_last_24h),
            velocity_score: parseFloat(form.velocity_score),
            device_changed: form.device_changed ? 1 : 0,
            new_receiver: form.new_receiver ? 1 : 0,
            location_mismatch: form.location_mismatch ? 1 : 0,
            is_international: form.is_international ? 1 : 0,
            timestamp: new Date().toISOString(),
        };
        try {
            const { data } = await predictAPI.single(txn);
            setCheckRes(data);
        } catch (e) { console.error(e); }
        setChecking(false);
    }

    function randomizeForm() {
        const t = makeRandTxn(Math.random() < 0.5);
        setForm({
            amount: t.amount.toFixed(0), upi_app: t.upi_app, sender_bank: t.sender_bank,
            merchant_category: t.merchant_category,
            sender_account_age_days: String(t.sender_account_age_days),
            txn_count_last_1h: String(t.txn_count_last_1h),
            txn_count_last_24h: String(t.txn_count_last_24h),
            velocity_score: t.velocity_score.toFixed(2),
            device_changed: Boolean(t.device_changed), new_receiver: Boolean(t.new_receiver),
            location_mismatch: Boolean(t.location_mismatch), is_international: Boolean(t.is_international),
        });
        setCheckRes(null);
    }

    function handleLogout() { logout(); navigate("/login"); }

    const fraudRate = stats.total ? ((stats.frauds / stats.total) * 100).toFixed(1) : "0.0";
    const feedFrauds = Object.values(results).filter(r => r?.is_fraud).length;
    const riskPieData = Object.entries(riskCts)
        .map(([k, v]) => ({ name: k, value: v, color: RISK_COLOR[k] }))
        .filter(d => d.value > 0);

    /* ─── Render ─────────────────────────────────────────────────────────────── */
    return (
        <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'JetBrains Mono', monospace" }}>

            {/* ── Alert Banner ── */}
            {alert && (
                <div style={{
                    position: "fixed", top: 62, right: 14, zIndex: 999,
                    background: T.redBg, border: `1px solid ${T.red}66`, borderLeft: `3px solid ${T.red}`,
                    borderRadius: 8, padding: "10px 14px", width: 280,
                    animation: "slideIn .4s ease",
                }}>
                    <style>{`@keyframes slideIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 12, color: T.red }}>🚨 FRAUD ALERT</div>
                            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                                {alert.id} · {fmtINR(alert.amount)}<br />
                                Risk: <b style={{ color: RISK_COLOR[alert.risk] }}>{alert.risk}</b> · {(alert.prob * 100).toFixed(1)}%
                            </div>
                        </div>
                        <button onClick={() => setAlert(null)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 16 }}>×</button>
                    </div>
                </div>
            )}

            {/* ── Navbar ── */}
            <nav style={{
                background: T.surface, borderBottom: `1px solid ${T.border}`,
                height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0 18px", position: "sticky", top: 0, zIndex: 100,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 30, height: 30, background: T.redBg, border: `1px solid ${T.red}44`, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🛡</div>
                    <div>
                        <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 14 }}>UPI FraudGuard</div>
                        <div style={{ fontSize: 10, color: T.muted }}>RandomForest · ROC-AUC 1.00</div>
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, background: T.greenBg, border: `1px solid ${T.green}44`, borderRadius: 6, padding: "3px 10px", fontSize: 10 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, display: "inline-block" }} />
                        <span style={{ color: T.green }}>LIVE</span>
                    </div>
                    <button onClick={() => setLive(v => !v)} style={{
                        background: live ? T.redBg : T.greenBg, border: `1px solid ${live ? T.red : T.green}44`,
                        color: live ? T.red : T.green, borderRadius: 5, padding: "3px 10px",
                        fontSize: 10, cursor: "pointer", fontFamily: "inherit",
                    }}>
                        {live ? "⏸ Pause" : "▶ Resume"}
                    </button>
                    <div style={{ fontSize: 11, color: T.muted, borderLeft: `1px solid ${T.border}`, paddingLeft: 10 }}>
                        {user?.name || "Analyst"}
                        <span style={{ marginLeft: 6, fontSize: 10, color: T.amber, background: T.amberBg, border: `1px solid ${T.amber}44`, borderRadius: 4, padding: "1px 6px" }}>{user?.role || "analyst"}</span>
                    </div>
                    <button onClick={handleLogout} style={{
                        background: "none", border: `1px solid ${T.border}`, color: T.muted,
                        borderRadius: 5, padding: "3px 10px", fontSize: 10, cursor: "pointer", fontFamily: "inherit",
                    }}>
                        Sign out
                    </button>
                </div>
            </nav>

            <div style={{ padding: "14px 18px", maxWidth: 1380, margin: "0 auto" }}>

                {/* ── Stat Cards ── */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 14 }}>
                    <StatCard label="Total Analyzed" value={stats.total.toLocaleString()} sub="this session" accent={T.blue} />
                    <StatCard label="Frauds Detected" value={stats.frauds.toLocaleString()} sub={`${fraudRate}% rate`} accent={T.red} />
                    <StatCard label="High-Risk Blocked" value={stats.blocked.toLocaleString()} sub="HIGH + CRITICAL" accent={T.amber} />
                    <StatCard label="F1 / Precision" value="1.00 / 1.00" sub="SMOTE · RandomForest" accent={T.purple} />
                </div>

                {/* ── Main grid ── */}
                <div style={{ display: "grid", gridTemplateColumns: "310px 1fr", gap: 14, marginBottom: 14 }}>

                    {/* ── Checker Form ── */}
                    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, overflow: "hidden" }}>
                        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13 }}>🔍 Transaction Checker</span>
                            <button onClick={randomizeForm} style={{ background: T.surf2, border: `1px solid ${T.border}`, color: T.muted, borderRadius: 5, padding: "4px 10px", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>↻ Random</button>
                        </div>
                        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 9 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                <div><label style={LS}>Amount (₹)</label><input style={IS} type="number" value={form.amount} onChange={sf("amount")} /></div>
                                <div><label style={LS}>UPI App</label>
                                    <select style={IS} value={form.upi_app} onChange={sf("upi_app")}>
                                        {APPS.map(a => <option key={a}>{a}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                <div><label style={LS}>Sender Bank</label>
                                    <select style={IS} value={form.sender_bank} onChange={sf("sender_bank")}>
                                        {BANKS.map(b => <option key={b}>{b}</option>)}
                                    </select>
                                </div>
                                <div><label style={LS}>Category</label>
                                    <select style={IS} value={form.merchant_category} onChange={sf("merchant_category")}>
                                        {CATS.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                <div><label style={LS}>Account Age (days)</label><input style={IS} type="number" value={form.sender_account_age_days} onChange={sf("sender_account_age_days")} /></div>
                                <div><label style={LS}>Txns last 1h</label><input style={IS} type="number" value={form.txn_count_last_1h} onChange={sf("txn_count_last_1h")} /></div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                <div><label style={LS}>Txns last 24h</label><input style={IS} type="number" value={form.txn_count_last_24h} onChange={sf("txn_count_last_24h")} /></div>
                                <div><label style={LS}>Velocity (0-1)</label><input style={IS} type="number" step="0.01" value={form.velocity_score} onChange={sf("velocity_score")} /></div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                                {[["Device Changed", "device_changed"], ["New Receiver", "new_receiver"], ["Location Mismatch", "location_mismatch"], ["International", "is_international"]].map(([lbl, k]) => (
                                    <Toggle key={k} label={lbl} value={form[k]} onChange={v => setForm(p => ({ ...p, [k]: v }))} />
                                ))}
                            </div>
                            <button onClick={analyzeForm} disabled={checking} style={{
                                background: checking ? T.surf2 : T.blue, color: checking ? T.muted : "#000",
                                border: "none", borderRadius: 7, padding: "10px", fontSize: 12,
                                fontWeight: 700, cursor: checking ? "default" : "pointer",
                                fontFamily: "Syne, sans-serif", transition: "background .2s", marginTop: 2,
                            }}>
                                {checking ? "⟳ Analyzing…" : "⚡ Analyze Transaction"}
                            </button>

                            {checkRes && (
                                <div style={{
                                    background: RISK_BG[checkRes.risk_level], border: `1px solid ${RISK_COLOR[checkRes.risk_level]}44`,
                                    borderRadius: 7, padding: "12px 14px",
                                }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                        <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, color: RISK_COLOR[checkRes.risk_level] }}>
                                            {checkRes.is_fraud ? "⚠ FRAUD DETECTED" : "✓ SAFE"}
                                        </span>
                                        <RiskBadge level={checkRes.risk_level} prob={checkRes.fraud_prob} />
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                                        {[["Fraud Prob", (checkRes.fraud_prob * 100).toFixed(2) + "%"], ["Confidence", (checkRes.confidence * 100).toFixed(2) + "%"], ["Risk Level", checkRes.risk_level], ["Verdict", checkRes.is_fraud ? "🚫 Block" : "✅ Allow"]].map(([k, v]) => (
                                            <div key={k} style={{ background: "#0d111788", borderRadius: 5, padding: "6px 8px" }}>
                                                <div style={{ fontSize: 10, color: T.muted }}>{k}</div>
                                                <div style={{ fontSize: 12, fontWeight: 700 }}>{v}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ marginTop: 8 }}>
                                        <div style={{ fontSize: 10, color: T.muted, marginBottom: 3 }}>Fraud Score</div>
                                        <div style={{ background: T.faint, borderRadius: 3, height: 6, overflow: "hidden" }}>
                                            <div style={{ height: "100%", width: `${(checkRes.fraud_prob * 100).toFixed(1)}%`, background: RISK_COLOR[checkRes.risk_level], borderRadius: 3, transition: "width .8s ease" }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Live Feed ── */}
                    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13 }}>⚡ Live Transaction Feed</span>
                            <div style={{ fontSize: 10, color: T.muted }}>
                                {txns.length} total · <span style={{ color: T.red }}>{feedFrauds} flagged</span>
                            </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "100px 85px 75px 1fr 120px", gap: 10, padding: "7px 14px", borderBottom: `1px solid ${T.faint}`, fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".07em" }}>
                            <span>TXN ID</span><span>Amount</span><span>App</span><span>Category</span><span>Risk</span>
                        </div>
                        <div style={{ flex: 1, overflowY: "auto", maxHeight: 380 }}>
                            {txns.length === 0
                                ? <div style={{ padding: 40, textAlign: "center", color: T.muted, fontSize: 12 }}>Waiting for transactions…</div>
                                : txns.map((txn) => {
                                    const result = results[txn.transaction_id];
                                    return (
                                        <div key={txn.transaction_id} style={{
                                            display: "grid", gridTemplateColumns: "100px 85px 75px 1fr 120px", gap: 10,
                                            padding: "9px 14px", borderBottom: `1px solid ${T.border}`, fontSize: 11,
                                            alignItems: "center", background: result?.is_fraud ? `${T.redBg}55` : "transparent",
                                        }}>
                                            <span style={{ color: T.muted, fontSize: 10 }}>{txn.transaction_id.slice(-8)}</span>
                                            <span style={{ color: T.blue }}>{fmtINR(txn.amount)}</span>
                                            <span style={{ color: T.muted, fontSize: 10 }}>{txn.upi_app}</span>
                                            <span style={{ color: T.muted, fontSize: 10 }}>{txn.merchant_category}</span>
                                            {result
                                                ? <RiskBadge level={result.risk_level} prob={result.fraud_prob} />
                                                : <span style={{ fontSize: 10, color: T.faint }}>scanning…</span>
                                            }
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </div>

                {/* ── Bottom Row ── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 200px 300px", gap: 14 }}>

                    {/* Trend Chart */}
                    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, padding: "14px 18px" }}>
                        <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, marginBottom: 12 }}>📈 Live Detection Activity</div>
                        <ResponsiveContainer width="100%" height={160}>
                            <AreaChart data={trend} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                                <defs>
                                    <linearGradient id="gL" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.green} stopOpacity={0.3} /><stop offset="95%" stopColor={T.green} stopOpacity={0} /></linearGradient>
                                    <linearGradient id="gF" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.red} stopOpacity={0.3} /><stop offset="95%" stopColor={T.red} stopOpacity={0} /></linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={T.faint} />
                                <XAxis dataKey="t" tick={{ fill: T.muted, fontSize: 9 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: T.muted, fontSize: 9 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ background: T.surf2, border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 11 }} />
                                <Area type="monotone" dataKey="l" stroke={T.green} fill="url(#gL)" strokeWidth={2} dot={false} name="Legit" />
                                <Area type="monotone" dataKey="f" stroke={T.red} fill="url(#gF)" strokeWidth={2} dot={false} name="Fraud" />
                            </AreaChart>
                        </ResponsiveContainer>
                        <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: T.green, display: "inline-block" }} /><span style={{ color: T.muted }}>Legitimate</span></span>
                            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: T.red, display: "inline-block" }} /><span style={{ color: T.muted }}>Fraud</span></span>
                        </div>
                    </div>

                    {/* Risk Pie */}
                    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, padding: "14px 16px" }}>
                        <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, marginBottom: 8 }}>🎯 Risk Breakdown</div>
                        {riskPieData.length === 0
                            ? <div style={{ color: T.muted, fontSize: 11, padding: "40px 0", textAlign: "center" }}>Initializing…</div>
                            : <>
                                <ResponsiveContainer width="100%" height={130}>
                                    <PieChart>
                                        <Pie data={riskPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" stroke="none">
                                            {riskPieData.map((d, i) => <Cell key={i} fill={d.color} opacity={0.85} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ background: T.surf2, border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 11 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                                    {riskPieData.map(d => (
                                        <span key={d.name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10 }}>
                                            <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color, display: "inline-block" }} />
                                            <span style={{ color: T.muted }}>{d.name}</span>
                                        </span>
                                    ))}
                                </div>
                            </>
                        }
                    </div>

                    {/* Feature Importance */}
                    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, padding: "14px 16px" }}>
                        <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, marginBottom: 12 }}>🧠 Feature Importance</div>
                        {FEAT_IMPORTANCE.map(({ f, v }) => (
                            <div key={f} style={{ marginBottom: 7 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.muted, marginBottom: 3 }}>
                                    <span>{f}</span><span style={{ color: T.purple }}>{v}%</span>
                                </div>
                                <div style={{ background: T.surf2, borderRadius: 3, height: 5, overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: `${(v / 18) * 100}%`, background: T.purple, borderRadius: 3, opacity: 0.8 }} />
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </div>
        </div>
    );
}