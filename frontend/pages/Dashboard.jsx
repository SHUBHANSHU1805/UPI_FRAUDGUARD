import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Shield,
  Activity,
  Layers,
  Settings,
  History as HistoryIcon,
  Power,
  Moon,
  Sun,
  Menu,
  X,
  AlertTriangle,
  Search,
  Filter,
  Sliders,
  ChevronRight,
  Database,
  ArrowUpRight,
  RefreshCw,
  Play,
  Pause
} from "lucide-react";
import { predictAPI } from "../src/api";
import { useAuth } from "../src/hooks/useAuth";
import Gauge3D from "../src/components/Gauge3D";
import RiskDonut3D from "../src/components/RiskDonut3D";
import ParticleNetwork from "../src/components/ParticleNetwork";

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

const RISK_COLORS = { LOW: "#3fb950", MEDIUM: "#d29922", HIGH: "#f85149", CRITICAL: "#ff4444" };
const RISK_BGS = { 
  LOW: "bg-cyber-greenBg/30 border-cyber-green/20 text-cyber-green", 
  MEDIUM: "bg-cyber-amberBg/30 border-cyber-amber/20 text-cyber-amber", 
  HIGH: "bg-cyber-redBg/30 border-cyber-red/20 text-cyber-red", 
  CRITICAL: "bg-[#3d0a0a]/30 border-[#ff4444]/20 text-[#ff4444]" 
};

// Count-up helper component for stats card
function AnimatedNumber({ value }) {
  const [displayValue, setDisplayValue] = useState(value);
  
  useEffect(() => {
    let start = displayValue;
    const end = value;
    if (start === end) return;
    
    const duration = 600; // ms
    const startTime = performance.now();
    let animationId;
    
    const update = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing function
      const easeOutQuad = progress * (2 - progress);
      const val = Math.floor(easeOutQuad * (end - start) + start);
      setDisplayValue(val);
      
      if (progress < 1) {
        animationId = requestAnimationFrame(update);
      }
    };
    
    animationId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationId);
  }, [value]);
  
  return <span>{displayValue.toLocaleString()}</span>;
}

