import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { 
  Shield, 
  Activity, 
  Cpu, 
  ArrowRight, 
  Zap, 
  Server, 
  TrendingUp, 
  Database,
  Smartphone,
  AlertTriangle,
  UserCheck,
  Globe
} from "lucide-react";
import NetworkGlobe from "../src/components/NetworkGlobe";
import ParticleNetwork from "../src/components/ParticleNetwork";

// Count-up helper component for metric section
function CountUp({ to, duration = 1.5, decimals = 0, suffix = "" }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const end = parseFloat(to);
    if (start === end) return;

    let totalMiliseconds = duration * 1000;
    let incrementTime = 30;
    let numIterations = totalMiliseconds / incrementTime;
    let currentIteration = 0;

    const timer = setInterval(() => {
      currentIteration++;
      const progress = currentIteration / numIterations;
      const easeOutQuad = progress * (2 - progress); // Simple ease-out
      const val = easeOutQuad * (end - start) + start;
      
      setCount(val);

      if (currentIteration >= numIterations) {
        clearInterval(timer);
        setCount(end);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [to, duration, isInView]);

  return <span ref={ref}>{count.toFixed(decimals)}{suffix}</span>;
}

export default function LandingPage() {
  const [liveFraudCount, setLiveFraudCount] = useState(482903);

  // Animate the ticker fraud count upward slowly to feel "live"
  useEffect(() => {
    const iv = setInterval(() => {
      setLiveFraudCount(c => c + Math.floor(Math.random() * 3) + 1);
    }, 2500);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#0d1117] text-[#e6edf3] font-mono overflow-x-hidden">
      {/* Background Particles & Grid Overlay */}
      <ParticleNetwork theme="dark" />
      <div className="absolute inset-0 bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none z-0" />

      {/* Header / Navbar */}
      <header className="relative z-10 max-w-7xl mx-auto flex items-center justify-between px-6 py-5 border-b border-cyber-border-dark/30 bg-[#0d1117]/80 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyber-redBg border border-cyber-red/30 flex items-center justify-center text-lg shadow-[0_0_15px_rgba(248,81,73,0.1)]">
            🛡
          </div>
          <div>
            <div className="font-syne font-extrabold text-lg tracking-tight text-white">UPI FraudGuard</div>
            <div className="text-[9px] uppercase tracking-wider text-cyber-muted-dark">AI-Driven SOC Sentinel</div>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-cyber-muted-dark">
          <a href="#how-it-works" className="hover:text-cyber-blue transition-colors">How It Works</a>
          <a href="#features" className="hover:text-cyber-blue transition-colors">Fraud Patterns</a>
          <a href="#metrics" className="hover:text-cyber-blue transition-colors">ML Engine</a>
          <a href="#tech" className="hover:text-cyber-blue transition-colors">Architecture</a>
        </nav>
        <div className="flex items-center gap-4">
          <Link 
            to="/demo" 
            className="text-xs font-semibold px-4 py-2 border border-cyber-border-dark rounded-md hover:bg-cyber-surf-dark/50 transition-all"
          >
            Run Demo
          </Link>
          <Link 
            to="/login" 
            className="text-xs font-semibold px-4 py-2 bg-cyber-blue text-black rounded-md hover:bg-opacity-90 shadow-[0_0_15px_rgba(88,166,255,0.2)] transition-all font-syne"
          >
            Dashboard →
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 flex flex-col items-start text-left">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-redBg border border-cyber-red/20 text-cyber-red text-[10px] font-bold mb-6 tracking-wide"
          >
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            REAL-TIME PROTECTION ACTIVE
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-syne font-extrabold text-4xl sm:text-5xl xl:text-6xl tracking-tight text-white leading-tight mb-6"
          >
            Catch UPI Fraud <br />
            <span className="bg-gradient-to-r from-cyber-blue via-cyber-purple to-cyber-red bg-clip-text text-transparent">
              Before It Happens.
            </span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-sm sm:text-base text-cyber-muted-dark leading-relaxed mb-10 max-w-xl"
          >
            An enterprise cyber-security layer designed specifically for India's UPI network. Utilizing advanced Random Forest classifiers, we analyze structural patterns, device parameters, and velocity profiles in sub-50ms vectors.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap gap-4 w-full sm:w-auto"
          >
            <Link 
              to="/login" 
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 bg-cyber-blue text-black rounded-lg hover:bg-opacity-90 transition-all font-syne font-bold text-sm shadow-[0_0_25px_rgba(88,166,255,0.25)]"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
            <Link 
              to="/demo" 
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 border border-cyber-border-dark rounded-lg hover:bg-cyber-surf-dark/50 transition-all text-sm font-semibold text-white"
            >
              View Sandbox Demo
            </Link>
          </motion.div>
        </div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="lg:col-span-5 relative w-full flex justify-center"
        >
          <div className="absolute inset-0 bg-cyber-blue/5 rounded-full filter blur-3xl z-0" />
          <div className="relative z-10 w-full max-w-[420px] aspect-square rounded-2xl border border-cyber-border-dark/40 bg-cyber-surf-dark/20 backdrop-blur-md overflow-hidden flex items-center justify-center">
            {/* 3D Network Globe Canvas */}
            <NetworkGlobe />
          </div>
        </motion.div>
      </section>

      {/* Live Stats Ticker */}
      <div className="relative z-10 border-y border-cyber-border-dark/30 bg-cyber-surf-dark/20 backdrop-blur-sm overflow-hidden py-3">
        <div className="flex whitespace-nowrap animate-[marquee_25s_linear_infinite] gap-12 text-[10px] font-bold text-cyber-muted-dark tracking-wider">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyber-green" />
            TOTAL MONITOR ACTIVE: <span className="text-cyber-green"><CountUp to={liveFraudCount} duration={1} /></span>
          </span>
          <span>|</span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyber-red" />
            FRAUD PATTERNS DETECTED: <span className="text-cyber-red">12.4%</span>
          </span>
          <span>|</span>
          <span className="flex items-center gap-2 font-mono">
            <Activity className="w-3.5 h-3.5 text-cyber-blue" />
            AVERAGE DETECT LATENCY: <span className="text-cyber-blue">42.8ms</span>
          </span>
          <span>|</span>
          <span className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-cyber-purple" />
            SYSTEM ROC-AUC SCORE: <span className="text-cyber-purple">1.00</span>
          </span>
          <span>|</span>
          <span className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-cyber-amber" />
            MAPPED BANK INTEGRATIONS: <span className="text-cyber-amber">8/8 ACTIVE</span>
          </span>
        </div>
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
      </div>

      {/* How it works Section */}
      <section id="how-it-works" className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-b border-cyber-border-dark/20">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-syne font-extrabold text-2xl sm:text-3xl text-white mb-4">
            Security Vector Processing Pipeline
          </h2>
          <p className="text-xs sm:text-sm text-cyber-muted-dark">
            Three simple, automated steps that operate in real-time behind every transaction.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: "01",
              title: "Vector Ingestion",
              desc: "UPI request inputs (IP, device changed flags, VPA receiver addresses, velocity count and failed PIN inputs) are compiled in sub-10ms intervals.",
              icon: <Zap className="w-5 h-5 text-cyber-blue" />,
              border: "hover:border-cyber-blue/40"
            },
            {
              step: "02",
              title: "Classifier Engine",
              desc: "RandomForest ML model maps the inputs across 17 dimensional node structures, assigning predictive scores and confidence indices.",
              icon: <Cpu className="w-5 h-5 text-cyber-purple" />,
              border: "hover:border-cyber-purple/40"
            },
            {
              step: "03",
              title: "Immediate Action",
              desc: "Flags are raised instantly for risk values exceeding 70%. Blocks transfers, halts API flows, and alerts security operations.",
              icon: <Shield className="w-5 h-5 text-cyber-red" />,
              border: "hover:border-cyber-red/40"
            }
          ].map((item, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
              key={item.step}
              className={`p-6 rounded-xl border border-cyber-border-dark/40 bg-cyber-surf-dark/30 backdrop-blur-sm transition-all duration-300 ${item.border} group`}
            >
              <div className="flex items-center justify-between mb-6">
                <span className="text-2xl font-bold font-syne text-cyber-muted-dark/30 group-hover:text-cyber-muted-dark/70 transition-colors">
                  {item.step}
                </span>
                <div className="p-2.5 rounded-lg bg-cyber-surf-dark border border-cyber-border-dark/50">
                  {item.icon}
                </div>
              </div>
              <h3 className="font-syne font-bold text-white text-base mb-3">{item.title}</h3>
              <p className="text-xs text-cyber-muted-dark leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features Grid Section (4 key patterns) */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-b border-cyber-border-dark/20">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="max-w-xl">
            <h2 className="font-syne font-extrabold text-2xl sm:text-3xl text-white mb-4">
              Real-World Fraud Vectors
            </h2>
            <p className="text-xs sm:text-sm text-cyber-muted-dark">
              Mapped and cataloged patterns resolved by the ML classifier to intercept exploits.
            </p>
          </div>
          <Link 
            to="/demo" 
            className="inline-flex items-center gap-1.5 text-xs text-cyber-blue font-semibold hover:underline"
          >
            Test custom configurations <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            {
              title: "SIM Swap Interception",
              desc: "Unauthorized mobile network configuration hijacking. Monitored through sudden hardware profile discrepancies and rapid VPA alterations.",
              icon: <Smartphone className="w-5 h-5 text-cyber-blue" />,
              color: "border-l-4 border-l-cyber-blue",
              prob: "Risk Level: HIGH"
            },
            {
              title: "Social Engineering Fraud",
              desc: "Tricking account holders to approve credentials. Caught through unusual late-night activity, location mismatches, and unfamiliar receiver vectors.",
              icon: <AlertTriangle className="w-5 h-5 text-cyber-amber" />,
              color: "border-l-4 border-l-cyber-amber",
              prob: "Risk Level: CRITICAL"
            },
            {
              title: "Phishing & Fake VPAs",
              desc: "Sending payments to spoofed links/VPA addresses. Identified by matching receivers against age history profiles and high initial pin attempt ratios.",
              icon: <Globe className="w-5 h-5 text-cyber-purple" />,
              color: "border-l-4 border-l-cyber-purple",
              prob: "Risk Level: MEDIUM"
            },
            {
              title: "Account Takeover (ATO)",
              desc: "Immediate credentials breach and reset. Intercepted by evaluating login variables followed by instantaneous maximum transaction volume outputs.",
              icon: <UserCheck className="w-5 h-5 text-cyber-red" />,
              color: "border-l-4 border-l-cyber-red",
              prob: "Risk Level: CRITICAL"
            }
          ].map((item, idx) => (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              key={item.title}
              className={`p-6 rounded-xl border border-cyber-border-dark/40 bg-cyber-surf-dark/30 backdrop-blur-sm hover:bg-cyber-surf-dark/50 transition-all duration-300 ${item.color} group`}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-2.5 rounded-lg bg-cyber-surf-dark border border-cyber-border-dark/40">
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-syne font-bold text-white text-base">{item.title}</h3>
                  <span className="text-[9px] font-bold text-cyber-muted-dark tracking-wider block mt-0.5">
                    {item.prob}
                  </span>
                </div>
              </div>
              <p className="text-xs text-cyber-muted-dark leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Metrics Section */}
      <section id="metrics" className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-b border-cyber-border-dark/20 bg-cyber-surf-dark/10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 text-center">
          <div className="p-6">
            <div className="font-syne font-extrabold text-5xl sm:text-6xl text-cyber-blue mb-4">
              <CountUp to={1.00} decimals={2} duration={1.2} />
            </div>
            <div className="text-xs font-bold text-white uppercase tracking-wider mb-2">ROC-AUC Performance</div>
            <p className="text-[10px] text-cyber-muted-dark leading-relaxed max-w-xs mx-auto">
              Validated on 50,000 synthetic transaction patterns using SMOTE class balancing.
            </p>
          </div>
          
          <div className="p-6">
            <div className="font-syne font-extrabold text-5xl sm:text-6xl text-cyber-green mb-4">
              <CountUp to={1.00} decimals={2} duration={1.2} />
            </div>
            <div className="text-xs font-bold text-white uppercase tracking-wider mb-2">F1 Precision Score</div>
            <p className="text-[10px] text-cyber-muted-dark leading-relaxed max-w-xs mx-auto">
              Near zero false negatives ensuring maximum protection for linked bank VPAs.
            </p>
          </div>

          <div className="p-6">
            <div className="font-syne font-extrabold text-5xl sm:text-6xl text-cyber-purple mb-4">
              <CountUp to={500} suffix="K+" duration={1.5} />
            </div>
            <div className="text-xs font-bold text-white uppercase tracking-wider mb-2">Transactions Monitored</div>
            <p className="text-[10px] text-cyber-muted-dark leading-relaxed max-w-xs mx-auto">
              Scaling pipeline that processes vectors in sub-50ms metrics.
            </p>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section id="tech" className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-b border-cyber-border-dark/20">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-syne font-extrabold text-2xl sm:text-3xl text-white mb-4">
            Unified Modern Architecture
          </h2>
          <p className="text-xs sm:text-sm text-cyber-muted-dark">
            UPI FraudGuard is built using state-of-the-art microservices and machine learning structures.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {[
            { name: "React 18 & Vite", desc: "Fast UI Rendering", icon: <TrendingUp className="w-5 h-5 text-cyber-blue" /> },
            { name: "Three.js / Fiber", desc: "3D Visual Node Mapping", icon: <Globe className="w-5 h-5 text-cyber-purple" /> },
            { name: "Framer Motion", desc: "Fluid UI Transitions", icon: <Activity className="w-5 h-5 text-cyber-red" /> },
            { name: "Tailwind CSS", desc: "Sleek Glassmorphic Layouts", icon: <Shield className="w-5 h-5 text-cyber-green" /> },
            { name: "Flask Backend", desc: "Sub-50ms API Endpoint", icon: <Server className="w-5 h-5 text-cyber-blue" /> },
            { name: "Scikit-Learn ML", desc: "Random Forest Classifier", icon: <Cpu className="w-5 h-5 text-cyber-purple" /> },
            { name: "SQLite Database", desc: "Secure Audit Ledger", icon: <Database className="w-5 h-5 text-cyber-amber" /> },
            { name: "Tailored JWT Flow", desc: "Auto-refresh Interceptor", icon: <UserCheck className="w-5 h-5 text-cyber-green" /> }
          ].map((tech) => (
            <div 
              key={tech.name}
              className="p-4 rounded-xl border border-cyber-border-dark/30 bg-cyber-surf-dark/20 text-center hover:border-cyber-border-dark/60 transition-colors"
            >
              <div className="inline-flex p-2 rounded-lg bg-cyber-surf-dark border border-cyber-border-dark/40 mb-3">
                {tech.icon}
              </div>
              <div className="font-syne font-bold text-xs text-white">{tech.name}</div>
              <div className="text-[9px] text-cyber-muted-dark mt-1">{tech.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-cyber-border-dark/25 text-[10px] text-cyber-muted-dark">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold font-syne">🛡 UPI FraudGuard</span>
          <span>© 2026. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-8 font-semibold">
          <Link to="/demo" className="hover:text-white transition-colors">Interactive Sandbox</Link>
          <Link to="/login" className="hover:text-white transition-colors">Access Console</Link>
          <a href="#" className="hover:text-white transition-colors">Documentation</a>
        </div>
        <div className="text-right">
          <span>ML V2.4 · SYSTEM: <span className="text-cyber-green">ONLINE</span></span>
        </div>
      </footer>
    </div>
  );
}
