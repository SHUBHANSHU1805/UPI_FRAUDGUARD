import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../src/hooks/useAuth";
import { Shield, Eye, EyeOff, Info, AlertTriangle } from "lucide-react";
import ParticleNetwork from "../src/components/ParticleNetwork";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [fieldErr, setFieldErr] = useState({});
  const { login, loading, error, setError } = useAuth();
  const navigate = useNavigate();

  function validate() {
    const e = {};
    if (!email.trim()) e.email = "Email is required.";
    if (!password) e.password = "Password is required.";
    setFieldErr(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    if (!validate()) return;
    const result = await login(email.trim().toLowerCase(), password);
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
        <div className="text-center mb-8 select-none">
          <div className="w-12 h-12 rounded-xl bg-cyber-redBg border border-cyber-red/30 inline-flex items-center justify-center text-2xl mb-4 shadow-[0_0_20px_rgba(248,81,73,0.15)]">
            🛡
          </div>
          <h2 className="font-syne font-extrabold text-xl text-white">UPI FraudGuard</h2>
          <p className="text-[10px] text-cyber-muted-dark uppercase tracking-wider mt-1">Console Access</p>
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
              <span className="font-bold">Access Denied:</span> {error}
            </div>
            <button 
              onClick={() => setError("")} 
              className="text-cyber-red font-bold hover:text-white transition-colors text-sm leading-none"
            >
              ×
            </button>
          </motion.div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-[9px] uppercase tracking-wider text-cyber-muted-dark font-bold block mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFieldErr((p) => ({ ...p, email: "" }));
              }}
              placeholder="analyst@fraudguard.net"
              className={`w-full bg-[#161b22]/80 border ${
                fieldErr.email ? "border-cyber-red" : "border-cyber-border-dark"
              } rounded-lg px-3 py-2.5 text-xs focus:border-cyber-blue outline-none text-white transition-all`}
            />
            {fieldErr.email && (
              <span className="text-[10px] text-cyber-red mt-1 block">{fieldErr.email}</span>
            )}
          </div>

          <div>
            <label className="text-[9px] uppercase tracking-wider text-cyber-muted-dark font-bold block mb-1.5">
              Access Password
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErr((p) => ({ ...p, password: "" }));
                }}
                placeholder="••••••••"
                className={`w-full bg-[#161b22]/80 border ${
                  fieldErr.password ? "border-cyber-red" : "border-cyber-border-dark"
                } rounded-lg pl-3 pr-10 py-2.5 text-xs focus:border-cyber-blue outline-none text-white transition-all`}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cyber-muted-dark hover:text-white transition-colors"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {fieldErr.password && (
              <span className="text-[10px] text-cyber-red mt-1 block">{fieldErr.password}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-cyber-blue text-black font-syne font-bold text-xs rounded-lg hover:bg-opacity-90 transition-all mt-2 shadow-[0_0_15px_rgba(88,166,255,0.15)] flex items-center justify-center gap-1.5"
          >
            {loading ? "AUTHENTICATING SECURE KEY..." : "AUTHORIZE ACCESS →"}
          </button>
        </form>

        {/* Secondary Navigation */}
        <div className="text-center mt-6 text-xs text-cyber-muted-dark">
          Don't have an operator profile?{" "}
          <Link to="/register" className="text-cyber-blue hover:underline font-semibold font-syne">
            Register Agent
          </Link>
        </div>

        {/* Demo hints */}
        <div className="mt-6 p-3 rounded-lg bg-cyber-surf2-dark/60 border border-cyber-border-dark/60 text-[10px] text-cyber-muted-dark leading-relaxed flex gap-2">
          <Info className="w-4 h-4 text-cyber-amber flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-cyber-amber font-bold">⚡ Sandboxed Mode:</span> Register a new account to get started. The first account registered automatically inherits the <span className="text-cyber-green font-bold">admin</span> scope.
          </div>
        </div>
      </motion.div>
    </div>
  );
}