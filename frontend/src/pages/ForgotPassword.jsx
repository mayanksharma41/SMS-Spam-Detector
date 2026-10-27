import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, Mail, Lock, ArrowRight, CheckCircle2, AlertCircle, Terminal } from "lucide-react";
import { forgotPassword, resetPassword } from "../api.js";

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: request token, 2: reset password
  const [email, setEmail] = useState("");
  const [devToken, setDevToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const navigate = useNavigate();

  const handleRequestToken = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg("Please enter your registered email address.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await forgotPassword(email.trim());
      if (res.dev_reset_token) {
        setDevToken(res.dev_reset_token);
        setTokenInput(res.dev_reset_token);
        setStep(2);
      } else {
        setSuccessMsg(res.message);
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to process password reset request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!tokenInput.trim() || !newPassword) {
      setErrorMsg("Please fill in token and new password.");
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await resetPassword(tokenInput.trim(), newPassword, confirmPassword);
      setSuccessMsg(res.message);
      setStep(3); // Completed step
    } catch (err) {
      setErrorMsg(err.message || "Failed to reset password. Token may be invalid or expired.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <KeyRound size={28} className="auth-logo-icon" />
          </div>
          <span className="brand-badge">Account Recovery</span>
          <h2>Reset Your Password</h2>
          <p>
            {step === 1 && "Enter your email to generate a secure reset token."}
            {step === 2 && "Enter your reset token and choose a new password."}
            {step === 3 && "Password updated successfully."}
          </p>
        </div>

        {errorMsg ? (
          <div className="banner error" style={{ marginBottom: "16px" }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        ) : null}

        {step === 1 && (
          <form onSubmit={handleRequestToken} className="auth-form">
            <div className="form-group">
              <label htmlFor="recovery-email">Registered Email Address</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  id="recovery-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="notice-box">
              <Terminal size={16} />
              <div>
                <strong>Local / Development Environment</strong>
                <p>
                  External email delivery is not configured. When submitted, an immediate dev token will be generated to test the password reset flow.
                </p>
              </div>
            </div>

            <button
              type="submit"
              className="btn primary auth-submit-btn"
              disabled={submitting}
            >
              <span>{submitting ? "Generating Token…" : "Generate Reset Token"}</span>
              <ArrowRight size={18} />
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleResetPassword} className="auth-form">
            {devToken && (
              <div className="dev-token-banner">
                <div style={{ fontWeight: 600, color: "var(--primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Terminal size={14} /> Dev Reset Token Generated
                </div>
                <code>{devToken}</code>
                <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--muted)" }}>
                  (Pre-filled into the form below for immediate local testing)
                </p>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="reset-token">Reset Token</label>
              <div className="input-with-icon">
                <KeyRound size={18} className="input-icon" />
                <input
                  id="reset-token"
                  type="text"
                  placeholder="Paste reset token"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="new-password">New Password</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  id="new-password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirm-new-password">Confirm New Password</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  id="confirm-new-password"
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn primary auth-submit-btn"
              disabled={submitting}
            >
              <span>{submitting ? "Updating Password…" : "Update Password"}</span>
              <ArrowRight size={18} />
            </button>

            <button
              type="button"
              className="btn secondary"
              style={{ width: "100%", marginTop: "8px" }}
              onClick={() => setStep(1)}
            >
              Back to Email Request
            </button>
          </form>
        )}

        {step === 3 && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ display: "inline-flex", padding: "16px", borderRadius: "50%", background: "var(--spam-light)", color: "var(--spam)", marginBottom: "16px" }}>
              <CheckCircle2 size={40} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 8px" }}>Password Reset Complete</h3>
            <p style={{ color: "var(--muted)", fontSize: "14px", margin: "0 0 24px" }}>
              {successMsg || "Your account password has been updated. You can now log in with your new password."}
            </p>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="btn primary auth-submit-btn"
            >
              <span>Go to Sign In</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        <div className="auth-footer">
          Remember your password?{" "}
          <Link to="/login" className="auth-link">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
