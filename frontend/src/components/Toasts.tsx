import { AlertIcon, CheckCircleIcon, CloseIcon } from "./Icons";

export interface Toast {
  id: number;
  type: "success" | "error";
  text: string;
}

interface Props {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

function Toasts({ toasts, onDismiss }: Props) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type === "success" ? <CheckCircleIcon /> : <AlertIcon />}
          <span>{t.text}</span>
          <button type="button" className="icon-btn" onClick={() => onDismiss(t.id)} aria-label="Dismiss">
            <CloseIcon size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default Toasts;
