import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, X, Copy, Mail, Check, Globe } from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { v4 as uuidv4 } from "uuid";
import {
  combineDateAndTime,
  DEFAULT_EVENT_TIME,
  getDatePart,
  getTimePart,
} from "@shared/dateTime";
import {
  GroupMeetingAttendanceStatus,
  GROUP_MEETING_ATTENDANCE_LABELS,
  PartnerAppointment,
  PartnerAppointmentParticipant,
  VolunteerIndexEntry,
} from "@shared/types";
import { usePartnerIndex } from "../hooks/usePartners";
import { usePartnerAppointments } from "../hooks/usePartnerAppointments";
import "./GroupMeetingNew.css";

const ATTENDANCE_STATUSES: GroupMeetingAttendanceStatus[] = [
  "present",
  "unknown",
  "absent",
];

export default function PartnerAppointmentNew(): JSX.Element {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = !!id && id !== "new";

  const { index: partnerIndex } = usePartnerIndex();
  const { index: appointmentsIndex } = usePartnerAppointments();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(
    searchParams.get("date") || new Date().toISOString().split("T")[0],
  );
  const [time, setTime] = useState(DEFAULT_EVENT_TIME);
  const [notes, setNotes] = useState("");
  const [participants, setParticipants] = useState<
    PartnerAppointmentParticipant[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [emailSelection, setEmailSelection] = useState<Set<string>>(new Set());
  const [emailCopied, setEmailCopied] = useState(false);

  useEffect(() => {
    if (!isEdit || !appointmentsIndex) return;
    const appointment = appointmentsIndex.appointments.find(
      (entry) => entry.id === id,
    );
    if (appointment) {
      setTitle(appointment.title);
      setDate(getDatePart(appointment.date));
      setTime(getTimePart(appointment.date));
      setNotes(appointment.notes || "");
      setParticipants(
        appointment.participants.map((participant) => ({
          ...participant,
          attendance: participant.attendance ?? "unknown",
        })),
      );
    }
  }, [isEdit, id, appointmentsIndex]);

  useEffect(() => {
    const partnerId = searchParams.get("partnerId");
    if (isEdit || !partnerId || !partnerIndex) return;

    const partner = partnerIndex.volunteers.find(
      (entry) => entry.id === partnerId,
    );
    if (!partner) return;

    setParticipants((prev) => {
      if (prev.some((participant) => participant.id === partner.id)) {
        return prev;
      }

      return [
        ...prev,
        {
          id: partner.id,
          name: `${partner.firstName} ${partner.lastName}`,
          attendance: "unknown",
        },
      ];
    });
  }, [isEdit, partnerIndex, searchParams]);

  useEffect(() => {
    setEmailSelection((prev) => {
      const selectedIds = new Set(
        participants.map((participant) => participant.id),
      );
      return new Set(
        [...prev].filter((participantId) => selectedIds.has(participantId)),
      );
    });
  }, [participants]);

  const partners: VolunteerIndexEntry[] = useMemo(
    () =>
      (partnerIndex?.volunteers ?? []).filter(
        (entry) => entry.status !== "archived",
      ),
    [partnerIndex],
  );

  const activePartners = useMemo(
    () => partners.filter((entry) => entry.status === "active"),
    [partners],
  );

  const participantEmails = useMemo(() => {
    const emailMap: Record<string, string | undefined> = {};
    for (const participant of participants) {
      const entry = partners.find((partner) => partner.id === participant.id);
      emailMap[participant.id] = entry?.email;
    }
    return emailMap;
  }, [participants, partners]);

  const participantsWithEmail = useMemo(
    () =>
      participants.filter((participant) =>
        participantEmails[participant.id]?.trim(),
      ),
    [participants, participantEmails],
  );

  const selectedEmails = useMemo(
    () =>
      [...emailSelection]
        .map((entryId) => participantEmails[entryId])
        .filter((email): email is string => !!email && email.trim() !== ""),
    [emailSelection, participantEmails],
  );

  const toggleEmailSelection = (participantId: string): void => {
    setEmailSelection((prev) => {
      const next = new Set(prev);
      if (next.has(participantId)) next.delete(participantId);
      else next.add(participantId);
      return next;
    });
  };

  const selectAllEmails = (): void => {
    setEmailSelection(
      new Set(participantsWithEmail.map((participant) => participant.id)),
    );
  };

  const deselectAllEmails = (): void => {
    setEmailSelection(new Set());
  };

  const copyEmailsToClipboard = async (): Promise<void> => {
    if (selectedEmails.length === 0) return;
    await navigator.clipboard.writeText(selectedEmails.join("; "));
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  };

  const openMailto = (): void => {
    if (selectedEmails.length === 0) return;
    const appointmentDateTime = combineDateAndTime(date, time);
    const formattedDate = date
      ? format(parseISO(appointmentDateTime), "dd.MM.yyyy HH:mm", {
          locale: de,
        })
      : "";
    const subject = encodeURIComponent(`${title.trim()} – ${formattedDate}`);
    const mailto = `mailto:${selectedEmails.map((email) => encodeURIComponent(email)).join(",")}?subject=${subject}`;
    window.api.openExternalUrl(mailto);
  };

  const openOutlookWeb = (): void => {
    if (selectedEmails.length === 0) return;
    const to = selectedEmails.join(";");
    const appointmentDateTime = combineDateAndTime(date, time);
    const formattedDate = date
      ? format(parseISO(appointmentDateTime), "dd.MM.yyyy HH:mm", {
          locale: de,
        })
      : "";
    const subject = `${title.trim()} – ${formattedDate}`;
    const url = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}`;
    window.api.openExternalUrl(url);
  };

  const isParticipantSelected = (entryId: string): boolean =>
    participants.some((participant) => participant.id === entryId);

  const toggleParticipant = (entry: VolunteerIndexEntry): void => {
    if (isParticipantSelected(entry.id)) {
      setParticipants((prev) =>
        prev.filter((participant) => participant.id !== entry.id),
      );
    } else {
      setParticipants((prev) => [
        ...prev,
        {
          id: entry.id,
          name: `${entry.firstName} ${entry.lastName}`,
          attendance: "unknown",
        },
      ]);
    }
  };

  const selectAllActivePartners = (): void => {
    setParticipants((prev) => {
      const existingIds = new Set(prev.map((participant) => participant.id));
      const additions = activePartners
        .filter((entry) => !existingIds.has(entry.id))
        .map((entry) => ({
          id: entry.id,
          name: `${entry.firstName} ${entry.lastName}`,
          attendance: "unknown" as const,
        }));

      return [...prev, ...additions];
    });
  };

  const clearParticipants = (): void => {
    setParticipants([]);
  };

  const setParticipantAttendance = (
    participantId: string,
    attendance: GroupMeetingAttendanceStatus,
  ): void => {
    setParticipants((prev) =>
      prev.map((participant) =>
        participant.id === participantId
          ? { ...participant, attendance }
          : participant,
      ),
    );
  };

  const removeParticipant = (participantId: string): void => {
    setParticipants((prev) =>
      prev.filter((participant) => participant.id !== participantId),
    );
  };

  const attendanceSummary = useMemo(() => {
    return participants.reduce(
      (acc, participant) => {
        const status = participant.attendance ?? "unknown";
        acc[status] += 1;
        return acc;
      },
      { present: 0, unknown: 0, absent: 0 },
    );
  }, [participants]);

  const handleSave = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    if (!title.trim() || !date || !time) return;

    setSaving(true);

    const appointment: PartnerAppointment = {
      id: isEdit ? id! : uuidv4(),
      title: title.trim(),
      date: combineDateAndTime(date, time),
      participants,
      notes: notes.trim() || undefined,
      _createdAt: "",
      _updatedAt: "",
    };

    if (isEdit && appointmentsIndex) {
      const existing = appointmentsIndex.appointments.find(
        (entry) => entry.id === id,
      );
      if (existing) {
        appointment._createdAt = existing._createdAt;
      }
    }

    try {
      const result = await window.api.savePartnerAppointment(appointment);
      if (result.success) {
        navigate("/appointments");
      } else {
        alert(result.error || "Fehler beim Speichern.");
      }
    } catch (err) {
      alert(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="group-meeting-new">
      <div className="page-header">
        <button
          className="btn btn-ghost"
          onClick={() => navigate("/appointments")}
        >
          <ArrowLeft size={18} />
        </button>
        <h1>{isEdit ? "Termin bearbeiten" : "Neuer Termin"}</h1>
      </div>

      <form className="new-form card" onSubmit={handleSave}>
        <div className="form-row">
          <label>
            Titel *
            <input
              className="input"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="z.B. Abstimmungsgespräch"
            />
          </label>
          <label>
            Datum *
            <input
              className="input"
              type="date"
              name="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          <label>
            Uhrzeit *
            <input
              className="input"
              type="time"
              name="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </label>
        </div>

        <label>
          Notizen
          <textarea
            className="input"
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Optionale Details zum Termin..."
          />
        </label>

        <div className="participant-section">
          <h3>Kooperationspartner</h3>

          <div className="selected-participants">
            {participants.map((participant) => (
              <span
                key={participant.id}
                className="selected-participant-chip type-partner"
              >
                {participant.name}
                <button
                  type="button"
                  className="participant-chip-remove"
                  onClick={() => removeParticipant(participant.id)}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {participants.length === 0 && (
              <span className="text-muted" style={{ fontSize: "0.8rem" }}>
                Noch keine Kooperationspartner ausgewählt
              </span>
            )}
          </div>

          <div className="participant-bulk-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={selectAllActivePartners}
              disabled={activePartners.length === 0}
            >
              Alle aktiven Kooperationspartner auswählen (
              {activePartners.length})
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={clearParticipants}
            >
              Auswahl löschen
            </button>
          </div>

          <div className="participant-picker-list">
            {partners.length === 0 && (
              <div
                className="text-muted"
                style={{ padding: "12px", textAlign: "center" }}
              >
                Keine Kooperationspartner vorhanden
              </div>
            )}
            {partners.map((entry) => (
              <label key={entry.id} className="participant-pick-item">
                <input
                  type="checkbox"
                  checked={isParticipantSelected(entry.id)}
                  onChange={() => toggleParticipant(entry)}
                />
                <span className="participant-pick-name">
                  {entry.firstName} {entry.lastName}
                </span>
                <span
                  className={`participant-pick-status status-${entry.status}`}
                >
                  {entry.status === "active"
                    ? "Aktiv"
                    : entry.status === "inactive"
                      ? "Inaktiv"
                      : "Archiviert"}
                </span>
              </label>
            ))}
          </div>

          {participants.length > 0 && (
            <div className="attendance-section">
              <h3>Teilnahme dokumentieren</h3>
              <p
                className="text-muted"
                style={{ margin: 0, fontSize: "0.82rem" }}
              >
                Der Status kann direkt oder auch nachträglich gespeichert
                werden.
              </p>

              <div className="attendance-summary">
                <span className="attendance-summary-pill present">
                  Anwesend: {attendanceSummary.present}
                </span>
                <span className="attendance-summary-pill unknown">
                  Offen: {attendanceSummary.unknown}
                </span>
                <span className="attendance-summary-pill absent">
                  Nicht anwesend: {attendanceSummary.absent}
                </span>
              </div>

              <div className="attendance-list">
                {participants.map((participant) => {
                  const attendance = participant.attendance ?? "unknown";

                  return (
                    <div key={participant.id} className="attendance-item">
                      <div>
                        <div className="attendance-name">
                          {participant.name}
                        </div>
                        <div className="attendance-type-label">
                          Kooperationspartner
                        </div>
                      </div>
                      <div className="attendance-lights">
                        {ATTENDANCE_STATUSES.map((status) => (
                          <button
                            key={status}
                            type="button"
                            className={`attendance-light ${status}${attendance === status ? " active" : ""}`}
                            title={GROUP_MEETING_ATTENDANCE_LABELS[status]}
                            onClick={() =>
                              setParticipantAttendance(participant.id, status)
                            }
                          >
                            <span className="attendance-light-dot" />
                            {GROUP_MEETING_ATTENDANCE_LABELS[status]}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {participants.length > 0 && (
          <div className="email-actions-section">
            <h3>
              <Mail size={16} /> E-Mail Aktionen
            </h3>

            <div className="email-participant-list">
              <label className="email-select-all">
                <input
                  type="checkbox"
                  checked={
                    emailSelection.size === participantsWithEmail.length &&
                    participantsWithEmail.length > 0
                  }
                  onChange={() =>
                    emailSelection.size === participantsWithEmail.length
                      ? deselectAllEmails()
                      : selectAllEmails()
                  }
                  disabled={participantsWithEmail.length === 0}
                />
                Alle auswählen ({participantsWithEmail.length} mit E-Mail)
              </label>

              {participants.map((participant) => {
                const email = participantEmails[participant.id];
                const hasEmail = !!email?.trim();
                return (
                  <label
                    key={participant.id}
                    className={`email-participant-item${hasEmail ? "" : " no-email"}`}
                  >
                    <input
                      type="checkbox"
                      checked={emailSelection.has(participant.id)}
                      onChange={() => toggleEmailSelection(participant.id)}
                      disabled={!hasEmail}
                    />
                    <span className="email-participant-name">
                      {participant.name}
                    </span>
                    <span className="email-participant-email">
                      {hasEmail ? email : "Keine E-Mail hinterlegt"}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="email-action-buttons">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={selectedEmails.length === 0}
                onClick={copyEmailsToClipboard}
              >
                {emailCopied ? (
                  <>
                    <Check size={14} /> Kopiert!
                  </>
                ) : (
                  <>
                    <Copy size={14} /> E-Mails kopieren ({selectedEmails.length}
                    )
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={selectedEmails.length === 0}
                onClick={openMailto}
              >
                <Mail size={14} /> E-Mail Programm öffnen (
                {selectedEmails.length})
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={selectedEmails.length === 0}
                onClick={openOutlookWeb}
              >
                <Globe size={14} /> Outlook Web ({selectedEmails.length})
              </button>
            </div>
          </div>
        )}

        <div className="new-form-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate("/appointments")}
          >
            Abbrechen
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Speichern..." : isEdit ? "Speichern" : "Erstellen"}
          </button>
        </div>
      </form>
    </div>
  );
}
