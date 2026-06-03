import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../src/hooks/useAuth";
import { Eye, EyeOff, Info, AlertTriangle, Check, X } from "lucide-react";
import ParticleNetwork from "../src/components/ParticleNetwork";

const rules = [
  { test: (p) => p.length >= 8, label: "8+ characters" },
  { test: (p) => /[A-Z]/.test(p), label: "Uppercase letter" },
  { test: (p) => /[0-9]/.test(p), label: "One number" },
  { test: (p) => /[^A-Za-z0-9]/.test(p), label: "Special character" },
];

function PasswordStrength({ password }) {
  if (!password) return null;
  const passed = rules.filter(r => r.test(password)).length;
  
  // Progress bar colors
  const colors = ["bg-cyber-red", "bg-cyber-amber", "bg-cyber-amber", "bg-cyber-green", "bg-cyber-green"];
  const colorClass = colors[passed] || "bg-cyber-muted-dark";

  return (
    <div className="mt-2 mb-4">
      {/* Bars */}
      <div className="flex gap-1.5 mb-2.5">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="flex-1 h-1 rounded-sm bg-cyber-surf2-dark overflow-hidden">
            <div className={`h-full ${i < passed ? colorClass : "bg-transparent"} transition-all duration-300`} />
          </div>
        ))}
      </div>
      {/* List */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {rules.map(r => {
          const ok = r.test(password);
          return (
            <span key={r.label} className={`text-[9px] flex items-center gap-1 font-semibold ${ok ? "text-cyber-green" : "text-cyber-muted-dark"} transition-colors`}>
              {ok ? <Check className="w-2.5 h-2.5" /> : <span className="w-2.5 h-2.5 text-center leading-none">·</span>}
              {r.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [fieldErr, setFieldErr] = useState({});
  const { register, loading, error, setError } = useAuth();
  const navigate = useNavigate();

  function validate() {
    const e = {};
    if (!name.trim()) e.name = "Name is required.";
    if (!email.trim() || !email.includes("@")) e.email = "Valid email required.";
    if (password.length < 8) e.password = "Minimum 8 characters.";
    if (!/[0-9]/.test(password)) e.password = "Must contain a number.";
    if (password !== confirm) e.confirm = "Passwords do not match.";
    setFieldErr(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    if (!validate()) return;
    const result = await register(name.trim(), email.trim().toLowerCase(), password);
    if (result.ok) navigate("/dashboard");
  }

  return (
    <div className="relative min-h-screen bg-[#0d1117] text-[#e6edf3] font-mono flex items-center justify-center p-4 overflow-hidden">
      {/* Background Particles & Grid */}
      <ParticleNetwork theme="dark" />
      <div className="absolute inset-0 bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none z-0" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 15 }}
        className="relative z-10 w-full max-w-[420px] bg-cyber-surf-dark/40 border border-cyber-border-dark/60 backdrop-blur-md rounded-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:border-cyber-blue/45 transition-colors duration-500"
      >
        {/* Header / Logo */}
        <div className="text-center mb-6 select-none">
          <div className="w-12 h-12 rounded-xl bg-cyber-redBg border border-cyber-red/30 inline-flex items-center justify-center text-2xl mb-4 shadow-[0_0_20px_rgba(248,81,73,0.15)]">
            🛡
          </div>
          <h2 className="font-syne font-extrabold text-xl text-white">Create Profile</h2>
          <p className="text-[10px] text-cyber-muted-dark uppercase tracking-wider mt-1">Agent Enlistment</p>
        </div>

        {/* Global Error Alert */}
        {error && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-5 p-3 rounded-lg bg-cyber-redBg border border-cyber-red/30 text-cyber-red text-xs flex items-start gap-2.5"
          >
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-bold">Error:</span> {error}
            </div>
            <button 
              onClick={() => setError("")} 
              className="text-cyber-red font-bold hover:text-white transition-colors text-sm leading-none"
            >
              ×
            </button>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div>
            <label className="text-[9px] uppercase tracking-wider text-cyber-muted-dark font-bold block mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldErr((p) => ({ ...p, name: "" }));
              }}
              placeholder="Arjun Sharma"
              className={`w-full bg-[#161b22]/80 border ${
                fieldErr.name ? "border-cyber-red" : "border-cyber-border-dark"
              } rounded-lg px-3 py-2 text-xs focus:border-cyber-blue outline-none text-white transition-all`}
            />
            {fieldErr.name && (
              <span className="text-[10px] text-cyber-red mt-0.5 block">{fieldErr.name}</span>
            )}
          </div>

          <div>
            <label className="text-[9px] uppercase tracking-wider text-cyber-muted-dark font-bold block mb-1">
              Operator Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFieldErr((p) => ({ ...p, email: "" }));
              }}
              placeholder="arjun@fraudguard.net"
              className={`w-full bg-[#161b22]/80 border ${
                fieldErr.email ? "border-cyber-red" : "border-cyber-border-dark"
              } rounded-lg px-3 py-2 text-xs focus:border-cyber-blue outline-none text-white transition-all`}
            />
            {fieldErr.email && (
              <span className="text-[10px] text-cyber-red mt-0.5 block">{fieldErr.email}</span>
            )}
          </div>

          <div>
            <label className="text-[9px] uppercase tracking-wider text-cyber-muted-dark font-bold block mb-1">
              Create Password
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErr((p) => ({ ...p, password: "" }));
                }}
                placeholder="Min. 8 chars with a number"
                className={`w-full bg-[#161b22]/80 border ${
                  fieldErr.password ? "border-cyber-red" : "border-cyber-border-dark"
                } rounded-lg pl-3 pr-10 py-2 text-xs focus:border-cyber-blue outline-none text-white transition-all`}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cyber-muted-dark hover:text-white transition-colors"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <PasswordStrength password={password} />
            {fieldErr.password && (
              <span className="text-[10px] text-cyber-red mt-0.5 block">{fieldErr.password}</span>
            )}
          </div>

          <div>
            <label className="text-[9px] uppercase tracking-wider text-cyber-muted-dark font-bold block mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setFieldErr((p) => ({ ...p, confirm: "" }));
              }}
              placeholder="Repeat password"
              className={`w-full bg-[#161b22]/80 border ${
                fieldErr.confirm ? "border-cyber-red" : "border-cyber-border-dark"
              } rounded-lg px-3 py-2 text-xs focus:border-cyber-blue outline-none text-white transition-all`}
            />
            {fieldErr.confirm && (
              <span className="text-[10px] text-cyber-red mt-0.5 block">{fieldErr.confirm}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-cyber-blue text-black font-syne font-bold text-xs rounded-lg hover:bg-opacity-90 transition-all mt-3 shadow-[0_0_15px_rgba(88,166,255,0.15)] flex items-center justify-center"
          >
            {loading ? "ENLISTING PROFILE IN DATABASE..." : "ENLIST NEW OPERATOR →"}
          </button>
        </form>

        {/* Secondary Navigation */}
        <div className="text-center mt-6 text-xs text-cyber-muted-dark">
          Already registered?{" "}
          <Link to="/login" className="text-cyber-blue hover:underline font-semibold font-syne">
            Operator Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
}