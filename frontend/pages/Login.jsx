import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../src/hooks/useAuth";
import { AuthCard, InputField, SubmitBtn, T } from "../src/components/AuthCard";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
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

    async function handleSubmit() {
        if (!validate()) return;
        const result = await login(email.trim().toLowerCase(), password);
        if (result.ok) navigate("/");
    }

    function handleKey(e) { if (e.key === "Enter") handleSubmit(); }

    return (
        <AuthCard>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 17, color: T.text, marginBottom: 6 }}>
                Sign in
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 22 }}>
                Enter your credentials to access the dashboard.
            </div>

            {error && (
                <div style={{
                    background: T.redBg, border: `1px solid ${T.red}44`, borderRadius: 6,
                    padding: "10px 12px", fontSize: 12, color: T.red, marginBottom: 16,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                    <span>{error}</span>
                    <button onClick={() => setError("")} style={{ background: "none", border: "none", color: T.red, cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
                </div>
            )}

            <InputField
                label="Email" type="email" value={email}
                onChange={e => { setEmail(e.target.value); setFieldErr(p => ({ ...p, email: "" })); }}
                placeholder="you@example.com" error={fieldErr.email}
            />
            <InputField
                label="Password" type="password" value={password}
                onChange={e => { setPassword(e.target.value); setFieldErr(p => ({ ...p, password: "" })); }}
                placeholder="••••••••" error={fieldErr.password}
                onKeyDown={handleKey}
            />

            <SubmitBtn loading={loading} onClick={handleSubmit}>
                {loading ? "Signing in…" : "Sign In →"}
            </SubmitBtn>

            <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: T.muted }}>
                Don't have an account?{" "}
                <Link to="/register" style={{ color: T.blue, textDecoration: "none", fontWeight: 600 }}>
                    Create one
                </Link>
            </div>

            {/* Demo credentials hint */}
            <div style={{
                marginTop: 20, background: T.surf2, border: `1px solid ${T.border}`,
                borderRadius: 6, padding: "10px 12px", fontSize: 11, color: T.muted,
            }}>
                <span style={{ color: T.amber }}>⚡ Demo:</span> Register a new account to get started.
                The first account gets <span style={{ color: T.green }}>admin</span> role automatically.
            </div>
        </AuthCard>
    );
}