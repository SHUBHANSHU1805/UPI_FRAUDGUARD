import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/Login.jsx";
import RegisterPage from "../pages/Register.jsx";
import DashboardPage from "../pages/Dashboard.jsx";
import LandingPage from "../pages/Landing.jsx";
import DemoPage from "../pages/Demo.jsx";

/* ── Protected wrapper ──────────────────────────────────────────────────────── */
function Protected({ children }) {
    const token = localStorage.getItem("fraudguard_access");
    return token ? children : <Navigate to="/login" replace />;
}

/* ── Public wrapper (redirect away if already logged in) ────────────────────── */
function PublicOnly({ children }) {
    const token = localStorage.getItem("fraudguard_access");
    return token ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
                <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
                <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
                <Route path="/demo" element={<DemoPage />} />
                <Route path="/" element={<LandingPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}