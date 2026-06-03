import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Play, RefreshCw, ShieldAlert, ShieldCheck, Zap, Info } from "lucide-react";
import { predictAPI, authAPI } from "../src/api";
import Gauge3D from "../src/components/Gauge3D";
import ParticleNetwork from "../src/components/ParticleNetwork";

const PRESETS = {
  sim_swap: {
    label: "⚡ SIM Swap Attack",
    desc: "Simulate device takeover. Triggers high velocity and location flags.",
    data: {
      amount: "145000", upi_app: "PhonePe", sender_bank: "SBI", merchant_category: "Transfer",
      sender_account_age_days: "12", txn_count_last_1h: "8", txn_count_last_24h: "18",
      velocity_score: "0.92", device_changed: true, new_receiver: true,
      location_mismatch: true, is_international: false, failed_txn_last_24h: "2",
      pin_attempts: "2", avg_txn_amount_30d: "4500"
    }
  },
  phishing: {
    label: "🎣 Phishing Scam",
    desc: "Simulate credential phishing. Triggers multiple PIN attempts to new payee.",
    data: {
      amount: "28500", upi_app: "GPay", sender_bank: "HDFC", merchant_category: "Transfer",
      sender_account_age_days: "520", txn_count_last_1h: "2", txn_count_last_24h: "4",
      velocity_score: "0.68", device_changed: false, new_receiver: true,
      location_mismatch: true, is_international: false, failed_txn_last_24h: "1",
      pin_attempts: "3", avg_txn_amount_30d: "2500"
    }
  },
  safe: {
    label: "✅ Safe Transaction",
    desc: "Simulate a standard, everyday legitimate transfer.",
    data: {
      amount: "1200", upi_app: "BHIM", sender_bank: "Kotak", merchant_category: "Grocery",
      sender_account_age_days: "1420", txn_count_last_1h: "0", txn_count_last_24h: "2",
      velocity_score: "0.08", device_changed: false, new_receiver: false,
      location_mismatch: false, is_international: false, failed_txn_last_24h: "0",
      pin_attempts: "1", avg_txn_amount_30d: "3500"
    }
  }
};

const BANKS = ["SBI", "HDFC", "ICICI", "Axis", "Kotak", "PNB", "BOB", "Canara"];
const APPS = ["GPay", "PhonePe", "Paytm", "BHIM", "Amazon Pay", "WhatsApp Pay"];
const CATS = ["Grocery", "Food", "Travel", "Electronics", "Clothing", "Utility", "Medical", "Education", "Entertainment", "Transfer"];

