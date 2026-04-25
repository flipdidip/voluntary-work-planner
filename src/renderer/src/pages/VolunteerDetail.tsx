import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Trash2,
  Bell,
  BellRing,
  BellPlus,
  BellOff,
  X,
  FileText,
  Upload,
  Download,
  Eye,
  CheckCircle,
  AlertCircle,
  Plus,
  Pencil,
} from "lucide-react";
import BirthdayInput from "../components/BirthdayInput";
import RolesInput from "../components/RolesInput";
import DinoIconSelect from "../components/DinoIconSelect";
import { useVolunteer, useVolunteerIndex } from "../hooks/useVolunteers";
import { useGroupMeetings } from "../hooks/useGroupMeetings";
import {
  Volunteer,
  Reminder,
  ReminderType,
  VolunteerStatus,
  FileRecord,
  RequirementRecord,
  RequirementType,
  MediaConsentLevel,
  REQUIREMENT_DEFINITIONS,
  MEDIA_CONSENT_OPTIONS,
  getMediaConsentLevel,
  getMediaConsentDescription,
  calculateActivityTime,
  formatActivityTime,
  calculateRequirementsStatus,
  RequirementStatusSummary,
  calculateGroupMeetingParticipationStats,
  GROUP_MEETING_ATTENDANCE_LABELS,
} from "@shared/types";
import {
  format,
  parseISO,
  differenceInYears,
  addMonths,
  isBefore,
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
  const { index } = useVolunteerIndex();
  const { index: meetingsIndex, loading: meetingsLoading } = useGroupMeetings();
  const [form, setForm] = useState<Volunteer | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [showFileRecordForm, setShowFileRecordForm] = useState(false);
  const [showRequirementForm, setShowRequirementForm] = useState(false);
  const [selectedRequirementType, setSelectedRequirementType] =
    useState<RequirementType | null>(null);
  const [editingRequirement, setEditingRequirement] =
    useState<RequirementRecord | null>(null);

  // Init form from loaded data
  if (initial && !form) {
    setForm({
      ...initial,
      statusLog: Array.isArray(initial.statusLog) ? initial.statusLog : [],
      roles: Array.isArray(initial.roles) ? initial.roles : [],
      notes: typeof initial.notes === "string" ? initial.notes : "",
      reminders: Array.isArray(initial.reminders) ? initial.reminders : [],
      fileRecords: Array.isArray(initial.fileRecords)
        ? initial.fileRecords
        : [],
      requirements: Array.isArray(initial.requirements)
        ? initial.requirements
        : [],
    });
  }

  const roleSuggestions = (() => {
    if (!index) {
      return [];
    }

    const roleSet = new Set<string>();
    index.volunteers.forEach((entry) => {
      if (!Array.isArray(entry.roles)) {
        return;
      }
      entry.roles.forEach((role) => {
        if (typeof role === "string" && role.trim().length > 0) {
          roleSet.add(role);
        }
      });
    });

    return Array.from(roleSet);
  })();

  const age = form?.dateOfBirth
    ? differenceInYears(new Date(), parseISO(form.dateOfBirth))
    : null;
  const activityTimeMs = form ? calculateActivityTime(form) : 0;
  const activityTimeFormatted = formatActivityTime(activityTimeMs);
  const requirementsStatus: RequirementStatusSummary = form
    ? calculateRequirementsStatus(form)
    : {};

  const volunteerMeetings = useMemo(() => {
    if (!form || !meetingsIndex) return [];

    return meetingsIndex.meetings
      .filter((meeting) => {
        const participants = Array.isArray(meeting.participants)
          ? meeting.participants
          : [];
        return participants.some(
          (participant) =>
            participant.id === form.id && participant.type === "volunteer",
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [form, meetingsIndex]);

  const meetingStats = useMemo(() => {
    if (!form) {
      return {
        invitedCount: 0,
        presentCount: 0,
        absentCount: 0,
        unknownCount: 0,
        attendanceRate: 0,
      };
    }

    return calculateGroupMeetingParticipationStats(
      meetingsIndex?.meetings ?? [],
      form.id,
      "volunteer",
    );
  }, [form, meetingsIndex]);

  if (loading) return <div className="loading">Lade...</div>;
  if (!form)
    return <div className="loading">Ehrenamtlicher nicht gefunden.</div>;

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

  const handleArchive = async (): Promise<void> => {
    if (form.status === "archived") return;
    if (!confirm(`${form.firstName} ${form.lastName} wirklich archivieren?`)) {
      return;
    }

    setSaving(true);
    setError(null);

    const result = await window.api.saveVolunteer({
      ...form,
      status: "archived",
    });

    setSaving(false);
    if (result.success) {
      navigate("/volunteers?status=archived");
    } else {
      setError(result.message);
    }
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

  // ── File Records (Akte) ───────────────────────────────
  const addFileRecord = (fileRecord: FileRecord): void => {
    const fileRecords = form.fileRecords || [];
    update({ fileRecords: [...fileRecords, fileRecord] });
  };

  const removeFileRecord = async (fileRecordId: string): Promise<void> => {
    const fileRecords = form.fileRecords || [];
    const record = fileRecords.find((f) => f.id === fileRecordId);

    if (record?.filePath) {
      const result = await window.api.deleteFile(record.filePath);
      if (!result.success) {
        setError(`Fehler beim Löschen der Datei: ${result.error}`);
        return;
      }
    }

    update({ fileRecords: fileRecords.filter((f) => f.id !== fileRecordId) });
  };

  const openFileRecord = async (filePath: string): Promise<void> => {
    const result = await window.api.openFile(filePath);
    if (!result.success) {
      setError(`Fehler beim Öffnen der Datei: ${result.error}`);
    }
  };

  // ── Requirements ───────────────────────────────────────
  const addOrUpdateRequirement = (requirement: RequirementRecord): void => {
    const requirements = form.requirements || [];
    const existingIdx = requirements.findIndex(
      (r) => r.requirementType === requirement.requirementType,
    );

    if (existingIdx >= 0) {
      // Update existing
      const updated = [...requirements];
      updated[existingIdx] = requirement;
      update({ requirements: updated });
    } else {
      // Add new
      update({ requirements: [...requirements, requirement] });
    }
  };

  const removeRequirement = async (
    requirementType: RequirementType,
  ): Promise<void> => {
    const requirements = form.requirements || [];
    const requirement = requirements.find(
      (r) => r.requirementType === requirementType,
    );

    if (requirement?.filePath) {
      const result = await window.api.deleteFile(requirement.filePath);
      if (!result.success) {
        setError(`Fehler beim Löschen der Datei: ${result.error}`);
        return;
      }
    }

    update({
      requirements: requirements.filter(
        (r) => r.requirementType !== requirementType,
      ),
    });
  };

  const openRequirementFile = async (filePath: string): Promise<void> => {
    const result = await window.api.openFile(filePath);
    if (!result.success) {
      setError(`Fehler beim Öffnen der Datei: ${result.error}`);
    }
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
          <div className="vol-requirements">
            {(Object.keys(REQUIREMENT_DEFINITIONS) as RequirementType[]).map(
              (reqType) => {
                const status = requirementsStatus?.[reqType];
                const def = REQUIREMENT_DEFINITIONS[reqType];
                const shortLabel = def.label
                  .split(" ")[0]
                  .substring(0, 3)
                  .toUpperCase();

                let className = "requirement-chip";
                if (status === "complete") {
                  className += " requirement-chip--complete";
                } else if (status === "expired") {
                  className += " requirement-chip--expired";
                } else {
                  className += " requirement-chip--missing";
                }

                return (
                  <span
                    key={reqType}
                    className={className}
                    title={`${def.label}: ${
                      status === "complete"
                        ? "Vollständig"
                        : status === "expired"
                          ? "Abgelaufen"
                          : "Fehlend"
                    }`}
                  >
                    {shortLabel}
                  </span>
                );
              },
            )}
          </div>
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
          <label>
            Dino-Icon (Kalender-Indikator, optional)
            <DinoIconSelect
              value={form.dinoIconId}
              onChange={(value) => update({ dinoIconId: value })}
              placeholder="Kein Dino-Icon auswählen"
            />
          </label>
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

          {activityTimeMs > 0 && (
            <div
              className="activity-time-box"
              style={{
                marginTop: "1rem",
                padding: "0.75rem",
                backgroundColor: "var(--color-surface-2)",
                borderRadius: "6px",
                borderLeft: "3px solid var(--color-primary)",
              }}
            >
              <strong>Aktive Zeit:</strong> {activityTimeFormatted}
              {form.status === "active" && (
                <span
                  style={{
                    marginLeft: "0.5rem",
                    fontSize: "0.85em",
                    opacity: 0.7,
                  }}
                >
                  (läuft)
                </span>
              )}
            </div>
          )}

          <label className="mt">
            Aufgaben
            <RolesInput
              value={form.roles}
              onChange={(newRoles) => update({ roles: newRoles })}
              suggestions={roleSuggestions}
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

          {/* Status Change History */}
          {form.statusLog && form.statusLog.length > 0 && (
            <details className="status-history" style={{ marginTop: "1.5rem" }}>
              <summary
                style={{
                  cursor: "pointer",
                  fontWeight: "500",
                  padding: "0.5rem",
                  borderRadius: "4px",
                  userSelect: "none",
                }}
              >
                Status-Verlauf ({form.statusLog.length} Einträge)
              </summary>
              <div
                style={{
                  marginTop: "0.75rem",
                  maxHeight: "300px",
                  overflowY: "auto",
                  fontSize: "0.9em",
                }}
              >
                {[...form.statusLog].reverse().map((entry, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "0.5rem 0.75rem",
                      borderLeft: "2px solid var(--color-border, #e0e0e0)",
                      marginBottom: "0.5rem",
                      backgroundColor: "var(--color-surface-2)",
                      borderRadius: "4px",
                    }}
                  >
                    <div style={{ fontWeight: "500" }}>
                      {entry.from
                        ? `${getStatusLabel(entry.from)} → ${getStatusLabel(entry.to)}`
                        : `Initial: ${getStatusLabel(entry.to)}`}
                    </div>
                    <div
                      style={{
                        fontSize: "0.85em",
                        opacity: 0.7,
                        marginTop: "0.25rem",
                      }}
                    >
                      {format(parseISO(entry.timestamp), "dd.MM.yyyy HH:mm", {
                        locale: de,
                      })}
                    </div>
                    {entry.note && (
                      <div
                        style={{
                          fontSize: "0.85em",
                          marginTop: "0.25rem",
                          fontStyle: "italic",
                        }}
                      >
                        {entry.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}
        </section>

        <section className="card section-card">
          <h2>Gruppentreffen</h2>

          {meetingsLoading ? (
            <p className="text-muted">Lade Teilnahme...</p>
          ) : volunteerMeetings.length === 0 ? (
            <p className="empty-hint">
              Noch keine Teilnahme an Gruppentreffen dokumentiert.
            </p>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: "0.75rem",
                  marginTop: "1rem",
                }}
              >
                <div className="activity-time-box">
                  <strong>Eingeladen:</strong> {meetingStats.invitedCount}
                </div>
                <div className="activity-time-box">
                  <strong>Anwesend:</strong> {meetingStats.presentCount}
                </div>
                <div className="activity-time-box">
                  <strong>Nicht anwesend:</strong> {meetingStats.absentCount}
                </div>
                <div className="activity-time-box">
                  <strong>Quote:</strong> {meetingStats.attendanceRate}%
                </div>
              </div>

              <details className="status-history" style={{ marginTop: "1rem" }}>
                <summary
                  style={{
                    cursor: "pointer",
                    fontWeight: "500",
                    padding: "0.5rem",
                    borderRadius: "4px",
                    userSelect: "none",
                  }}
                >
                  Teilnahme-Verlauf ({volunteerMeetings.length} Einträge)
                </summary>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    marginTop: "1rem",
                  }}
                >
                  {volunteerMeetings.map((meeting) => {
                    const participant = meeting.participants.find(
                      (entry) =>
                        entry.id === form.id && entry.type === "volunteer",
                    );
                    const attendance = participant?.attendance ?? "unknown";
                    const badgeStyles =
                      attendance === "present"
                        ? {
                            backgroundColor: "rgba(34, 197, 94, 0.12)",
                            color: "#15803d",
                          }
                        : attendance === "absent"
                          ? {
                              backgroundColor: "rgba(239, 68, 68, 0.12)",
                              color: "#b91c1c",
                            }
                          : {
                              backgroundColor: "rgba(245, 158, 11, 0.12)",
                              color: "#b45309",
                            };

                    return (
                      <div
                        key={meeting.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "0.75rem",
                          padding: "0.65rem 0.8rem",
                          backgroundColor: "var(--color-surface-2)",
                          borderRadius: "8px",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>{meeting.title}</div>
                          <div
                            className="text-muted"
                            style={{ fontSize: "0.85rem" }}
                          >
                            {format(
                              parseISO(meeting.date),
                              "dd.MM.yyyy HH:mm",
                              {
                                locale: de,
                              },
                            )}
                          </div>
                        </div>
                        <span
                          style={{
                            ...badgeStyles,
                            padding: "0.25rem 0.6rem",
                            borderRadius: "999px",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {GROUP_MEETING_ATTENDANCE_LABELS[attendance]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </details>
            </>
          )}
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

        {/* ── File Records (Akte) ──────────────────────── */}
        <section className="card section-card file-records-section">
          <div className="section-header">
            <h2>
              <FileText size={17} /> Akte
            </h2>
            <button
              className="btn btn-secondary"
              onClick={() => setShowFileRecordForm(true)}
            >
              <Upload size={15} /> Hinzufügen
            </button>
          </div>

          <p className="hint" style={{ marginBottom: "1rem" }}>
            Dokumentieren Sie wichtige Informationen und fügen Sie optional
            Dateien hinzu.
          </p>

          {showFileRecordForm && (
            <FileRecordForm
              volunteerId={form.id}
              onAdd={addFileRecord}
              onClose={() => setShowFileRecordForm(false)}
            />
          )}

          <div className="file-record-list">
            {(!form.fileRecords || form.fileRecords.length === 0) && (
              <p className="empty-hint">Keine Dokumente vorhanden.</p>
            )}
            {form.fileRecords?.map((record) => (
              <FileRecordItem
                key={record.id}
                record={record}
                onRemove={() => removeFileRecord(record.id)}
                onOpen={() =>
                  record.filePath && openFileRecord(record.filePath)
                }
              />
            ))}
          </div>
        </section>

        {/* ── Requirements / Compliance ──────────────────────── */}
        <section className="card section-card requirements-section">
          <h2>
            <CheckCircle size={17} /> Qualifikationen & Nachweise
          </h2>

          <p className="hint" style={{ marginBottom: "1rem" }}>
            Verwalten Sie Schulungen, Bescheinigungen und gesetzlich
            erforderliche Nachweise. Einige Qualifikationen müssen regelmäßig
            erneuert werden.
          </p>

          {showRequirementForm && (
            <RequirementForm
              volunteerId={form.id}
              existingRequirements={form.requirements || []}
              initialRequirementType={selectedRequirementType}
              initialRequirement={editingRequirement}
              onAdd={addOrUpdateRequirement}
              onClose={() => {
                setShowRequirementForm(false);
                setSelectedRequirementType(null);
                setEditingRequirement(null);
              }}
            />
          )}

          <div className="requirements-list">
            {(Object.keys(REQUIREMENT_DEFINITIONS) as RequirementType[]).map(
              (reqType) => {
                const requirement = (form.requirements || []).find(
                  (r) => r.requirementType === reqType,
                );

                if (requirement) {
                  return (
                    <RequirementItem
                      key={reqType}
                      requirement={requirement}
                      onEdit={() => {
                        setSelectedRequirementType(reqType);
                        setEditingRequirement(requirement);
                        setShowRequirementForm(true);
                      }}
                      onRemove={() =>
                        removeRequirement(requirement.requirementType)
                      }
                      onOpen={() =>
                        requirement.filePath &&
                        openRequirementFile(requirement.filePath)
                      }
                    />
                  );
                } else {
                  return (
                    <MissingRequirementItem
                      key={reqType}
                      requirementType={reqType}
                      onAdd={() => {
                        setSelectedRequirementType(reqType);
                        setEditingRequirement(null);
                        setShowRequirementForm(true);
                      }}
                    />
                  );
                }
              },
            )}
          </div>
        </section>
      </div>

      <div className="detail-actions-footer">
        {successMsg && <span className="success-msg">{successMsg}</span>}
        {error && <span className="error-msg">{error}</span>}
        <button
          className="btn btn-danger"
          onClick={handleArchive}
          disabled={saving || form.status === "archived"}
          title={form.status === "archived" ? "Bereits archiviert" : undefined}
        >
          <Trash2 size={15} />
          {form.status === "archived" ? "Archiviert" : "Archivieren"}
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
  );
}

function getStatusLabel(status: VolunteerStatus): string {
  const option = STATUS_OPTIONS.find((o) => o.value === status);
  return option ? option.label : status;
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

// ──────────────────────────────────────────────────────────
// FileRecordForm — inline sub-component
// ──────────────────────────────────────────────────────────

interface FileRecordFormProps {
  volunteerId: string;
  onAdd: (r: FileRecord) => void;
  onClose: () => void;
}

function FileRecordForm({
  volunteerId,
  onAdd,
  onClose,
}: FileRecordFormProps): JSX.Element {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSelectFile = async (): Promise<void> => {
    const filePath = await window.api.selectFile();
    if (filePath) {
      setSelectedFilePath(filePath);
    }
  };

  const handleAdd = async (): Promise<void> => {
    if (!title.trim()) return;

    setUploading(true);
    let uploadResult = null;

    if (selectedFilePath) {
      uploadResult = await window.api.uploadFile(volunteerId, selectedFilePath);
      if (!uploadResult.success) {
        alert(`Fehler beim Hochladen: ${uploadResult.error}`);
        setUploading(false);
        return;
      }
    }

    const fileRecord: FileRecord = {
      id: uuidv4(),
      title: title.trim(),
      description: description.trim(),
      fileName: uploadResult?.fileName,
      filePath: uploadResult?.filePath,
      fileSize: 0, // TODO: Get actual file size
      uploadedAt: new Date().toISOString(),
    };

    onAdd(fileRecord);
    setUploading(false);
    onClose();
  };

  return (
    <div className="file-record-form card">
      <div className="file-record-form-header">
        <h3>Neues Dokument</h3>
        <button className="btn btn-ghost" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <label>
        Titel *
        <input
          className="input"
          placeholder="z.B. Einverständniserklärung"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>

      <label>
        Beschreibung
        <textarea
          className="textarea"
          placeholder="Optionale Beschreibung..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <label>
        Datei (optional)
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            className="btn btn-secondary"
            onClick={handleSelectFile}
            type="button"
          >
            <Upload size={15} /> Datei auswählen
          </button>
          {selectedFilePath && (
            <span
              style={{
                fontSize: "0.9em",
                color: "var(--color-text-secondary)",
              }}
            >
              {selectedFilePath.split(/[\\/]/).pop()}
            </span>
          )}
        </div>
      </label>

      <div className="file-record-form-actions">
        <button className="btn btn-secondary" onClick={onClose}>
          Abbrechen
        </button>
        <button
          className="btn btn-primary"
          onClick={handleAdd}
          disabled={uploading || !title.trim()}
        >
          <Upload size={15} /> {uploading ? "Hochladen..." : "Hinzufügen"}
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// FileRecordItem — display one file record
// ──────────────────────────────────────────────────────────

interface FileRecordItemProps {
  record: FileRecord;
  onRemove: () => void;
  onOpen: () => void;
}

function FileRecordItem({
  record,
  onRemove,
  onOpen,
}: FileRecordItemProps): JSX.Element {
  return (
    <div className="file-record-item">
      <div className="file-record-item-icon">
        <FileText size={20} />
      </div>
      <div className="file-record-item-body">
        <div className="file-record-item-title">{record.title}</div>
        {record.description && (
          <div className="file-record-item-description">
            {record.description}
          </div>
        )}
        <div className="file-record-item-meta">
          {record.fileName && <span>📎 {record.fileName}</span>}
          {record.uploadedAt && (
            <span>
              {" · "}
              {format(parseISO(record.uploadedAt), "dd.MM.yyyy", {
                locale: de,
              })}
            </span>
          )}
        </div>
      </div>
      <div className="file-record-item-actions">
        {record.fileName && record.filePath && (
          <button
            className="btn btn-ghost"
            title="Datei öffnen"
            onClick={onOpen}
          >
            <Eye size={15} /> Öffnen
          </button>
        )}
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

// ──────────────────────────────────────────────────────────
// RequirementForm — inline sub-component
// ──────────────────────────────────────────────────────────

interface RequirementFormProps {
  volunteerId: string;
  existingRequirements: RequirementRecord[];
  initialRequirementType: RequirementType | null;
  initialRequirement?: RequirementRecord | null;
  onAdd: (r: RequirementRecord) => void;
  onClose: () => void;
}

function RequirementForm({
  volunteerId,
  existingRequirements,
  initialRequirementType,
  initialRequirement,
  onAdd,
  onClose,
}: RequirementFormProps): JSX.Element {
  const [requirementType, setRequirementType] = useState<RequirementType | "">(
    initialRequirement?.requirementType || initialRequirementType || "",
  );
  const [completedDate, setCompletedDate] = useState(
    initialRequirement?.completedDate || "",
  );
  const [mediaConsentLevel, setMediaConsentLevel] = useState<MediaConsentLevel>(
    getMediaConsentLevel(initialRequirement),
  );
  const [notes, setNotes] = useState(initialRequirement?.notes || "");
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const selectedDef = requirementType
    ? REQUIREMENT_DEFINITIONS[requirementType]
    : null;
  const hasExistingDocument = Boolean(initialRequirement?.filePath);
  const selectedFileName = selectedFilePath?.split(/[\\/]/).pop();

  // Get available requirements (not yet completed or renewable)
  const availableRequirements = (
    Object.keys(REQUIREMENT_DEFINITIONS) as RequirementType[]
  ).filter((type) => {
    if (type === initialRequirement?.requirementType) {
      return true;
    }

    const existing = existingRequirements.find(
      (r) => r.requirementType === type,
    );
    if (!existing) return true; // Not yet added

    const def = REQUIREMENT_DEFINITIONS[type];
    if (def.renewalMonths === null) return false; // One-time only, already exists

    return true; // Can be renewed
  });

  const handleSelectFile = async (): Promise<void> => {
    const filePath = await window.api.selectFile();
    if (filePath) {
      setSelectedFilePath(filePath);
    }
  };

  const handleAdd = async (): Promise<void> => {
    if (!requirementType || !completedDate || !selectedDef) return;
    if (
      selectedDef.requiresDocument &&
      !selectedFilePath &&
      !hasExistingDocument
    ) {
      return;
    }

    setUploading(true);

    let nextFileName = initialRequirement?.fileName;
    let nextFilePath = initialRequirement?.filePath;
    let nextFileSize = initialRequirement?.fileSize;
    let nextUploadedAt = initialRequirement?.uploadedAt;

    if (selectedFilePath) {
      const uploadResult = await window.api.uploadFile(
        volunteerId,
        selectedFilePath,
      );
      if (!uploadResult.success) {
        alert(`Fehler beim Hochladen: ${uploadResult.error}`);
        setUploading(false);
        return;
      }

      nextFileName = uploadResult.fileName;
      nextFilePath = uploadResult.filePath;
      nextFileSize = uploadResult.fileSize || 0;
      nextUploadedAt = new Date().toISOString();

      if (
        initialRequirement?.filePath &&
        initialRequirement.filePath !== nextFilePath
      ) {
        await window.api.deleteFile(initialRequirement.filePath);
      }
    }

    const requirement: RequirementRecord = {
      ...initialRequirement,
      requirementType: requirementType as RequirementType,
      completedDate,
      mediaConsentLevel:
        requirementType === "bildundton" ? mediaConsentLevel : undefined,
      fileName: nextFileName,
      filePath: nextFilePath,
      fileSize: nextFileSize,
      uploadedAt: nextUploadedAt,
      notes: notes.trim() || undefined,
    };

    onAdd(requirement);
    setUploading(false);
    onClose();
  };

  return (
    <div className="requirement-form card">
      <div className="requirement-form-header">
        <h3>
          {initialRequirement
            ? "Qualifikation bearbeiten"
            : "Qualifikation hinzufügen"}
        </h3>
        <button className="btn btn-ghost" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      {!initialRequirementType && (
        <label>
          Typ *
          <select
            className="select"
            value={requirementType}
            onChange={(e) =>
              setRequirementType(e.target.value as RequirementType)
            }
          >
            <option value="">-- Bitte auswählen --</option>
            {availableRequirements.map((type) => (
              <option key={type} value={type}>
                {REQUIREMENT_DEFINITIONS[type].label}
              </option>
            ))}
          </select>
        </label>
      )}

      {initialRequirementType && selectedDef && (
        <div className="requirement-info" style={{ marginBottom: "1rem" }}>
          <strong>Typ:</strong> {selectedDef.label}
        </div>
      )}

      {selectedDef && (
        <>
          <div className="requirement-info">
            {selectedDef.renewalMonths === null ? (
              <span className="badge badge-success">Einmalig</span>
            ) : (
              <span className="badge badge-warning">
                Erneuerung alle {selectedDef.renewalMonths} Monate
              </span>
            )}
            {selectedDef.requiresDocument && (
              <span className="badge badge-info">Dokument erforderlich</span>
            )}
          </div>

          <label>
            Abschlussdatum *
            <input
              className="input"
              type="date"
              value={completedDate}
              onChange={(e) => setCompletedDate(e.target.value)}
            />
          </label>

          {requirementType === "bildundton" && (
            <>
              <label>
                Freigabe Foto & Video *
                <select
                  className="select"
                  value={mediaConsentLevel}
                  onChange={(e) =>
                    setMediaConsentLevel(e.target.value as MediaConsentLevel)
                  }
                >
                  {MEDIA_CONSENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} – {option.description}
                    </option>
                  ))}
                </select>
              </label>

              <p className="hint" style={{ marginBottom: "1rem" }}>
                Standardmäßig ist Rot vorausgewählt.
              </p>
            </>
          )}

          {selectedDef.requiresDocument && (
            <label>
              Dokument (PDF) *
              <div
                style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
              >
                <button
                  className="btn btn-secondary"
                  onClick={handleSelectFile}
                  type="button"
                >
                  <Upload size={15} />
                  {hasExistingDocument ? " Datei ersetzen" : " Datei auswählen"}
                </button>
                <span
                  style={{
                    fontSize: "0.9em",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {selectedFileName ||
                    (initialRequirement?.fileName
                      ? `Aktuell: ${initialRequirement.fileName}`
                      : "Noch kein Dokument hinterlegt")}
                </span>
              </div>
            </label>
          )}

          <label>
            Notizen
            <textarea
              className="textarea"
              placeholder="Optionale Notizen..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          <div className="requirement-form-actions">
            <button className="btn btn-secondary" onClick={onClose}>
              Abbrechen
            </button>
            <button
              className="btn btn-primary"
              onClick={handleAdd}
              disabled={
                uploading ||
                !requirementType ||
                !completedDate ||
                (selectedDef.requiresDocument &&
                  !selectedFilePath &&
                  !hasExistingDocument)
              }
            >
              <Plus size={15} />
              {uploading
                ? " Hochladen..."
                : initialRequirement
                  ? " Speichern"
                  : " Hinzufügen"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// RequirementItem — display one requirement
// ──────────────────────────────────────────────────────────

interface RequirementItemProps {
  requirement: RequirementRecord;
  onEdit: () => void;
  onRemove: () => void;
  onOpen: () => void;
}

function RequirementItem({
  requirement,
  onEdit,
  onRemove,
  onOpen,
}: RequirementItemProps): JSX.Element {
  const def = REQUIREMENT_DEFINITIONS[requirement.requirementType];
  const mediaConsentLevel = getMediaConsentLevel(requirement);
  const mediaConsentIcon =
    mediaConsentLevel === "green"
      ? "🟢"
      : mediaConsentLevel === "yellow"
        ? "🟡"
        : "🔴";

  // Check if renewal is due
  let isExpired = false;
  let expiryDate: Date | null = null;

  if (def.renewalMonths !== null && requirement.completedDate) {
    expiryDate = addMonths(
      parseISO(requirement.completedDate),
      def.renewalMonths,
    );
    isExpired = isBefore(expiryDate, new Date());
  }

  return (
    <div
      className={`requirement-item ${isExpired ? "requirement-item--expired" : ""}`}
    >
      <div className="requirement-item-icon">
        {isExpired ? (
          <AlertCircle size={20} className="icon-warning" />
        ) : (
          <CheckCircle size={20} className="icon-success" />
        )}
      </div>
      <div className="requirement-item-body">
        <div className="requirement-item-title">{def.label}</div>

        <div className="requirement-item-meta">
          {requirement.completedDate && (
            <span>
              Abgeschlossen:{" "}
              {format(parseISO(requirement.completedDate), "dd.MM.yyyy", {
                locale: de,
              })}
            </span>
          )}
          {def.renewalMonths !== null && expiryDate && (
            <span>
              {" · "}
              {isExpired ? "Abgelaufen" : "Gültig bis"}:{" "}
              {format(expiryDate, "dd.MM.yyyy", { locale: de })}
            </span>
          )}
        </div>

        {requirement.requirementType === "bildundton" && (
          <div className="requirement-item-notes">
            <strong>{mediaConsentIcon} Freigabe:</strong>{" "}
            {getMediaConsentDescription(mediaConsentLevel)}
          </div>
        )}

        {requirement.fileName && (
          <div className="requirement-item-file">📎 {requirement.fileName}</div>
        )}

        {!requirement.filePath && def.requiresDocument && (
          <div className="requirement-item-notes">
            Unterschriebenes Dokument fehlt noch.
          </div>
        )}

        {requirement.notes && (
          <div className="requirement-item-notes">{requirement.notes}</div>
        )}
      </div>
      <div className="requirement-item-actions">
        <button className="btn btn-ghost" title="Bearbeiten" onClick={onEdit}>
          <Pencil size={15} /> Bearbeiten
        </button>
        {requirement.fileName && requirement.filePath && (
          <button
            className="btn btn-ghost"
            title="Dokument öffnen"
            onClick={onOpen}
          >
            <Eye size={15} /> Öffnen
          </button>
        )}
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

// ──────────────────────────────────────────────────────────
// MissingRequirementItem — display missing/incomplete requirement
// ──────────────────────────────────────────────────────────

interface MissingRequirementItemProps {
  requirementType: RequirementType;
  onAdd: () => void;
}

function MissingRequirementItem({
  requirementType,
  onAdd,
}: MissingRequirementItemProps): JSX.Element {
  const def = REQUIREMENT_DEFINITIONS[requirementType];

  return (
    <div className="requirement-item requirement-item--missing">
      <div className="requirement-item-icon">
        <AlertCircle size={20} className="icon-missing" />
      </div>
      <div className="requirement-item-body">
        <div className="requirement-item-title">{def.label}</div>
        <div className="requirement-item-meta">
          <span style={{ color: "var(--color-text-muted)" }}>
            Noch nicht erfasst
          </span>
          {def.renewalMonths !== null && (
            <span>
              {" · "}
              Erneuerung alle {def.renewalMonths} Monate
            </span>
          )}
          {def.renewalMonths === null && <span> · Einmalig</span>}
          {requirementType === "bildundton" && (
            <span> · Standard: Rot (nur intern)</span>
          )}
        </div>
      </div>
      <div className="requirement-item-actions">
        <button
          className="btn btn-secondary"
          title="Hinzufügen"
          onClick={onAdd}
        >
          <Plus size={15} /> Hinzufügen
        </button>
      </div>
    </div>
  );
}
