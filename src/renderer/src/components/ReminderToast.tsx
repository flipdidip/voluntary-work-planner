import { Bell, X } from "lucide-react";
import { DueReminder } from "../hooks/useReminders";
import "./ReminderToast.css";

interface Props {
  reminders: DueReminder[];
  onDismiss: (idx: number) => void;
}

export default function ReminderToast({
  reminders,
  onDismiss,
}: Props): JSX.Element {
  return (
    <div className="toast-container">
      {reminders.map((dr, idx) => (
        <div
          key={`${dr.volunteerId}-${dr.reminder.id}-${idx}`}
          className="toast"
        >
          <div className="toast-icon">
            <Bell size={18} />
          </div>
          <div className="toast-body">
            <div className="toast-title">{dr.reminder.title}</div>
            <div className="toast-name">{dr.volunteerName}</div>
            <div className="toast-message">{dr.reminder.message}</div>
          </div>
          <button
            className="toast-close btn btn-ghost"
            onClick={() => onDismiss(idx)}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
