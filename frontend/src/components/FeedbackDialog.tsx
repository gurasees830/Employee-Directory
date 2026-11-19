import { useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { DEVELOPER } from "../contact";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { AlertIcon, CloseIcon, CopyIcon, ExternalIcon, MailIcon, PhoneIcon } from "./Icons";

const TOPICS = ["Problem", "Question", "Suggestion"] as const;
type Topic = (typeof TOPICS)[number];

const MIN_LENGTH = 10;
const MAX_LENGTH = 1000;

interface Props {
  reporter?: string;
  onClose: () => void;
  notify?: (type: "success" | "error", text: string) => void;
}

/**
 * Lets anyone report a problem or ask a question about the app. Sending opens the
 * user's own email app with the report filled in, so nothing goes through a third party.
 */
function FeedbackDialog({ reporter = "", onClose, notify }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onKeyDown = useFocusTrap(dialogRef, onClose);

  const [topic, setTopic] = useState<Topic>(TOPICS[0]);
  const [name, setName] = useState(reporter);
  const [message, setMessage] = useState("");
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState(false);

  const trimmed = message.trim();
  const error = !trimmed
    ? "Tell me what happened or what you'd like to ask"
    : trimmed.length < MIN_LENGTH
      ? `A little more detail, please (at least ${MIN_LENGTH} characters)`
      : "";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (error) {
      document.getElementById("feedback-message")?.focus();
      return;
    }
    const subject = `[Ágaetis Directory] ${topic}: ${trimmed.slice(0, 60)}${trimmed.length > 60 ? "…" : ""}`;
    const body = [
      trimmed,
      "",
      "—",
      `Type: ${topic}`,
      `From: ${name.trim() || "Not given"}`,
      `Page: ${window.location.href}`,
      `Browser: ${navigator.userAgent}`,
      `Time: ${new Date().toLocaleString()}`,
    ].join("\n");
    window.location.href = `mailto:${DEVELOPER.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(DEVELOPER.email);
      notify?.("success", "Email address copied");
    } catch {
      notify?.("error", "Couldn't copy — your browser blocked clipboard access");
    }
  };

  return createPortal(
    <div className="overlay overlay-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        className="dialog feedback"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
      >
        <div className="feedback-head">
          <div>
            <h2 id={titleId}>Report an issue</h2>
            <p>Something not working, or a question about the app? Let me know.</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        {sent ? (
          <div className="feedback-sent" role="status">
            <p>
              <strong>Your email app should now be open</strong> with the report filled in — just press send.
            </p>
            <p className="muted small">
              Nothing opened? Email me directly at <a href={`mailto:${DEVELOPER.email}`}>{DEVELOPER.email}</a>.
            </p>
            <button type="button" className="btn" onClick={() => setSent(false)}>
              Edit the report
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <div className="field">
              <span className="field-label" id="feedback-topic">
                What's it about?
              </span>
              <div className="segmented small" role="radiogroup" aria-labelledby="feedback-topic">
                {TOPICS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={topic === t}
                    className={topic === t ? "is-on" : ""}
                    onClick={() => setTopic(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className={`field ${touched && error ? "has-error" : ""}`}>
              <label className="field-label" htmlFor="feedback-message">
                Details<span className="req" aria-hidden="true">*</span>
              </label>
              <textarea
                id="feedback-message"
                rows={4}
                value={message}
                maxLength={MAX_LENGTH}
                onChange={(e) => setMessage(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="e.g. The export button downloads an empty file when I filter by Sales."
                aria-invalid={Boolean(touched && error)}
                aria-describedby="feedback-message-note"
                aria-required="true"
              />
              <p id="feedback-message-note" className={touched && error ? "field-error" : "field-hint"}>
                {touched && error ? (
                  <>
                    <AlertIcon size={13} />
                    {error}
                  </>
                ) : (
                  `${trimmed.length}/${MAX_LENGTH} · the page you're on and your browser are added automatically`
                )}
              </p>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="feedback-name">
                Your name<span className="optional">optional</span>
              </label>
              <input id="feedback-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
            </div>

            <div className="dialog-actions">
              <button type="button" className="btn" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <MailIcon size={16} /> Send report
              </button>
            </div>
          </form>
        )}

        <div className="dev-card">
          <p className="dev-label">Or reach me directly</p>
          <p className="dev-name">{DEVELOPER.name}</p>
          <p className="muted small">{DEVELOPER.role}</p>
          <ul className="dev-links">
            <li>
              <a href={`tel:${DEVELOPER.phone.replace(/\s/g, "")}`}>
                <PhoneIcon size={15} /> {DEVELOPER.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${DEVELOPER.email}`}>
                <MailIcon size={15} /> {DEVELOPER.email}
              </a>
              <button type="button" className="icon-btn" onClick={copyEmail} aria-label="Copy email address">
                <CopyIcon size={14} />
              </button>
            </li>
            <li>
              <a href={DEVELOPER.portfolio} target="_blank" rel="noopener noreferrer">
                <ExternalIcon size={15} /> Portfolio
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default FeedbackDialog;
