import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../src/hooks/useAuth";
import { AuthCard, InputField, SubmitBtn, T } from "../src/components/AuthCard";

const rules = [
    { test: (p) => p.length >= 8, label: "At least 8 characters" },
    { test: (p) => /[A-Z]/.test(p), label: "One uppercase letter" },
    { test: (p) => /[0-9]/.test(p), label: "One number" },
    { test: (p) => /[^A-Za-z0-9]/.test(p), label: "One special character" },
];

function PasswordStrength({ password }) {
    if (!password) return null;
    const passed = rules.filter(r => r.test(password)).length;
    const colors = ["#f85149", "#d29922", "#d29922", "#3fb950", "#3fb950"];
    return (
        <div style={{ marginTop: -8, marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                {[0, 1, 2, 3].map(i => (
                    <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: i < passed ? colors[passed] : T.faint,
                        transition: "background .3s",
                    }} />
                ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {rules.map(r => (
                    <span key={r.label} style={{
                        fontSize: 10, color: r.test(password) ? T.green : T.muted,
                        transition: "color .3s",
                    }}>
                        {r.test(password) ? "✓" : "·"} {r.label}
                    </span>
                ))}
            </div>
        </div>
    );
}

export default function RegisterPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [fieldErr, setFieldErr] = useState({});
    const { register, loading, error, setError } = useAuth();
    const navigate = useNavigate();

    function validate() {
        const e = {};
        if (!name.trim()) e.name = "Name is required.";
        if (!email.trim() || !email.includes("@")) e.email = "Valid email required.";
        if (password.length < 8) e.password = "Minimum 8 characters.";
        if (!rules[2].test(password)) e.password = "Must contain a number.";
        if (password !== confirm) e.confirm = "Passwords do not match.";
        setFieldErr(e);
        return Object.keys(e).length === 0;
    }

    async function handleSubmit() {
        if (!validate()) return;
        const result = await register(name.trim(), email.trim().toLowerCase(), password);
        if (result.ok) navigate("/");
    }

    return (
        <AuthCard>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 17, color: T.text, marginBottom: 6 }}>
                Create account
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 22 }}>
                Join FraudGuard to start monitoring UPI transactions.
            </div>

            {error && (
                <div style={{
                    background: T.redBg, border: `1px solid ${T.red}44`, borderRadius: 6,
                    padding: "10px 12px", fontSize: 12, color: T.red, marginBottom: 16,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                    <span>{error}</span>
                    <button onClick={() => setError("")} style={{ background: "none", border: "none", color: T.red, cursor: "pointer", fontSize: 16 }}>×</button>
                </div>
            )}

            <InputField
                label="Full Name" value={name}
                onChange={e => { setName(e.target.value); setFieldErr(p => ({ ...p, name: "" })); }}
                placeholder="Arjun Sharma" error={fieldErr.name}
            />
            <InputField
                label="Email" type="email" value={email}
                onChange={e => { setEmail(e.target.value); setFieldErr(p => ({ ...p, email: "" })); }}
                placeholder="you@example.com" error={fieldErr.email}
            />
            <InputField
                label="Password" type="password" value={password}
                onChange={e => { setPassword(e.target.value); setFieldErr(p => ({ ...p, password: "" })); }}
                placeholder="Min. 8 chars with a number" error={fieldErr.password}
            />
            <PasswordStrength password={password} />

            <InputField
                label="Confirm Password" type="password" value={confirm}
                onChange={e => { setConfirm(e.target.value); setFieldErr(p => ({ ...p, confirm: "" })); }}
                placeholder="Repeat password" error={fieldErr.confirm}
            />

            <SubmitBtn loading={loading} onClick={handleSubmit}>
                {loading ? "Creating account…" : "Create Account →"}
            </SubmitBtn>

            <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: T.muted }}>
                Already have an account?{" "}
                <Link to="/login" style={{ color: T.blue, textDecoration: "none", fontWeight: 600 }}>
                    Sign in
                </Link>
            </div>
        </AuthCard>
    );
}