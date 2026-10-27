import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Mail, ShieldCheck, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "../AuthContext.jsx";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const { signup } = useAuth();
  const navigate = useNavigate();

  // Password rules validation
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isValid = hasMinLength && hasLetter && hasNumber && passwordsMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    if (!isValid) {
      setErrorMsg("Please ensure password satisfies all security requirements.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    const result = await signup(email.trim(), password, confirmPassword);
    setSubmitting(false);

    if (result.ok) {
      navigate("/", { replace: true });
    } else {
      setErrorMsg(result.error);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <ShieldCheck size={28} className="auth-logo-icon" />
          </div>
          <span className="brand-badge">Mini-Project</span>
          <h2>Create Your Account</h2>
          <p>Get started with real-time SMS spam analysis and linguistics</p>
        </div>

        {errorMsg ? (
          <div className="banner error" style={{ marginBottom: "16px" }}>
            {errorMsg}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="signup-email">Email Address</label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                id="signup-email"
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
            <label htmlFor="signup-password">Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password">Confirm Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password Requirements Guide */}
          <div className="pw-requirements">
            <div className={`req-item ${hasMinLength ? "met" : ""}`}>
              {hasMinLength ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              <span>At least 8 characters</span>
            </div>
            <div className={`req-item ${hasLetter ? "met" : ""}`}>
              {hasLetter ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              <span>At least one letter (a-z)</span>
            </div>
            <div className={`req-item ${hasNumber ? "met" : ""}`}>
              {hasNumber ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              <span>At least one number (0-9)</span>
            </div>
            {confirmPassword.length > 0 && (
              <div className={`req-item ${passwordsMatch ? "met" : ""}`}>
                {passwordsMatch ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                <span>Passwords match</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn primary auth-submit-btn"
            disabled={submitting}
          >
            <span>{submitting ? "Creating Account…" : "Create Account"}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{" "}
          <Link to="/login" className="auth-link">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
