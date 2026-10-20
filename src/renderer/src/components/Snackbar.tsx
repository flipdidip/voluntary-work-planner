import { useEffect } from "react";
import { Check, X } from "lucide-react";
import "./Snackbar.css";

interface SnackbarProps {
  message: string;
  type?: "success" | "error";
  onDismiss: () => void;
}

export default function Snackbar({
  message,
  type = "success",
  onDismiss,
}: SnackbarProps): JSX.Element {
  useEffect(() => {
    const timeout = window.setTimeout(onDismiss, 3000);
    return () => window.clearTimeout(timeout);
  }, [message, onDismiss]);

  return (
    <div
      className={`app-snackbar app-snackbar--${type}`}
      role={type === "error" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
    >
      <span className="app-snackbar-icon" aria-hidden="true">
        {type === "success" ? <Check size={18} /> : <X size={18} />}
      </span>
      <span className="app-snackbar-message">{message}</span>
      <button
        type="button"
        className="app-snackbar-close"
        aria-label="Meldung schließen"
        onClick={onDismiss}
      >
        <X size={16} />
      </button>
    </div>
  );
}
