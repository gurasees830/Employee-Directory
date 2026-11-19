import { useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { AlertIcon } from "./Icons";

export interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  busyLabel?: string;
  onConfirm: () => Promise<void> | void;
}

interface Props extends ConfirmOptions {
  onClose: () => void;
}

// Replaces window.confirm. Cancel gets focus first so pressing Enter never deletes by accident.
function ConfirmDialog({ title, message, confirmLabel, busyLabel = "Working…", onConfirm, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [busy, setBusy] = useState(false);
  const onKeyDown = useFocusTrap(dialogRef, () => !busy && onClose(), cancelRef);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="overlay overlay-center" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div
        ref={dialogRef}
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
      >
        <div className="dialog-icon" aria-hidden="true">
          <AlertIcon size={20} />
        </div>
        <h2 id={titleId}>{title}</h2>
        <div className="dialog-message">{message}</div>
        <div className="dialog-actions">
          <button ref={cancelRef} type="button" className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={confirm} disabled={busy}>
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ConfirmDialog;
