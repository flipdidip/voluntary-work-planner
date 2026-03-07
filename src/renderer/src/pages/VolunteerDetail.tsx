import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Trash2,
  Bell,
  BellRing,
  BellPlus,
  BellOff,
  Plus,
  X,
  Calendar,
} from "lucide-react";
import BirthdayInput from "../components/BirthdayInput";
import RolesInput from "../components/RolesInput";
import { useVolunteer } from "../hooks/useVolunteers";
import {
  Volunteer,
  Reminder,
  ReminderType,
  ActivityEntry,
  VolunteerStatus,
} from "@shared/types";
import {
  format,
  parseISO,
  differenceInMonths,
  differenceInYears,
} from "date-fns";
import { de } from "date-fns/locale";
import { v4 as uuidv4 } from "uuid";
import "./VolunteerDetail.css";

const STATUS_OPTIONS: { value: VolunteerStatus; label: string }[] = [
  { value: "active", label: "Aktiv" },
  { value: "inactive", label: "Inaktiv" },
  { value: "archived", label: "Archiviert" },
];

export default function VolunteerDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { volunteer: initial, loading } = useVolunteer(id);
  const [form, setForm] = useState<Volunteer | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [newActivity, setNewActivity] = useState("");
  const [newActivityHours, setNewActivityHours] = useState("");

  // Init form from loaded data
  if (initial && !form) {
    setForm({ ...initial });
  }

  if (loading) return <div className="loading">Lade...</div>;
  if (!form)
    return <div className="loading">Ehrenamtlicher nicht gefunden.</div>;

  const age = form.dateOfBirth
    ? differenceInYears(new Date(), parseISO(form.dateOfBirth))
    : null;
  const volunteerTenure = form.joinedDate
    ? getVolunteerTenure(form.joinedDate)
    : null;

  const update = (partial: Partial<Volunteer>): void =>
    setForm((prev) => (prev ? { ...prev, ...partial } : prev));

  const handleSave = async (): Promise<void> => {
    if (!form) return;
    setSaving(true);
    setError(null);
    const result = await window.api.saveVolunteer(form);
    setSaving(false);
    if (result.success) {
      setForm(result.volunteer);
      setSuccessMsg("Gespeichert!");
      setTimeout(() => setSuccessMsg(null), 2500);
    } else {
      setError(result.message);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!confirm(`${form.firstName} ${form.lastName} wirklich archivieren?`))
      return;
    await window.api.deleteVolunteer(form.id);
    navigate("/volunteers");
  };

  // ── Reminders ─────────────────────────────────────────
  const addReminder = (reminder: Reminder): void => {
    update({ reminders: [...form.reminders, reminder] });
  };

  const removeReminder = (reminderId: string): void => {
    update({ reminders: form.reminders.filter((r) => r.id !== reminderId) });
  };

  const toggleDismissReminder = (reminderId: string): void => {
    update({
      reminders: form.reminders.map((r) =>
        r.id === reminderId
          ? {
              ...r,
              dismissed: !r.dismissed,
              dismissedAt: !r.dismissed ? new Date().toISOString() : undefined,
            }
          : r,
      ),
    });
  };

  // ── Activity Log ──────────────────────────────────────
  const addActivity = (): void => {
    if (!newActivity.trim()) return;
    const entry: ActivityEntry = {
      id: uuidv4(),
      date: new Date().toISOString(),
      description: newActivity.trim(),
      hoursSpent: newActivityHours ? parseFloat(newActivityHours) : undefined,
    };
    update({ activityLog: [entry, ...form.activityLog] });
    setNewActivity("");
    setNewActivityHours("");
  };

  return (
    <div className="volunteer-detail">
      {/* Header */}
      <div className="detail-header">
        <button
          className="btn btn-ghost"
          onClick={() => navigate("/volunteers")}
        >
          <ArrowLeft size={16} /> Zurück
        </button>
        <div className="detail-title">
          <h1>
            {form.firstName} {form.lastName}
          </h1>
          {age !== null && <span className="age-chip">{age} Jahre</span>}
        </div>
        <div className="detail-actions">
          {successMsg && <span className="success-msg">{successMsg}</span>}
          {error && <span className="error-msg">{error}</span>}
          <button className="btn btn-danger" onClick={handleDelete}>
            <Trash2 size={15} /> Archivieren
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            <Save size={15} /> {saving ? "Speichern..." : "Speichern"}
          </button>
        </div>
      </div>

      <div className="detail-grid">
        {/* ── Personal Data ─────────────────────────── */}
        <section className="card section-card">
          <div className="section-header-row">
            <h2>Persönliche Daten</h2>
            <label className="status-select-inline">
              Status
              <select
                className="select"
                value={form.status}
                onChange={(e) =>
                  update({ status: e.target.value as VolunteerStatus })
                }
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>
              Vorname
              <input
                className="input"
                value={form.firstName}
                onChange={(e) => update({ firstName: e.target.value })}
              />
            </label>
            <label>
              Nachname
              <input
                className="input"
                value={form.lastName}
                onChange={(e) => update({ lastName: e.target.value })}
              />
            </label>
          </div>
          <label>
            Geburtsdatum
            <BirthdayInput
              value={form.dateOfBirth}
              onChange={(value) => update({ dateOfBirth: value })}
            />
          </label>
          <div className="form-row">
            <label>
              Telefon
              <input
                className="input"
                value={form.phone ?? ""}
                onChange={(e) => update({ phone: e.target.value })}
              />
            </label>
            <label>
              Mobil
              <input
                className="input"
                value={form.mobile ?? ""}
                onChange={(e) => update({ mobile: e.target.value })}
              />
            </label>
          </div>
          <label>
            E-Mail
            <input
              className="input"
              type="email"
              value={form.email ?? ""}
              onChange={(e) => update({ email: e.target.value })}
            />
          </label>
          <div className="form-row mt">
            <label>
              Straße
              <input
                className="input"
                value={form.address?.street ?? ""}
                onChange={(e) =>
                  update({
                    address: { ...form.address!, street: e.target.value },
                  })
                }
              />
            </label>
            <label>
              PLZ
              <input
                className="input"
                style={{ maxWidth: 100 }}
                value={form.address?.postalCode ?? ""}
                onChange={(e) =>
                  update({
                    address: { ...form.address!, postalCode: e.target.value },
                  })
                }
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              Ort
              <input
                className="input"
                value={form.address?.city ?? ""}
                onChange={(e) =>
                  update({
                    address: { ...form.address!, city: e.target.value },
                  })
                }
              />
            </label>
          </div>
        </section>

        {/* ── Volunteer Info ─────────────────────────── */}
        <section className="card section-card">
          <h2>Ehrenamt</h2>
          <label>
            Beitritt
            <input
              className="input"
              type="date"
              value={form.joinedDate ?? ""}
              onChange={(e) => update({ joinedDate: e.target.value })}
            />
          </label>
          {volunteerTenure && (
            <p className="joined-meta">
              Seit {volunteerTenure.formattedDate} · {volunteerTenure.duration}
            </p>
          )}
          <label className="mt">
            Aufgaben
            <RolesInput
              value={form.roles}
              onChange={(newRoles) => update({ roles: newRoles })}
            />
          </label>
          <label className="mt">
            Notizen
            <textarea
              className="textarea"
              value={form.notes}
              onChange={(e) => update({ notes: e.target.value })}
            />
          </label>
        </section>

        {/* ── Reminders ─────────────────────────────── */}
        <section className="card section-card reminders-section">
          <div className="section-header">
            <h2>
              <Bell size={17} /> Erinnerungen
            </h2>
            <button
              className="btn btn-secondary"
              onClick={() => setShowReminderForm(true)}
            >
              <BellPlus size={15} /> Hinzufügen
            </button>
          </div>

          <p className="hint" style={{ marginBottom: "1rem" }}>
            Geburtstagserinnerungen werden global in den Einstellungen
            konfiguriert und gelten für alle Freiwilligen mit Geburtsdatum.
          </p>

          {showReminderForm && (
            <ReminderForm
              volunteer={form}
              onAdd={addReminder}
              onClose={() => setShowReminderForm(false)}
            />
          )}

          <div className="reminder-list">
            {form.reminders.filter((r) => r.type === "custom").length === 0 && (
              <p className="empty-hint">
                Keine individuellen Erinnerungen. Geburtstagserinnerungen werden
                automatisch in den Einstellungen verwaltet.
              </p>
            )}
            {form.reminders
              .filter((r) => r.type === "custom")
              .map((r) => (
                <ReminderItem
                  key={r.id}
                  volunteerId={form.id}
                  volunteerName={`${form.firstName} ${form.lastName}`}
                  reminder={r}
                  onRemove={() => removeReminder(r.id)}
                  onToggleDismiss={() => toggleDismissReminder(r.id)}
                />
              ))}
          </div>
        </section>

        {/* ── Activity Log ──────────────────────────── */}
        <section className="card section-card">
          <h2>
            <Calendar size={17} /> Aktivitäten
          </h2>
          <div className="activity-input-row">
            <input
              className="input"
              placeholder="Tätigkeit beschreiben..."
              value={newActivity}
              onChange={(e) => setNewActivity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addActivity()}
            />
            <input
              className="input hours-input"
              type="number"
              placeholder="Std."
              min={0}
              step={0.5}
              value={newActivityHours}
              onChange={(e) => setNewActivityHours(e.target.value)}
            />
            <button className="btn btn-secondary" onClick={addActivity}>
              <Plus size={15} />
            </button>
          </div>
          <div className="activity-log">
            {form.activityLog.length === 0 && (
              <p className="empty-hint">Noch keine Aktivitäten.</p>
            )}
            {form.activityLog.map((a) => (
              <div key={a.id} className="activity-item">
                <div className="activity-date">
                  {format(parseISO(a.date), "dd.MM.yyyy", { locale: de })}
                </div>
                <div className="activity-desc">{a.description}</div>
                {a.hoursSpent && (
                  <div className="activity-hours">{a.hoursSpent}h</div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function getVolunteerTenure(
  joinedDateIso: string,
): { formattedDate: string; duration: string } | null {
  const joinedDate = parseISO(joinedDateIso);
  if (Number.isNaN(joinedDate.getTime())) return null;

  const now = new Date();
  const from = joinedDate <= now ? joinedDate : now;
  const to = joinedDate <= now ? now : joinedDate;

  const totalMonths = differenceInMonths(to, from);
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  const durationParts: string[] = [];
  if (years > 0)
    durationParts.push(`${years} ${years === 1 ? "Jahr" : "Jahre"}`);
  if (months > 0)
    durationParts.push(`${months} ${months === 1 ? "Monat" : "Monate"}`);
  if (durationParts.length === 0) durationParts.push("weniger als 1 Monat");

  return {
    formattedDate: format(joinedDate, "dd.MM.yyyy", { locale: de }),
    duration: durationParts.join(" "),
  };
}

// ──────────────────────────────────────────────────────────
// ReminderForm — inline sub-component
// ──────────────────────────────────────────────────────────

interface ReminderFormProps {
  volunteer: Volunteer;
  onAdd: (r: Reminder) => void;
  onClose: () => void;
}

function ReminderForm({
  volunteer,
  onAdd,
  onClose,
}: ReminderFormProps): JSX.Element {
  const [type, setType] = useState<ReminderType>("custom");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [triggerDate, setTriggerDate] = useState("");

  const handleAdd = (): void => {
    if (!title.trim()) return;
    const reminder: Reminder = {
      id: uuidv4(),
      type,
      title: title.trim(),
      message: message.trim(),
      dismissed: false,
      triggerDate: type === "custom" ? triggerDate : undefined,
    };
    onAdd(reminder);
    onClose();
  };

  return (
    <div className="reminder-form card">
      <div className="reminder-form-header">
        <h3>Neue Erinnerung</h3>
        <button className="btn btn-ghost" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <label>
        Datum
        <input
          className="input"
          type="date"
          value={triggerDate}
          onChange={(e) => setTriggerDate(e.target.value)}
        />
      </label>

      <label>
        Titel
        <input
          className="input"
          placeholder="z.B. Abschlussgespräch vereinbaren"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label>
        Nachricht
        <textarea
          className="textarea"
          placeholder="Optionale Details..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>
      <div className="reminder-form-actions">
        <button className="btn btn-secondary" onClick={onClose}>
          Abbrechen
        </button>
        <button className="btn btn-primary" onClick={handleAdd}>
          <BellPlus size={15} /> Hinzufügen
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// ReminderItem — display one reminder
// ──────────────────────────────────────────────────────────

interface ReminderItemProps {
  volunteerId: string;
  volunteerName: string;
  reminder: Reminder;
  onRemove: () => void;
  onToggleDismiss: () => void;
}

function ReminderItem({
  volunteerId,
  volunteerName,
  reminder,
  onRemove,
  onToggleDismiss,
}: ReminderItemProps): JSX.Element {
  const typeLabels: Record<ReminderType, string> = {
    "birthday-round": "Runder Geburtstag",
    "birthday-every-year": "Jährlicher Geburtstag",
    custom: "Individuell",
  };

  const handleSimulate = async (): Promise<void> => {
    await window.api.simulateReminder({
      volunteerId,
      volunteerName,
      reminder,
    });
  };

  return (
    <div
      className={`reminder-item ${reminder.dismissed ? "reminder-item--dismissed" : ""}`}
    >
      <div className="reminder-item-icon">
        {reminder.dismissed ? <BellOff size={16} /> : <Bell size={16} />}
      </div>
      <div className="reminder-item-body">
        <div className="reminder-item-title">{reminder.title}</div>
        <div className="reminder-item-meta">
          {typeLabels[reminder.type]}
          {reminder.type === "birthday-round" &&
            reminder.roundBirthdayYears && (
              <span> · {reminder.roundBirthdayYears.join(", ")}</span>
            )}
          {reminder.type === "custom" && reminder.triggerDate && (
            <span>
              {" "}
              ·{" "}
              {format(parseISO(reminder.triggerDate), "dd.MM.yyyy", {
                locale: de,
              })}
            </span>
          )}
        </div>
        {reminder.message && (
          <div className="reminder-item-msg">{reminder.message}</div>
        )}
      </div>
      <div className="reminder-item-actions">
        <button
          className="btn btn-ghost"
          title="Alarm simulieren"
          onClick={handleSimulate}
        >
          <BellRing size={15} /> Simulieren
        </button>
        <button
          className="btn btn-ghost"
          title="Stummschalten / Aktivieren"
          onClick={onToggleDismiss}
        >
          {reminder.dismissed ? <Bell size={15} /> : <BellOff size={15} />}
        </button>
        <button
          className="btn btn-ghost danger-ghost"
          title="Löschen"
          onClick={onRemove}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
