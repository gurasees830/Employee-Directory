import { useState, type FormEvent } from "react";
import { login, type Admin } from "../api/auth";
import { getErrorMessage, getFieldErrors } from "../api/client";
import { AlertIcon, EyeIcon, EyeOffIcon, LockIcon, MessageIcon } from "./Icons";
import FeedbackDialog from "./FeedbackDialog";
import Logo from "./Logo";

interface Props {
  notice?: string;
  onSignedIn: (admin: Admin) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errors = { email?: string; password?: string };

function validate(email: string, password: string): Errors {
  const errors: Errors = {};
  if (!email.trim()) errors.email = "Enter your email";
  else if (!EMAIL_RE.test(email.trim())) errors.email = "That doesn't look like an email address";
  if (!password) errors.password = "Enter your password";
  return errors;
}

function LoginPage({ notice, onSignedIn }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const live = (nextEmail: string, nextPassword: string) => {
    if (submitted) setErrors(validate(nextEmail, nextPassword));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setServerError("");
    const found = validate(email, password);
    setErrors(found);
    if (found.email || found.password) {
      document.getElementById(found.email ? "login-email" : "login-password")?.focus();
      return;
    }

    setBusy(true);
    try {
      onSignedIn(await login(email.trim(), password));
    } catch (err) {
      const fieldErrors = getFieldErrors(err) as Errors;
      if (fieldErrors.email || fieldErrors.password) setErrors(fieldErrors);
      else setServerError(getErrorMessage(err));
      setPassword("");
      document.getElementById("login-password")?.focus();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <aside className="login-brand">
        <Logo />
        <div className="login-pitch">
          <h1>The people behind Ágaetis, in one place.</h1>
          <p>Find anyone by team, level, skills or how long they've been with us — and keep their records tidy.</p>
        </div>
        <p className="login-foot">Ágaetis Technologies · since 2018</p>
      </aside>

      <main className="login-main">
        <form className="login-card" onSubmit={submit} noValidate>
          <div className="login-mobile-logo">
            <Logo />
          </div>
          <span className="login-badge">
            <LockIcon size={14} /> Admin access
          </span>
          <h2>Sign in</h2>
          <p className="login-sub">Only admins can open the directory. Use the account you were given.</p>

          {notice && !serverError && (
            <div className="login-notice" role="status">
              {notice}
            </div>
          )}
          {serverError && (
            <div className="login-error" role="alert">
              <AlertIcon size={16} />
              {serverError}
            </div>
          )}

          <div className={`field ${errors.email ? "has-error" : ""}`}>
            <label className="field-label" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                live(e.target.value, password);
              }}
              placeholder="you@company.com"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "login-email-error" : undefined}
              maxLength={150}
            />
            {errors.email && (
              <p id="login-email-error" className="field-error">
                <AlertIcon size={13} />
                {errors.email}
              </p>
            )}
          </div>

          <div className={`field ${errors.password ? "has-error" : ""}`}>
            <label className="field-label" htmlFor="login-password">
              Password
            </label>
            <div className="password-wrap">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  live(email, e.target.value);
                }}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "login-password-error" : undefined}
                maxLength={200}
              />
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOffIcon size={17} /> : <EyeIcon size={17} />}
              </button>
            </div>
            {errors.password && (
              <p id="login-password-error" className="field-error">
                <AlertIcon size={13} />
                {errors.password}
              </p>
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>

          <button type="button" className="link-btn login-help" onClick={() => setFeedbackOpen(true)}>
            <MessageIcon size={14} /> Can't sign in? Report an issue
          </button>
        </form>
      </main>

      {feedbackOpen && <FeedbackDialog onClose={() => setFeedbackOpen(false)} />}
    </div>
  );
}

export default LoginPage;
