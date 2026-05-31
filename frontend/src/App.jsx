import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";

/* ── Protected wrapper ──────────────────────────────────────────────────────── */
function Protected({ children }) {
    const token = localStorage.getItem("fraudguard_access");
    return token ? children : <Navigate to="/login" replace />;
}

/* ── Public wrapper (redirect away if already logged in) ────────────────────── */
function PublicOnly({ children }) {
    const token = localStorage.getItem("fraudguard_access");
    return token ? <Navigate to="/" replace /> : children;
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
                <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
                <Route path="/" element={<Protected><DashboardPage /></Protected>} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}