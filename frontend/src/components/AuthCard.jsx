/* Shared styled primitives for auth pages */

export const T = {
  bg:      "#0d1117",
  surface: "#161b22",
  surf2:   "#21262d",
  border:  "#30363d",
  text:    "#e6edf3",
  muted:   "#8b949e",
  faint:   "#3d444d",
  blue:    "#58a6ff",
  green:   "#3fb950",
  red:     "#f85149",
  amber:   "#d29922",
  redBg:   "#2d1b1a",
  greenBg: "#1a2d1e",
};

export function AuthCard({ children }) {
  return (
    <div style={{
      minHeight: "100vh", background: T.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'JetBrains Mono', monospace", padding: 16,
    }}>
      {/* subtle grid bg */}
      <div style={{
        position: "fixed", inset: 0, opacity: 0.03,
        backgroundImage: "linear-gradient(#58a6ff 1px, transparent 1px), linear-gradient(90deg, #58a6ff 1px, transparent 1px)",
        backgroundSize: "40px 40px", pointerEvents: "none",
      }} />

      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 12, padding: "36px 32px", width: "100%", maxWidth: 420,
        position: "relative",
      }}>
        {/* logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 44, height: 44, background: T.redBg,
            border: `1px solid ${T.red}44`, borderRadius: 10,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, marginBottom: 12,
          }}>🛡</div>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 20, color: T.text }}>UPI FraudGuard</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>ML-Powered Fraud Detection</div>
        </div>
        {children}
      </div>
    </div>
  );
}

export function InputField({ label, type = "text", value, onChange, placeholder, error }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 11, color: T.muted, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </label>
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{
          width: "100%", background: T.surf2, border: `1px solid ${error ? T.red : T.border}`,
          color: T.text, borderRadius: 6, padding: "10px 12px", fontSize: 13,
          fontFamily: "inherit", transition: "border .2s", outline: "none",
        }}
        onFocus={e  => e.target.style.borderColor = T.blue}
        onBlur={e   => e.target.style.borderColor = error ? T.red : T.border}
      />
      {error && <div style={{ fontSize: 11, color: T.red, marginTop: 4 }}>{error}</div>}
    </div>
  );
}

export function SubmitBtn({ loading, children, onClick }) {
  return (
    <button onClick={onClick} disabled={loading}
      style={{
        width: "100%", padding: "11px", background: loading ? T.surf2 : T.blue,
        color: loading ? T.muted : "#000", border: "none", borderRadius: 7,
        fontSize: 13, fontWeight: 700, cursor: loading ? "default" : "pointer",
        fontFamily: "Syne, sans-serif", transition: "background .2s", marginTop: 4,
      }}>
      {children}
    </button>
  );
}