function RiskBadge({ level, prob }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border ${RISK_BGS[level]}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: RISK_COLORS[level] }} />
      {level} · {(prob * 100).toFixed(0)}%
    </span>
  );
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  /* ── Layout & View states ── */
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("fraudguard_theme") || "dark");

  /* ── Data state ── */
  const [txns, setTxns] = useState([]);
  const [results, setResults] = useState({});
  const [stats, setStats] = useState({ total: 0, frauds: 0, blocked: 0 });
  const [riskCts, setRiskCts] = useState({ LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 });
  const [trend, setTrend] = useState(Array.from({ length: 14 }, (_, i) => ({ t: `${i * 5}s`, l: 0, f: 0 })));
  const [alert, setAlert] = useState(null);
  const [live, setLive] = useState(true);
  const [simSpeed, setSimSpeed] = useState(2000); // ms interval

  /* ── History filters ── */
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState("ALL");

  /* ── Checker form state ── */
  const [form, setForm] = useState({
    amount: "25000", upi_app: "GPay", sender_bank: "SBI", merchant_category: "Transfer",
    sender_account_age_days: "45", txn_count_last_1h: "6", txn_count_last_24h: "12",
    velocity_score: "0.75", device_changed: true, new_receiver: true,
    location_mismatch: true, is_international: false, failed_txn_last_24h: "1",
    pin_attempts: "2", avg_txn_amount_30d: "3000"
  });
  const [checking, setChecking] = useState(false);
  const [checkRes, setCheckRes] = useState(null);

  const sf = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const tf = (k) => setForm(p => ({ ...p, [k]: !p[k] }));

  // Theme effect
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
    localStorage.setItem("fraudguard_theme", theme);
  }, [theme]);

  /* ── process one transaction ── */
  const processTxn = useCallback(async (txn) => {
    const id = txn.transaction_id;
    setTxns(p => [txn, ...p.slice(0, 99)]); // keep up to 100 in session history
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

      /* trend update */
      const now = new Date();
      const tKey = `${now.getMinutes()}:${String(Math.floor(now.getSeconds() / 10) * 10).padStart(2, "0")}`;
      setTrend(p => {
        const last = p[p.length - 1];
        if (last && last.t === tKey)
          return [...p.slice(0, -1), { t: tKey, l: last.l + (result.is_fraud ? 0 : 1), f: last.f + result.is_fraud }];
        return [...p.slice(1), { t: tKey, l: result.is_fraud ? 0 : 1, f: result.is_fraud }];
      });

      // Show alert popups for High/Critical
      if (result.is_fraud && result.risk_level !== "LOW") {
        setAlert({ id: id.slice(-8), amount: txn.amount, risk: result.risk_level, prob: result.fraud_prob });
        // Close alert after 5s
        setTimeout(() => setAlert(null), 5000);
      }
    } catch (err) {
      console.error("Predict error", err);
    }
  }, []);

  /* ── live feed interval ── */
  useEffect(() => {
    if (!live) return;
    const iv = setInterval(() => processTxn(makeRandTxn()), simSpeed);
    return () => clearInterval(iv);
  }, [live, simSpeed, processTxn]);

  /* ── checker submit ── */
  async function analyzeForm() {
    setChecking(true); setCheckRes(null);
    const txn = {
      ...makeRandTxn(),
      amount: parseFloat(form.amount || 0),
      upi_app: form.upi_app, sender_bank: form.sender_bank,
      merchant_category: form.merchant_category,
      sender_account_age_days: parseInt(form.sender_account_age_days || 365),
      txn_count_last_1h: parseInt(form.txn_count_last_1h || 0),
      txn_count_last_24h: parseInt(form.txn_count_last_24h || 1),
      velocity_score: parseFloat(form.velocity_score || 0.1),
      device_changed: form.device_changed ? 1 : 0,
      new_receiver: form.new_receiver ? 1 : 0,
      location_mismatch: form.location_mismatch ? 1 : 0,
      is_international: form.is_international ? 1 : 0,
      failed_txn_last_24h: parseInt(form.failed_txn_last_24h || 0),
      pin_attempts: parseInt(form.pin_attempts || 1),
      avg_txn_amount_30d: parseFloat(form.avg_txn_amount_30d || form.amount || 1000),
      timestamp: new Date().toISOString(),
    };
    try {
      const { data } = await predictAPI.single(txn);
      // Wait slightly for gauge sweep effect
      setTimeout(() => {
        setCheckRes(data);
        setChecking(false);
      }, 500);
    } catch (e) { 
      console.error(e); 
      setChecking(false);
    }
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
      failed_txn_last_24h: String(t.failed_txn_last_24h),
      pin_attempts: String(t.pin_attempts),
      avg_txn_amount_30d: t.avg_txn_amount_30d.toFixed(0)
    });
    setCheckRes(null);
  }

  function handleLogout() { logout(); navigate("/login"); }

  const fraudRate = stats.total ? ((stats.frauds / stats.total) * 100).toFixed(1) : "0.0";
  
  const riskPieData = useMemo(() => {
    return Object.entries(riskCts)
      .map(([k, v]) => ({ name: k, value: v }))
      .filter(d => d.value > 0);
  }, [riskCts]);

  // Sidebar Links
  const links = [
    { id: "dashboard", label: "Overview", icon: <Layers className="w-4 h-4" /> },
    { id: "history", label: "Audit Log", icon: <HistoryIcon className="w-4 h-4" /> },
    { id: "checker", label: "Model Sandbox", icon: <Activity className="w-4 h-4" /> },
    { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
  ];

  /* ── History filter mappings ── */
  const filteredHistory = useMemo(() => {
    return txns.filter(t => {
      const res = results[t.transaction_id];
      const matchSearch = t.transaction_id.toLowerCase().includes(historySearch.toLowerCase()) || 
                          t.upi_app.toLowerCase().includes(historySearch.toLowerCase()) ||
                          t.merchant_category.toLowerCase().includes(historySearch.toLowerCase());
      if (historyFilter === "ALL") return matchSearch;
      if (historyFilter === "FRAUD") return matchSearch && res?.is_fraud === 1;
      if (historyFilter === "SAFE") return matchSearch && res?.is_fraud === 0;
      return matchSearch && res?.risk_level === historyFilter;
    });
  }, [txns, results, historySearch, historyFilter]);

  return (
    <div className="min-h-screen bg-cyber-bg-light dark:bg-cyber-bg-dark text-cyber-text-light dark:text-cyber-text-dark font-mono flex relative">
      <ParticleNetwork theme={theme} />

      {/* ── Swooping CRITICAL Threat Alert ── */}
      {alert && (
        <div 
          className={`fixed top-16 right-4 z-50 p-4 rounded-xl border w-80 shadow-2xl transition-all duration-300 ${
            alert.risk === "CRITICAL" 
              ? "bg-[#3d0a0a]/90 border-cyber-red text-cyber-red animate-shake shadow-[0_0_25px_rgba(248,81,73,0.35)]" 
              : "bg-cyber-redBg/90 border-cyber-red/50 text-white"
          }`}
          style={{ backdropFilter: "blur(8px)" }}
        >
          <div className="flex items-start justify-between">
            <div className="flex gap-2.5 items-start">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 animate-bounce" />
              <div>
                <div className="font-syne font-bold text-xs uppercase tracking-wider">
                  {alert.risk === "CRITICAL" ? "🔴 CRITICAL BREACH" : "🚨 FRAUD DETECTED"}
                </div>
                <div className="text-[10px] text-cyber-muted-light dark:text-cyber-muted-dark mt-1 leading-normal">
                  ID: <span className="font-bold text-white">{alert.id}</span> · {fmtINR(alert.amount)} <br />
                  Model Prob: <span className="font-bold text-white">{(alert.prob * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
            <button onClick={() => setAlert(null)} className="text-cyber-muted-dark hover:text-white font-bold leading-none text-base">
              ×
            </button>
          </div>
        </div>
      )}

      {/* ── Sidebar (Desktop) ── */}
      <aside 
        className={`hidden md:flex flex-col border-r border-cyber-border-light dark:border-cyber-border-dark bg-cyber-surf-light/50 dark:bg-cyber-surf-dark/50 backdrop-blur-md transition-all duration-300 z-20 ${
          sidebarCollapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-cyber-border-light dark:border-cyber-border-dark justify-between overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyber-redBg border border-cyber-red/30 flex items-center justify-center flex-shrink-0">
              🛡
            </div>
            {!sidebarCollapsed && (
              <div>
                <span className="font-syne font-extrabold text-sm text-cyber-text-light dark:text-white leading-none block">
                  FraudGuard
                </span>
                <span className="text-[8px] uppercase tracking-wider text-cyber-muted-dark block">
                  ML SOC Console
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Links */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1.5">
          {links.map((link) => (
            <button
              key={link.id}
              onClick={() => setActiveTab(link.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all group ${
                activeTab === link.id
                  ? "bg-cyber-blue text-black shadow-[0_0_15px_rgba(88,166,255,0.15)] font-bold"
                  : "text-cyber-muted-light dark:text-cyber-muted-dark hover:bg-cyber-surf2-light dark:hover:bg-cyber-surf2-dark hover:text-cyber-text-light dark:hover:text-white"
              }`}
            >
              <span className={activeTab === link.id ? "text-black" : "text-cyber-muted-light dark:text-cyber-muted-dark group-hover:text-cyber-blue transition-colors"}>
                {link.icon}
              </span>
              {!sidebarCollapsed && <span>{link.label}</span>}
            </button>
          ))}
        </nav>

        {/* Sidebar Toggle */}
        <div className="p-3 border-t border-cyber-border-light dark:border-cyber-border-dark">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full py-2 bg-cyber-surf2-light dark:bg-cyber-surf2-dark rounded-lg flex items-center justify-center text-cyber-muted-dark hover:text-cyber-blue transition-colors text-xs font-bold"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : "Collapse Console"}
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Header / Navbar */}
        <header className="h-16 border-b border-cyber-border-light dark:border-cyber-border-dark bg-cyber-surf-light/50 dark:bg-cyber-surf-dark/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Hamburger on Mobile */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg bg-cyber-surf2-light dark:bg-cyber-surf2-dark text-cyber-muted-light dark:text-cyber-muted-dark"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-syne font-extrabold text-base md:text-lg text-cyber-text-light dark:text-white capitalize">
              {activeTab === "checker" ? "Sandbox Simulation" : activeTab === "history" ? "Audit Log ledger" : activeTab}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Feed Controller */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyber-surf2-light dark:bg-cyber-surf2-dark border border-cyber-border-light dark:border-cyber-border-dark">
              <span className="flex items-center gap-1.5 text-[9px] font-bold">
                <span className={`w-1.5 h-1.5 rounded-full ${live ? "bg-cyber-green animate-ping" : "bg-cyber-muted-dark"}`} />
                FEED: <span className={live ? "text-cyber-green" : "text-cyber-muted-dark"}>{live ? "LIVE" : "PAUSED"}</span>
              </span>
              <button 
                onClick={() => setLive(!live)}
                className="p-1 rounded bg-[#0d1117]/30 border border-cyber-border-light dark:border-cyber-border-dark hover:border-cyber-blue transition-all"
              >
                {live ? <Pause className="w-3 h-3 text-cyber-red" /> : <Play className="w-3 h-3 text-cyber-green" />}
              </button>
            </div>

            {/* Dark/Light Mode toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg bg-cyber-surf2-light dark:bg-cyber-surf2-dark border border-cyber-border-light dark:border-cyber-border-dark text-cyber-muted-light dark:text-cyber-muted-dark hover:text-cyber-blue transition-all"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-cyber-amber" /> : <Moon className="w-4 h-4 text-cyber-purple" />}
            </button>

            {/* User Profile */}
            <div className="hidden md:flex items-center gap-2.5 pl-4 border-l border-cyber-border-light dark:border-cyber-border-dark">
              <div className="text-right">
                <div className="text-xs font-bold text-cyber-text-light dark:text-white leading-tight">{user?.name || "Operator"}</div>
                <span className="text-[8px] uppercase tracking-wider text-cyber-amber font-bold bg-cyber-amberBg border border-cyber-amber/20 px-1.5 py-0.5 rounded">
                  {user?.role || "analyst"}
                </span>
              </div>
            </div>

            {/* Signout button */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg border border-cyber-red/20 hover:border-cyber-red/50 bg-cyber-redBg/30 hover:bg-cyber-redBg/60 text-cyber-red transition-all"
            >
              <Power className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ── Views Router Switcher ── */}
        <div className="p-6 max-w-7xl w-full mx-auto flex-1 flex flex-col gap-6">

          {/* Tab 1: Dashboard Overview */}
          {activeTab === "dashboard" && (
            <div className="flex flex-col gap-6">
              {/* Stats Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Monitored", val: stats.total, sub: "this session", color: "border-t-cyber-blue text-cyber-blue" },
                  { label: "Flagged Frauds", val: stats.frauds, sub: `${fraudRate}% detection rate`, color: "border-t-cyber-red text-cyber-red" },
                  { label: "High-Risk Blocked", val: stats.blocked, sub: "automated drop logs", color: "border-t-cyber-amber text-cyber-amber" },
                  { label: "Model Precision", val: 1.00, sub: "RandomForest ML core", color: "border-t-cyber-purple text-cyber-purple", isDecimal: true }
                ].map((stat) => (
                  <div key={stat.label} className={`p-4 rounded-xl border border-cyber-border-light dark:border-cyber-border-dark bg-cyber-surf-light dark:bg-cyber-surf-dark shadow-sm border-t-2 ${stat.color}`}>
                    <div className="text-[9px] uppercase tracking-wider text-cyber-muted-light dark:text-cyber-muted-dark font-bold mb-1.5">{stat.label}</div>
                    <div className="text-2xl font-syne font-extrabold tracking-tight">
                      {stat.isDecimal ? "1.00" : <AnimatedNumber value={stat.val} />}
                    </div>
                    <div className="text-[9px] text-cyber-muted-light dark:text-cyber-muted-dark mt-1 font-semibold">{stat.sub}</div>
                  </div>
                ))}
              </div>

              {/* Feed and Checker Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Column: Transaction Checker Form summary (quick checker redirect) */}
                <div className="lg:col-span-4 p-5 rounded-xl border border-cyber-border-light dark:border-cyber-border-dark bg-cyber-surf-light dark:bg-cyber-surf-dark flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-3 border-b border-cyber-border-light dark:border-cyber-border-dark">
                    <span className="font-syne font-bold text-xs">Vector Classifier</span>
                    <Activity className="w-4 h-4 text-cyber-blue" />
                  </div>
                  <p className="text-[10px] text-cyber-muted-light dark:text-cyber-muted-dark leading-relaxed">
                    Evaluate suspect transaction vectors manually using our mock dashboard simulator. Adjust variables across 17 attributes.
                  </p>
                  <button
                    onClick={() => setActiveTab("checker")}
                    className="w-full py-2 bg-cyber-surf2-light dark:bg-cyber-surf2-dark hover:bg-cyber-blue/15 hover:border-cyber-blue border border-cyber-border-light dark:border-cyber-border-dark rounded-lg text-xs font-semibold text-cyber-text-light dark:text-white transition-all flex items-center justify-center gap-1.5"
                  >
                    Open Model Sandbox <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <hr className="border-cyber-border-light dark:border-cyber-border-dark" />
                  
                  {/* System details */}
                  <div className="flex flex-col gap-2.5 text-[9px] text-cyber-muted-light dark:text-cyber-muted-dark font-semibold">
                    <div className="flex justify-between"><span>ROC-AUC score</span><span className="text-cyber-purple font-bold">1.00</span></div>
                    <div className="flex justify-between"><span>F1 parameters</span><span className="text-cyber-green font-bold">1.00</span></div>
                    <div className="flex justify-between"><span>VPA bank integrations</span><span className="text-cyber-amber font-bold">8 active</span></div>
                  </div>
                </div>

                {/* Right Column: Live feed */}
                <div className="lg:col-span-8 p-5 rounded-xl border border-cyber-border-light dark:border-cyber-border-dark bg-cyber-surf-light dark:bg-cyber-surf-dark flex flex-col gap-3 min-h-[320px]">
                  <div className="flex items-center justify-between pb-2 border-b border-cyber-border-light dark:border-cyber-border-dark">
                    <div>
                      <span className="font-syne font-bold text-xs block">Live Monitor Feed</span>
                      <span className="text-[9px] text-cyber-muted-light dark:text-cyber-muted-dark mt-0.5 block font-semibold">
                        Showing last 10 session scans
                      </span>
                    </div>
                    <div className="text-[9px] font-bold text-cyber-muted-light dark:text-cyber-muted-dark flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-cyber-surf2-light dark:bg-cyber-surf2-dark border border-cyber-border-light dark:border-cyber-border-dark">
                        {txns.length} Monitored
                      </span>
                    </div>
                  </div>

                  {/* Header Row */}
                  <div className="grid grid-cols-12 gap-2 text-[9px] font-bold text-cyber-muted-light dark:text-cyber-muted-dark uppercase tracking-wider pb-1.5 border-b border-cyber-border-light/40 dark:border-cyber-border-dark/40 px-2 select-none">
                    <span className="col-span-3">TXN ID</span>
                    <span className="col-span-2">Amount</span>
                    <span className="col-span-2">App</span>
                    <span className="col-span-3">Category</span>
                    <span className="col-span-2 text-right">Risk Score</span>
                  </div>

                  {/* Transaction List */}
                  <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
                    {txns.length === 0 ? (
                      <div className="py-20 text-center text-cyber-muted-light dark:text-cyber-muted-dark text-xs flex flex-col items-center justify-center gap-2 select-none">
                        <Database className="w-8 h-8 opacity-25 animate-pulse text-cyber-blue" />
                        <span>Awaiting transaction stream ingestion...</span>
                      </div>
                    ) : (
                      txns.slice(0, 10).map((txn) => {
                        const result = results[txn.transaction_id];
                        return (
                          <div 
                            key={txn.transaction_id}
                            className={`grid grid-cols-12 gap-2 px-2 py-2.5 rounded-lg border text-xs items-center transition-all duration-300 ${
                              result?.is_fraud 
                                ? "bg-cyber-redBg/20 border-cyber-red/20 text-cyber-red hover:bg-cyber-redBg/40" 
                                : "bg-cyber-surf2-light/30 dark:bg-[#1c212a]/30 border-cyber-border-light/50 dark:border-cyber-border-dark/50 hover:bg-cyber-surf2-light/60 dark:hover:bg-cyber-surf2-dark/60 text-cyber-text-light dark:text-[#c9d1d9]"
                            }`}
                          >
                            <span className="col-span-3 font-semibold text-[10px] text-cyber-muted-light dark:text-cyber-muted-dark">
                              {txn.transaction_id.slice(-8)}
                            </span>
                            <span className="col-span-2 font-bold font-mono">
                              {fmtINR(txn.amount)}
                            </span>
                            <span className="col-span-2 text-[10px]">
                              {txn.upi_app}
                            </span>
                            <span className="col-span-3 text-[10px] truncate">
                              {txn.merchant_category}
                            </span>
                            <span className="col-span-2 text-right">
                              {result ? (
                                <RiskBadge level={result.risk_level} prob={result.fraud_prob} />
                              ) : (
                                <span className="text-[9px] text-cyber-muted-dark animate-pulse">scanning...</span>
                              )}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

              {/* Bottom Row Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Trend Chart (8 cols) */}
                <div className="lg:col-span-7 p-5 rounded-xl border border-cyber-border-light dark:border-cyber-border-dark bg-cyber-surf-light dark:bg-cyber-surf-dark">
                  <div className="flex items-center justify-between pb-4">
                    <span className="font-syne font-bold text-xs">Live Detection Velocity</span>
                    <div className="flex gap-4 text-[9px] font-bold">
                      <span className="flex items-center gap-1.5 text-cyber-green">
                        <span className="w-2 h-2 rounded bg-cyber-green inline-block" /> LEGIT
                      </span>
                      <span className="flex items-center gap-1.5 text-cyber-red">
                        <span className="w-2 h-2 rounded bg-cyber-red inline-block" /> FRAUD
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trend} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
                        <defs>
                          <linearGradient id="legitGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={RISK_COLORS.LOW} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={RISK_COLORS.LOW} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="fraudGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={RISK_COLORS.HIGH} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={RISK_COLORS.HIGH} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#21262d" : "#e2e8f0"} />
                        <XAxis dataKey="t" tick={{ fill: "#8b949e", fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#8b949e", fontSize: 9 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ 
                          backgroundColor: theme === "dark" ? "#161b22" : "#ffffff", 
                          borderColor: theme === "dark" ? "#30363d" : "#cbd5e1",
                          color: theme === "dark" ? "#e6edf3" : "#1f2937",
                          fontSize: 10,
                          fontFamily: "monospace"
                        }} />
                        <Area type="monotone" dataKey="l" stroke={RISK_COLORS.LOW} fill="url(#legitGrad)" strokeWidth={2} dot={false} name="Legitimate" />
                        <Area type="monotone" dataKey="f" stroke={RISK_COLORS.HIGH} fill="url(#fraudGrad)" strokeWidth={2} dot={false} name="Flagged Fraud" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Risk Distribution 3D Pie Chart (5 cols) */}
                <div className="lg:col-span-5 p-5 rounded-xl border border-cyber-border-light dark:border-cyber-border-dark bg-cyber-surf-light dark:bg-cyber-surf-dark flex flex-col justify-between">
                  <div>
                    <span className="font-syne font-bold text-xs block">Threat Breakdown</span>
                    <span className="text-[9px] text-cyber-muted-light dark:text-cyber-muted-dark mt-0.5 block font-semibold">
                      Session-wide classification ratio
                    </span>
                  </div>

                  <div className="my-2.5 h-32 flex items-center justify-center">
                    <RiskDonut3D data={riskPieData} />
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center pb-1">
                    {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((level) => {
                      const count = riskCts[level] || 0;
                      return (
                        <div key={level} className="flex items-center gap-1.5 text-[9px] font-semibold">
                          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: RISK_COLORS[level] }} />
                          <span className="text-cyber-muted-light dark:text-cyber-muted-dark uppercase">{level}</span>
                          <span className="text-cyber-text-light dark:text-white font-bold font-mono">({count})</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Tab 2: Audit History Ledger */}
          {activeTab === "history" && (
            <div className="p-6 rounded-xl border border-cyber-border-light dark:border-cyber-border-dark bg-cyber-surf-light dark:bg-cyber-surf-dark flex flex-col gap-6">
              
              {/* Search & Filter Header */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-cyber-border-light dark:border-cyber-border-dark">
                
                {/* Search */}
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-muted-dark" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search by ID, App, or category..."
                    className="w-full bg-cyber-surf2-light dark:bg-[#161b22] border border-cyber-border-light dark:border-cyber-border-dark rounded-lg pl-9 pr-4 py-2 text-xs focus:border-cyber-blue outline-none text-cyber-text-light dark:text-white"
                  />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Filter className="w-4 h-4 text-cyber-muted-dark hidden sm:block" />
                  <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                    {["ALL", "SAFE", "FRAUD", "LOW", "MEDIUM", "HIGH", "CRITICAL"].map((f) => (
                      <button
                        key={f}
                        onClick={() => setHistoryFilter(f)}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold border transition-all ${
                          historyFilter === f
                            ? "bg-cyber-blue border-cyber-blue text-black"
                            : "bg-cyber-surf2-light dark:bg-cyber-surf-dark border-cyber-border-light dark:border-cyber-border-dark text-cyber-muted-light dark:text-cyber-muted-dark hover:text-cyber-text-light dark:hover:text-white"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Session History List */}
              <div className="flex flex-col gap-2">
                
                {/* Header columns */}
                <div className="grid grid-cols-12 gap-3 px-3 py-2 text-[9px] font-bold text-cyber-muted-light dark:text-cyber-muted-dark uppercase tracking-wider border-b border-cyber-border-light/60 dark:border-cyber-border-dark/60 select-none">
                  <span className="col-span-3">Timestamp / Transaction ID</span>
                  <span className="col-span-2">Telemetry (App/Bank)</span>
                  <span className="col-span-2 text-right">Amount (₹)</span>
                  <span className="col-span-3">Signals (Velocity/Failures)</span>
                  <span className="col-span-2 text-right">Verdict Score</span>
                </div>

                <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[500px]">
                  {filteredHistory.length === 0 ? (
                    <div className="py-24 text-center text-cyber-muted-light dark:text-cyber-muted-dark text-xs flex flex-col items-center justify-center gap-2 select-none">
                      <Search className="w-10 h-10 opacity-25 text-cyber-blue animate-bounce" />
                      <span>No matching ledger items found in active session history.</span>
                    </div>
                  ) : (
                    filteredHistory.map((t) => {
                      const res = results[t.transaction_id];
                      return (
                        <div
                          key={t.transaction_id}
                          className={`grid grid-cols-12 gap-3 px-3 py-3 rounded-lg border text-xs items-center transition-colors ${
                            res?.is_fraud
                              ? "bg-cyber-redBg/10 border-cyber-red/20 text-cyber-red hover:bg-cyber-redBg/20"
                              : "bg-[#161b22]/10 hover:bg-[#161b22]/30 border-cyber-border-light/60 dark:border-cyber-border-dark/50 text-cyber-text-light dark:text-[#c9d1d9]"
                          }`}
                        >
                          {/* Col 1 */}
                          <div className="col-span-3 flex flex-col gap-0.5">
                            <span className="text-[10px] text-cyber-muted-light dark:text-cyber-muted-dark">
                              {new Date(t.timestamp).toLocaleTimeString()}
                            </span>
                            <span className="font-semibold font-mono text-cyber-text-light dark:text-white">
                              {t.transaction_id}
                            </span>
                          </div>

                          {/* Col 2 */}
                          <div className="col-span-2 flex flex-col gap-0.5">
                            <span className="text-[10px] font-bold text-cyber-text-light dark:text-white">
                              {t.upi_app}
                            </span>
                            <span className="text-[9px] text-cyber-muted-light dark:text-cyber-muted-dark">
                              {t.sender_bank} → {t.receiver_bank}
                            </span>
                          </div>

                          {/* Col 3 */}
                          <span className="col-span-2 text-right font-bold font-mono text-xs">
                            {fmtINR(t.amount)}
                          </span>

                          {/* Col 4 */}
                          <div className="col-span-3 flex flex-wrap gap-x-2 gap-y-1 text-[9px] text-cyber-muted-light dark:text-cyber-muted-dark font-bold font-mono">
                            <span>VEL: {t.velocity_score}</span>
                            <span>AGE: {t.sender_account_age_days}d</span>
                            {t.device_changed === 1 && <span className="text-cyber-amber">DEV_CHG</span>}
                            {t.location_mismatch === 1 && <span className="text-cyber-amber">LOC_MIS</span>}
                          </div>

                          {/* Col 5 */}
                          <span className="col-span-2 text-right">
                            {res ? (
                              <RiskBadge level={res.risk_level} prob={res.fraud_prob} />
                            ) : (
                              <span className="text-[9px] text-cyber-muted-dark animate-pulse">scanning...</span>
                            )}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>

            </div>
          )}

          {/* Tab 3: Model Sandbox Checker */}
          {activeTab === "checker" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Form panel (7 cols) */}
              <div className="lg:col-span-7 p-6 rounded-xl border border-cyber-border-light dark:border-cyber-border-dark bg-cyber-surf-light dark:bg-cyber-surf-dark flex flex-col gap-5">
                <div className="flex items-center justify-between pb-3 border-b border-cyber-border-light dark:border-cyber-border-dark">
                  <div>
                    <span className="font-syne font-bold text-sm block">Manual Vector Dispatch</span>
                    <span className="text-[9px] text-cyber-muted-light dark:text-cyber-muted-dark mt-0.5 block font-semibold">
                      Assess suspicious parameters across 17 attributes
                    </span>
                  </div>
                  <button
                    onClick={randomizeForm}
                    className="px-3 py-1.5 bg-cyber-surf2-light dark:bg-cyber-surf2-dark hover:border-cyber-blue hover:text-cyber-blue border border-cyber-border-light dark:border-cyber-border-dark rounded-lg text-[10px] font-bold text-cyber-muted-light dark:text-cyber-muted-dark transition-all"
                  >
                    ↻ Randomize Parameters
                  </button>
                </div>

                <div className="flex flex-col gap-4">
                  {/* Grid Rows */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[9px] uppercase tracking-wider text-cyber-muted-light dark:text-cyber-muted-dark font-bold block mb-1.5">Amount (₹)</label>
                      <input type="number" value={form.amount} onChange={sf("amount")} className="w-full bg-cyber-surf2-light dark:bg-[#161b22] border border-cyber-border-light dark:border-cyber-border-dark rounded-lg px-3 py-2 text-xs focus:border-cyber-blue outline-none text-cyber-text-light dark:text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-wider text-cyber-muted-light dark:text-cyber-muted-dark font-bold block mb-1.5">UPI App</label>
                      <select value={form.upi_app} onChange={sf("upi_app")} className="w-full bg-cyber-surf2-light dark:bg-[#161b22] border border-cyber-border-light dark:border-cyber-border-dark rounded-lg px-3 py-2 text-xs focus:border-cyber-blue outline-none text-cyber-text-light dark:text-white">
                        {APPS.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-wider text-cyber-muted-light dark:text-cyber-muted-dark font-bold block mb-1.5">Category</label>
                      <select value={form.merchant_category} onChange={sf("merchant_category")} className="w-full bg-cyber-surf2-light dark:bg-[#161b22] border border-cyber-border-light dark:border-cyber-border-dark rounded-lg px-3 py-2 text-xs focus:border-cyber-blue outline-none text-cyber-text-light dark:text-white">
                        {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[9px] uppercase tracking-wider text-cyber-muted-light dark:text-cyber-muted-dark font-bold block mb-1.5">Account Age (Days)</label>
                      <input type="number" value={form.sender_account_age_days} onChange={sf("sender_account_age_days")} className="w-full bg-cyber-surf2-light dark:bg-[#161b22] border border-cyber-border-light dark:border-cyber-border-dark rounded-lg px-3 py-2 text-xs focus:border-cyber-blue outline-none text-cyber-text-light dark:text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-wider text-cyber-muted-light dark:text-cyber-muted-dark font-bold block mb-1.5">Txn Vol (Last 1h)</label>
                      <input type="number" value={form.txn_count_last_1h} onChange={sf("txn_count_last_1h")} className="w-full bg-cyber-surf2-light dark:bg-[#161b22] border border-cyber-border-light dark:border-cyber-border-dark rounded-lg px-3 py-2 text-xs focus:border-cyber-blue outline-none text-cyber-text-light dark:text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-wider text-cyber-muted-light dark:text-cyber-muted-dark font-bold block mb-1.5">Failed Txn (Last 24h)</label>
                      <input type="number" value={form.failed_txn_last_24h} onChange={sf("failed_txn_last_24h")} className="w-full bg-cyber-surf2-light dark:bg-[#161b22] border border-cyber-border-light dark:border-cyber-border-dark rounded-lg px-3 py-2 text-xs focus:border-cyber-blue outline-none text-cyber-text-light dark:text-white font-mono" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[9px] uppercase tracking-wider text-cyber-muted-light dark:text-cyber-muted-dark font-bold block mb-1.5">Sender Bank</label>
                      <select value={form.sender_bank} onChange={sf("sender_bank")} className="w-full bg-cyber-surf2-light dark:bg-[#161b22] border border-cyber-border-light dark:border-cyber-border-dark rounded-lg px-3 py-2 text-xs focus:border-cyber-blue outline-none text-cyber-text-light dark:text-white">
                        {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-wider text-cyber-muted-light dark:text-cyber-muted-dark font-bold block mb-1.5">Velocity Score (0-1)</label>
                      <input type="number" step="0.01" value={form.velocity_score} onChange={sf("velocity_score")} className="w-full bg-cyber-surf2-light dark:bg-[#161b22] border border-cyber-border-light dark:border-cyber-border-dark rounded-lg px-3 py-2 text-xs focus:border-cyber-blue outline-none text-cyber-text-light dark:text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-wider text-cyber-muted-light dark:text-cyber-muted-dark font-bold block mb-1.5">PIN Attempts</label>
                      <input type="number" value={form.pin_attempts} onChange={sf("pin_attempts")} className="w-full bg-cyber-surf2-light dark:bg-[#161b22] border border-cyber-border-light dark:border-cyber-border-dark rounded-lg px-3 py-2 text-xs focus:border-cyber-blue outline-none text-cyber-text-light dark:text-white font-mono" />
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2">
                    {[
                      ["Device Changed", "device_changed"],
                      ["New Receiver", "new_receiver"],
                      ["Location Mismatch", "location_mismatch"],
                      ["International", "is_international"]
                    ].map(([lbl, k]) => (
                      <button
                        key={k}
                        onClick={() => tf(k)}
                        className={`p-2.5 rounded-lg border text-center transition-all ${
                          form[k]
                            ? "bg-cyber-amberBg/40 border-cyber-amber/40 text-cyber-amber font-bold"
                            : "bg-cyber-surf2-light dark:bg-[#161b22] border-cyber-border-light dark:border-cyber-border-dark text-cyber-muted-light dark:text-cyber-muted-dark"
                        }`}
                      >
                        <div className="text-[8px] uppercase tracking-wider mb-0.5">{lbl}</div>
                        <div className="text-xs">{form[k] ? "TRUE" : "FALSE"}</div>
                      </button>
                    ))}
                  </div>

                  {/* Action Dispatch */}
                  <button
                    onClick={analyzeForm}
                    disabled={checking}
                    className="w-full py-3.5 bg-cyber-blue text-black font-syne font-bold text-xs rounded-lg hover:bg-opacity-90 transition-all mt-3 shadow-[0_0_20px_rgba(88,166,255,0.15)] flex items-center justify-center gap-1.5"
                  >
                    {checking ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> PIPELINING VECTOR CLASSIFICATION...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" /> DISPATCH PARAMETERS TO ML MODEL
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Output Response details (5 cols) */}
              <div className="lg:col-span-5 p-6 rounded-xl border border-cyber-border-light dark:border-cyber-border-dark bg-cyber-surf-light dark:bg-cyber-surf-dark min-h-[350px] flex flex-col items-center justify-center relative overflow-hidden">
                
                {/* Background screen flash when fraud results render */}
                {checkRes && checkRes.is_fraud === 1 && (
                  <div className="absolute inset-0 bg-cyber-red/5 pointer-events-none z-0" />
                )}

                {!checking && !checkRes && (
                  <div className="text-center p-6 z-10 select-none">
                    <div className="w-16 h-16 rounded-2xl bg-cyber-surf2-light dark:bg-[#161b22] border border-cyber-border-light dark:border-cyber-border-dark flex items-center justify-center text-3xl mx-auto mb-4 animate-pulse">
                      📡
                    </div>
                    <h3 className="font-syne font-bold text-cyber-text-light dark:text-white mb-2">Awaiting Vector Dispatch</h3>
                    <p className="text-[10px] text-cyber-muted-light dark:text-cyber-muted-dark leading-relaxed max-w-xs mx-auto">
                      Fill parameters in the Sandbox form and trigger the dispatch. Output matrix and 3D Gauge results will render here.
                    </p>
                  </div>
                )}

                {checking && (
                  <div className="text-center z-10 flex flex-col items-center justify-center">
                    <div className="relative w-16 h-16 mb-4">
                      <div className="absolute inset-0 rounded-full border-4 border-cyber-blue/15 border-t-cyber-blue animate-spin" />
                      <div className="absolute inset-2 rounded-full border-4 border-cyber-purple/15 border-t-cyber-purple animate-[spin_1.2s_linear_infinite_reverse]" />
                    </div>
                    <h3 className="font-syne font-bold text-cyber-text-light dark:text-white mb-1">Scanning Vector Matrix</h3>
                    <span className="text-[9px] uppercase tracking-wider text-cyber-blue font-bold animate-pulse">
                      Processing RF Decision boundaries
                    </span>
                  </div>
                )}

                {!checking && checkRes && (
                  <div className="w-full flex flex-col items-center justify-center z-10">
                    
                    {/* Header Alert banner */}
                    <div className="w-full text-center mb-6">
                      {checkRes.is_fraud === 1 ? (
                        <div className="p-3 bg-cyber-redBg border border-cyber-red/30 rounded-lg text-cyber-red font-bold text-xs tracking-wide uppercase inline-flex items-center gap-2 animate-[pulse_1.5s_infinite]">
                          <AlertTriangle className="w-4 h-4 animate-bounce" /> 🚨 FRAUD VECTORS CONFIRMED (BLOCK)
                        </div>
                      ) : (
                        <div className="p-3 bg-cyber-greenBg border border-cyber-green/30 rounded-lg text-cyber-green font-bold text-xs tracking-wide uppercase inline-flex items-center gap-2">
                          ✓ SECURE VECTOR (ALLOW)
                        </div>
                      )}
                    </div>

                    {/* 3D Gauge */}
                    <div className="w-full h-40 flex justify-center mb-4">
                      <Gauge3D value={checkRes.fraud_prob} />
                    </div>

                    {/* Output Matrix Grid */}
                    <div className="grid grid-cols-2 gap-3 w-full mt-2">
                      {[
                        { label: "Predict Confidence", val: `${(checkRes.confidence * 100).toFixed(1)}%`, col: "text-cyber-text-light dark:text-white" },
                        { label: "Threat Verdict", val: checkRes.risk_level, col: checkRes.is_fraud ? "text-cyber-red" : "text-cyber-green" },
                        { label: "Ledger status", val: checkRes.is_fraud ? "SUSPENDED" : "AUTHORIZED", col: "text-cyber-text-light dark:text-white" },
                        { label: "VPA classification", val: checkRes.is_fraud ? "MALICIOUS" : "SAFE / REGISTERED", col: "text-cyber-text-light dark:text-white" }
                      ].map((cell) => (
                        <div key={cell.label} className="p-3 bg-cyber-surf2-light dark:bg-[#0d1117] border border-cyber-border-light dark:border-cyber-border-dark rounded-lg">
                          <div className="text-[8px] uppercase tracking-wider text-cyber-muted-light dark:text-cyber-muted-dark mb-1 font-bold">{cell.label}</div>
                          <div className={`text-xs font-bold font-mono ${cell.col}`}>{cell.val}</div>
                        </div>
                      ))}
                    </div>

                  </div>
                )}
              </div>

            </div>
          )}

          {/* Tab 4: Settings Config */}
          {activeTab === "settings" && (
            <div className="max-w-xl mx-auto p-6 rounded-xl border border-cyber-border-light dark:border-cyber-border-dark bg-cyber-surf-light dark:bg-cyber-surf-dark flex flex-col gap-6">
              <h2 className="font-syne font-extrabold text-sm text-cyber-text-light dark:text-white pb-3 border-b border-cyber-border-light dark:border-cyber-border-dark flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyber-blue" />
                Console Configurations
              </h2>

              {/* Ingestion speed */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>Live Stream Ingestion Delay</span>
                  <span className="text-cyber-blue font-mono">{simSpeed / 1000}s</span>
                </div>
                <input
                  type="range"
                  min="800"
                  max="5000"
                  step="200"
                  value={simSpeed}
                  onChange={(e) => setSimSpeed(parseInt(e.target.value))}
                  className="w-full accent-cyber-blue bg-cyber-surf2-light dark:bg-cyber-surf2-dark rounded-lg appearance-none h-1.5 cursor-pointer"
                />
                <span className="text-[9px] text-cyber-muted-light dark:text-cyber-muted-dark leading-normal">
                  Controls how frequently synthetic transaction vectors are generated and dispatched to the prediction endpoint.
                </span>
              </div>

              <hr className="border-cyber-border-light dark:border-cyber-border-dark" />

              {/* Bank mapping Scopes */}
              <div className="flex flex-col gap-3">
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-cyber-purple" />
                  API Scopes & Model Summary
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono leading-relaxed bg-cyber-surf2-light dark:bg-[#0d1117] p-4 border border-cyber-border-light dark:border-cyber-border-dark rounded-lg">
                  <div>Model Type:</div><div className="font-bold text-cyber-purple">RandomForestClassifier</div>
                  <div>Base Estimators:</div><div className="font-bold text-cyber-text-light dark:text-white">100 trees</div>
                  <div>Class Balancing:</div><div className="font-bold text-cyber-text-light dark:text-white">SMOTE (Over-sampling)</div>
                  <div>Features Evaluated:</div><div className="font-bold text-cyber-blue">17 attributes</div>
                  <div>Audit DB:</div><div className="font-bold text-cyber-green">SQLite3 Active</div>
                </div>
              </div>

              <hr className="border-cyber-border-light dark:border-cyber-border-dark" />

              {/* Operators details */}
              <div className="text-[10px] text-cyber-muted-light dark:text-cyber-muted-dark leading-relaxed flex gap-2">
                <Info className="w-4 h-4 text-cyber-amber flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-cyber-amber font-bold">Scope Warning:</span> Configurations are applied to the active session workspace. Toggling themes or pausing feeds changes browser-level states and token requests will continue auto-refreshing in the background.
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* ── Mobile Sidebar Drawer Drawer ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer content */}
          <div className="relative w-64 bg-cyber-bg-light dark:bg-cyber-bg-dark border-r border-cyber-border-light dark:border-cyber-border-dark flex flex-col z-10">
            <div className="h-16 flex items-center px-4 justify-between border-b border-cyber-border-light dark:border-cyber-border-dark">
              <div className="flex items-center gap-2">
                <span className="font-syne font-extrabold text-sm text-cyber-text-light dark:text-white">🛡 SOC Console</span>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg bg-cyber-surf2-light dark:bg-cyber-surf2-dark text-cyber-muted-dark"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <nav className="flex-1 p-3 flex flex-col gap-1.5">
              {links.map((link) => (
                <button
                  key={link.id}
                  onClick={() => {
                    setActiveTab(link.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold ${
                    activeTab === link.id
                      ? "bg-cyber-blue text-black font-bold"
                      : "text-cyber-muted-light dark:text-cyber-muted-dark hover:bg-cyber-surf2-light dark:hover:bg-cyber-surf2-dark"
                  }`}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </button>
              ))}
            </nav>
            
            <div className="p-4 border-t border-cyber-border-light dark:border-cyber-border-dark flex items-center gap-2">
              <div className="text-xs font-bold">{user?.name || "Operator"}</div>
              <span className="text-[8px] uppercase tracking-wider text-cyber-amber font-bold bg-cyber-amberBg px-1.5 py-0.5 rounded">
                {user?.role}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}