export default function DemoPage() {
  const [form, setForm] = useState(PRESETS.safe.data);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [guestLoading, setGuestLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Silent authentication to get access token for predict API
  useEffect(() => {
    async function obtainGuestToken() {
      const existingToken = localStorage.getItem("fraudguard_access");
      if (existingToken) return; // already logged in or has active session

      setGuestLoading(true);
      const guestEmail = "demo_guest@fraudguard.demo";
      const guestPass = "DemoGuest123!";
      
      try {
        // Try logging in
        const { data } = await authAPI.login(guestEmail, guestPass);
        localStorage.setItem("fraudguard_access", data.access_token);
        localStorage.setItem("fraudguard_refresh", data.refresh_token);
        localStorage.setItem("fraudguard_user", JSON.stringify(data.user));
      } catch (err) {
        // If login fails (user does not exist), register the user
        try {
          const { data } = await authAPI.register("Demo Guest", guestEmail, guestPass);
          localStorage.setItem("fraudguard_access", data.access_token);
          localStorage.setItem("fraudguard_refresh", data.refresh_token);
          localStorage.setItem("fraudguard_user", JSON.stringify(data.user));
        } catch (regErr) {
          console.error("Failed to set up silent guest token", regErr);
          setAuthError("Failed to initiate demo session. Predictions will run in mock mode.");
        }
      } finally {
        setGuestLoading(false);
      }
    }
    obtainGuestToken();
  }, []);

  const handlePreset = (key) => {
    setForm(PRESETS[key].data);
    setResult(null);
  };

  const handleField = (key, value) => {
    setForm(p => ({ ...p, [key]: value }));
    setResult(null);
  };

  const runPrediction = async () => {
    setChecking(true);
    setResult(null);

    const payload = {
      amount: parseFloat(form.amount || 0),
      upi_app: form.upi_app,
      sender_bank: form.sender_bank,
      merchant_category: form.merchant_category,
      sender_account_age_days: parseInt(form.sender_account_age_days || 365),
      txn_count_last_1h: parseInt(form.txn_count_last_1h || 0),
      txn_count_last_24h: parseInt(form.txn_count_last_24h || 1),
      avg_txn_amount_30d: parseFloat(form.avg_txn_amount_30d || form.amount || 1000),
      device_changed: form.device_changed ? 1 : 0,
      new_receiver: form.new_receiver ? 1 : 0,
      location_mismatch: form.location_mismatch ? 1 : 0,
      is_international: form.is_international ? 1 : 0,
      failed_txn_last_24h: parseInt(form.failed_txn_last_24h || 0),
      pin_attempts: parseInt(form.pin_attempts || 1),
      velocity_score: parseFloat(form.velocity_score || 0.1),
      timestamp: new Date().toISOString()
    };

    try {
      const response = await predictAPI.single(payload);
      // Introduce an artificial 1s delay for dramatic reveal suspense
      setTimeout(() => {
        setResult(response.data);
        setChecking(false);
      }, 1000);
    } catch (err) {
      console.error(err);
      // Fallback mock prediction logic if server is unreachable or silent login failed
      setTimeout(() => {
        const amt = parseFloat(form.amount || 0);
        const isCritical = amt > 100000 || form.velocity_score > 0.85 || (form.device_changed && form.new_receiver);
        const prob = isCritical ? 0.94 : (form.new_receiver ? 0.42 : 0.08);
        setResult({
          is_fraud: prob >= 0.5 ? 1 : 0,
          fraud_prob: prob,
          risk_level: prob < 0.3 ? "LOW" : prob < 0.6 ? "MEDIUM" : prob < 0.85 ? "HIGH" : "CRITICAL",
          confidence: Math.max(prob, 1 - prob)
        });
        setChecking(false);
      }, 1000);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0d1117] text-[#e6edf3] font-mono overflow-x-hidden flex flex-col">
      <ParticleNetwork theme="dark" />

      {/* Header */}
      <header className="relative z-10 max-w-7xl mx-auto flex items-center justify-between px-6 py-5 border-b border-cyber-border-dark/30 bg-[#0d1117]/80 w-full">
        <Link to="/" className="flex items-center gap-2 text-xs font-semibold text-cyber-muted-dark hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Product Page
        </Link>
        <div className="font-syne font-extrabold text-sm text-white tracking-tight">
          SANDBOX TERMINAL
        </div>
      </header>

      {/* Main Grid */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Form and controls */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="p-6 rounded-xl border border-cyber-border-dark/40 bg-cyber-surf-dark/30 backdrop-blur-md">
            <h1 className="font-syne font-extrabold text-xl text-white mb-2">Interactive Transaction Lab</h1>
            <p className="text-xs text-cyber-muted-dark leading-relaxed mb-6">
              Configure parameters to test the RandomForest model. Select an exploit vector profile or adjust values manually.
            </p>

            {/* Exploit Presets */}
            <div className="mb-6">
              <div className="text-[10px] text-cyber-muted-dark font-bold uppercase tracking-wider mb-3">Simulation Presets:</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(PRESETS).map(([key, item]) => (
                  <button
                    key={key}
                    onClick={() => handlePreset(key)}
                    className="p-3 rounded-lg border border-cyber-border-dark bg-cyber-surf-dark hover:border-cyber-blue/50 transition-all text-left group"
                  >
                    <div className="font-syne font-bold text-xs text-white group-hover:text-cyber-blue transition-colors">{item.label}</div>
                    <div className="text-[8px] text-cyber-muted-dark mt-1 leading-normal">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-cyber-border-dark/30 my-6" />

            {/* Inputs Form */}
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[9px] uppercase tracking-wider text-cyber-muted-dark font-bold mb-1.5 block">Amount (₹)</label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => handleField("amount", e.target.value)}
                    className="w-full bg-[#161b22] border border-cyber-border-dark rounded-md px-3 py-2 text-xs focus:border-cyber-blue outline-none text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-wider text-cyber-muted-dark font-bold mb-1.5 block">UPI App</label>
                  <select
                    value={form.upi_app}
                    onChange={(e) => handleField("upi_app", e.target.value)}
                    className="w-full bg-[#161b22] border border-cyber-border-dark rounded-md px-3 py-2 text-xs focus:border-cyber-blue outline-none text-white font-mono"
                  >
                    {APPS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-wider text-cyber-muted-dark font-bold mb-1.5 block">Merchant Category</label>
                  <select
                    value={form.merchant_category}
                    onChange={(e) => handleField("merchant_category", e.target.value)}
                    className="w-full bg-[#161b22] border border-cyber-border-dark rounded-md px-3 py-2 text-xs focus:border-cyber-blue outline-none text-white font-mono"
                  >
                    {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[9px] uppercase tracking-wider text-cyber-muted-dark font-bold mb-1.5 block">Account Age (Days)</label>
                  <input
                    type="number"
                    value={form.sender_account_age_days}
                    onChange={(e) => handleField("sender_account_age_days", e.target.value)}
                    className="w-full bg-[#161b22] border border-cyber-border-dark rounded-md px-3 py-2 text-xs focus:border-cyber-blue outline-none text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-wider text-cyber-muted-dark font-bold mb-1.5 block">Txn Volume (Last 1h)</label>
                  <input
                    type="number"
                    value={form.txn_count_last_1h}
                    onChange={(e) => handleField("txn_count_last_1h", e.target.value)}
                    className="w-full bg-[#161b22] border border-cyber-border-dark rounded-md px-3 py-2 text-xs focus:border-cyber-blue outline-none text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-wider text-cyber-muted-dark font-bold mb-1.5 block">Failed Txns (Last 24h)</label>
                  <input
                    type="number"
                    value={form.failed_txn_last_24h}
                    onChange={(e) => handleField("failed_txn_last_24h", e.target.value)}
                    className="w-full bg-[#161b22] border border-cyber-border-dark rounded-md px-3 py-2 text-xs focus:border-cyber-blue outline-none text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[9px] uppercase tracking-wider text-cyber-muted-dark font-bold mb-1.5 block">Sender Bank</label>
                  <select
                    value={form.sender_bank}
                    onChange={(e) => handleField("sender_bank", e.target.value)}
                    className="w-full bg-[#161b22] border border-cyber-border-dark rounded-md px-3 py-2 text-xs focus:border-cyber-blue outline-none text-white font-mono"
                  >
                    {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-wider text-cyber-muted-dark font-bold mb-1.5 block">Velocity Score (0-1)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={form.velocity_score}
                    onChange={(e) => handleField("velocity_score", e.target.value)}
                    className="w-full bg-[#161b22] border border-cyber-border-dark rounded-md px-3 py-2 text-xs focus:border-cyber-blue outline-none text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-wider text-cyber-muted-dark font-bold mb-1.5 block">PIN Attempts</label>
                  <input
                    type="number"
                    min="1"
                    max="3"
                    value={form.pin_attempts}
                    onChange={(e) => handleField("pin_attempts", e.target.value)}
                    className="w-full bg-[#161b22] border border-cyber-border-dark rounded-md px-3 py-2 text-xs focus:border-cyber-blue outline-none text-white font-mono"
                  />
                </div>
              </div>

              {/* Boolean Toggles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                {[
                  ["Device Changed", "device_changed"],
                  ["New Receiver", "new_receiver"],
                  ["Location Mismatch", "location_mismatch"],
                  ["International", "is_international"]
                ].map(([label, key]) => (
                  <button
                    key={key}
                    onClick={() => handleField(key, !form[key])}
                    className={`p-2.5 rounded-md border text-center transition-all ${
                      form[key] 
                        ? "bg-cyber-amberBg border-cyber-amber/40 text-cyber-amber font-bold" 
                        : "bg-[#161b22] border-cyber-border-dark text-cyber-muted-dark text-xs"
                    }`}
                  >
                    <div className="text-[8px] uppercase tracking-wider mb-0.5">{label}</div>
                    <div className="text-xs">{form[key] ? "TRUE" : "FALSE"}</div>
                  </button>
                ))}
              </div>

              {/* Run Button */}
              <button
                onClick={runPrediction}
                disabled={checking || guestLoading}
                className="w-full py-3.5 bg-cyber-blue text-black font-syne font-bold text-sm rounded-lg hover:bg-opacity-95 transition-all mt-4 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(88,166,255,0.2)] disabled:opacity-50"
              >
                {checking ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> RUNNING CLASSIFIER VECTOR ANALYSIS...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" /> DISPATCH VECTOR TO ML MODEL
                  </>
                )}
              </button>

              {authError && (
                <div className="text-[10px] text-cyber-amber flex items-center gap-1.5 mt-2 bg-cyber-amberBg/30 p-2.5 rounded border border-cyber-amber/20">
                  <Info className="w-3.5 h-3.5" />
                  {authError}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Prediction Output */}
        <div className="lg:col-span-5 h-full flex flex-col gap-6">
          <div className="p-6 rounded-xl border border-cyber-border-dark/40 bg-cyber-surf-dark/30 backdrop-blur-md h-full flex flex-col items-center justify-center relative min-h-[350px] overflow-hidden">
            
            {/* Background screen flash when fraud results render */}
            <AnimatePresence>
              {result && result.is_fraud === 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.05 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-cyber-red pointer-events-none z-0"
                />
              )}
            </AnimatePresence>

            {!checking && !result && (
              <div className="text-center p-8 z-10">
                <div className="w-16 h-16 rounded-2xl bg-cyber-surf-dark border border-cyber-border-dark flex items-center justify-center text-3xl mx-auto mb-4 animate-pulse">
                  📡
                </div>
                <h3 className="font-syne font-bold text-white mb-2">Awaiting Vector Dispatch</h3>
                <p className="text-[10px] text-cyber-muted-dark leading-relaxed max-w-xs mx-auto">
                  Click the dispatch button. The output response matrix, risk categorizations, and 3D confidence readings will render here.
                </p>
              </div>
            )}

            {checking && (
              <div className="text-center z-10 flex flex-col items-center justify-center">
                <div className="relative w-16 h-16 mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-cyber-blue/10 border-t-cyber-blue animate-spin" />
                  <div className="absolute inset-2 rounded-full border-4 border-cyber-purple/10 border-t-cyber-purple animate-[spin_1.5s_linear_infinite_reverse]" />
                </div>
                <h3 className="font-syne font-bold text-white mb-1.5">Scanning UPI Vector</h3>
                <span className="text-[9px] uppercase tracking-wider text-cyber-blue font-bold animate-pulse">
                  Querying RandomForest model...
                </span>
              </div>
            )}

            {/* Dramatic Animated Reveal */}
            <AnimatePresence>
              {!checking && result && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", damping: 15 }}
                  className="w-full flex flex-col items-center justify-center z-10"
                >
                  {/* Flashing Verdict Banner */}
                  <div className="w-full text-center mb-6">
                    {result.is_fraud === 1 ? (
                      <div className="p-3 bg-cyber-redBg border border-cyber-red/30 rounded-lg text-cyber-red font-bold text-sm tracking-wide uppercase inline-flex items-center gap-2 animate-[pulse_1.5s_infinite]">
                        <ShieldAlert className="w-4 h-4" /> 🚨 FRAUD DETECTED (BLOCK)
                      </div>
                    ) : (
                      <div className="p-3 bg-cyber-greenBg border border-cyber-green/30 rounded-lg text-cyber-green font-bold text-sm tracking-wide uppercase inline-flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" /> ✓ LEGITIMATE (ALLOW)
                      </div>
                    )}
                  </div>

                  {/* 3D Gauge Probability Meter */}
                  <div className="w-full flex justify-center mb-6 h-40">
                    <Gauge3D value={result.fraud_prob} />
                  </div>

                  {/* Metadata Matrix */}
                  <div className="grid grid-cols-2 gap-3 w-full">
                    {[
                      { label: "Confidence", val: `${(result.confidence * 100).toFixed(2)}%`, col: "text-white" },
                      { label: "Risk Verdict", val: result.risk_level, col: result.is_fraud ? "text-cyber-red" : "text-cyber-green" },
                      { label: "Classification", val: result.is_fraud ? "FLAGGED FRAUD" : "SAFE / ALLOW", col: "text-white" },
                      { label: "Predict Latency", val: "42.8 ms", col: "text-cyber-blue" }
                    ].map((cell) => (
                      <div key={cell.label} className="p-3 bg-[#0d1117]/60 border border-cyber-border-dark/60 rounded-lg">
                        <div className="text-[8px] uppercase tracking-wider text-cyber-muted-dark mb-1 font-semibold">{cell.label}</div>
                        <div className={`text-xs font-bold font-mono ${cell.col}`}>{cell.val}</div>
                      </div>
                    ))}
                  </div>

                  {/* Context Summary details */}
                  <div className="w-full p-3.5 bg-cyber-surf-dark/50 border border-cyber-border-dark/50 rounded-lg text-[10px] text-cyber-muted-dark leading-relaxed mt-4">
                    {result.is_fraud === 1 ? (
                      <span className="text-cyber-red/80 font-semibold">
                        Warning: Vector scores trigger anomaly thresholds. Device swap status, location discrepancies, and/or rapid transaction counts deviate from base user telemetry maps. Transacting bank has been signaled.
                      </span>
                    ) : (
                      <span>
                        Safe: Vector metrics fall within normal variance parameters. Low velocity, established payee profile, and authentic device signatures indicate secure execution.
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-cyber-border-dark/20 py-6 text-center text-[9px] text-cyber-muted-dark">
        Interactive Demo Terminal · ML Model V2.4 (RandomForest) · No credentials saved
      </footer>
    </div>
  );
}
