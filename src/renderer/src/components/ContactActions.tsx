import { useEffect, useRef, useState } from "react";
import { Check, Mail, Phone, Smartphone, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import "./ContactActions.css";

interface ContactActionsProps {
  phone?: string;
  mobile?: string;
  email?: string;
}

export default function ContactActions({
  phone,
  mobile,
  email,
}: ContactActionsProps): JSX.Element {
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const noticeTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (noticeTimer.current !== null) {
        window.clearTimeout(noticeTimer.current);
      }
    },
    [],
  );

  const copyContact = async (type: string, value: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice({
        type: "success",
        message: `${type} wurde in die Zwischenablage kopiert.`,
      });
    } catch {
      setNotice({
        type: "error",
        message: "Kopieren in die Zwischenablage fehlgeschlagen.",
      });
    }

    if (noticeTimer.current !== null) {
      window.clearTimeout(noticeTimer.current);
    }
    noticeTimer.current = window.setTimeout(() => setNotice(null), 3000);
  };

  const contacts: { type: string; value: string; Icon: LucideIcon }[] = [];
  if (phone) contacts.push({ type: "Telefon", value: phone, Icon: Phone });
  if (mobile) contacts.push({ type: "Mobil", value: mobile, Icon: Smartphone });
  if (email) contacts.push({ type: "E-Mail", value: email, Icon: Mail });

  if (contacts.length === 0) return <span>–</span>;

  return (
    <div className="contact-actions">
      <div className="contact-actions-buttons">
        {contacts.map(({ type, value, Icon }) => (
          <button
            key={type}
            type="button"
            className="contact-action-button"
            title={`${type}: ${value} (klicken zum Kopieren)`}
            aria-label={`${type} kopieren: ${value}`}
            onClick={() => void copyContact(type, value)}
          >
            <Icon size={16} aria-hidden="true" />
          </button>
        ))}
      </div>
      {notice && (
        <div
          className={`contact-snackbar contact-snackbar--${notice.type}`}
          role={notice.type === "error" ? "alert" : "status"}
          aria-live={notice.type === "error" ? "assertive" : "polite"}
        >
          <span className="contact-snackbar-icon" aria-hidden="true">
            {notice.type === "success" ? <Check size={18} /> : <X size={18} />}
          </span>
          <span className="contact-snackbar-message">{notice.message}</span>
          <button
            type="button"
            className="contact-snackbar-close"
            aria-label="Meldung schließen"
            onClick={() => setNotice(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
