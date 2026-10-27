import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Lock, Mail, ShieldAlert, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "../AuthContext.jsx";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    const result = await login(email.trim(), password);
    setSubmitting(false);

    if (result.ok) {
      navigate(from, { replace: true });
    } else {
      setErrorMsg(result.error);
    }
  };

  const handleDemoLogin = async () => {
    setSubmitting(true);
    setErrorMsg("");
    const demoEmail = "demo@example.com";
    const demoPassword = "DemoPassword123";

    // Try logging in with demo account
    let result = await login(demoEmail, demoPassword);
    if (!result.ok) {
      // If demo account doesn't exist yet, auto-register it
      result = await signup(demoEmail, demoPassword, demoPassword);
    }
    setSubmitting(false);

    if (result.ok) {
      navigate(from, { replace: true });
    } else {
      setErrorMsg("Failed to initialize demo account.");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <ShieldAlert size={28} className="auth-logo-icon" />
          </div>
          <span className="brand-badge">Mini-Project</span>
          <h2>Welcome Back</h2>
          <p>Sign in to access the SMS Spam Detector & NLP tools</p>
        </div>

        {errorMsg ? (
          <div className="banner error" style={{ marginBottom: "16px" }}>
            {errorMsg}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label htmlFor="password">Password</label>
              <Link to="/forgot-password" className="auth-link-sm">
                Forgot password?
              </Link>
            </div>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn primary auth-submit-btn"
            disabled={submitting}
          >
            <span>{submitting ? "Signing In…" : "Sign In"}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        {!import.meta.env.PROD && (
          <>
            <div className="auth-divider">
              <span>OR</span>
            </div>

            <button
              type="button"
              onClick={handleDemoLogin}
              className="btn secondary demo-login-btn"
              disabled={submitting}
            >
              <Sparkles size={16} />
              <span>Quick Demo Access (Dev / 1-Click)</span>
            </button>
          </>
        )}

        <div className="auth-footer">
          Don't have an account?{" "}
          <Link to="/signup" className="auth-link">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
