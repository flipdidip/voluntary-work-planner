import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, X, Copy, Mail, Check, Globe } from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { v4 as uuidv4 } from "uuid";
import {
  GroupMeeting,
  GroupMeetingAttendanceStatus,
  GroupMeetingParticipant,
  GROUP_MEETING_ATTENDANCE_LABELS,
  VolunteerIndexEntry,
} from "@shared/types";
import { useVolunteerIndex } from "../hooks/useVolunteers";
import { usePartnerIndex } from "../hooks/usePartners";
import { useGroupMeetings } from "../hooks/useGroupMeetings";
import "./GroupMeetingNew.css";

type ParticipantTab = "volunteer" | "partner";

const ATTENDANCE_STATUSES: GroupMeetingAttendanceStatus[] = [
  "present",
  "unknown",
  "absent",
];

export default function GroupMeetingNew(): JSX.Element {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = !!id && id !== "new";

  const { index: volunteerIndex } = useVolunteerIndex();
  const { index: partnerIndex } = usePartnerIndex();
  const { index: meetingsIndex } = useGroupMeetings();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(
    searchParams.get("date") || new Date().toISOString().split("T")[0],
  );
  const [notes, setNotes] = useState("");
  const [participants, setParticipants] = useState<GroupMeetingParticipant[]>(
    [],
  );
  const [activeTab, setActiveTab] = useState<ParticipantTab>("volunteer");
  const [saving, setSaving] = useState(false);
  const [emailSelection, setEmailSelection] = useState<Set<string>>(new Set());
  const [emailCopied, setEmailCopied] = useState(false);

  // If editing, load existing meeting
  useEffect(() => {
    if (!isEdit || !meetingsIndex) return;
    const meeting = meetingsIndex.meetings.find((m) => m.id === id);
    if (meeting) {
      setTitle(meeting.title);
      setDate(meeting.date);
      setNotes(meeting.notes || "");
      setParticipants(
        meeting.participants.map((participant) => ({
          ...participant,
          attendance: participant.attendance ?? "unknown",
        })),
      );
    }
  }, [isEdit, id, meetingsIndex]);

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

  const volunteers: VolunteerIndexEntry[] = useMemo(
    () =>
      (volunteerIndex?.volunteers ?? []).filter((v) => v.status !== "archived"),
    [volunteerIndex],
  );

  const partners: VolunteerIndexEntry[] = useMemo(
    () =>
      (partnerIndex?.volunteers ?? []).filter((v) => v.status !== "archived"),
    [partnerIndex],
  );

  const activeVolunteers = useMemo(
    () => volunteers.filter((entry) => entry.status === "active"),
    [volunteers],
  );

  const activePartners = useMemo(
    () => partners.filter((entry) => entry.status === "active"),
    [partners],
  );

  const currentList = activeTab === "volunteer" ? volunteers : partners;
  const currentActiveList =
    activeTab === "volunteer" ? activeVolunteers : activePartners;

  // ── E-Mail helpers ──
  const participantEmails = useMemo(() => {
    const emailMap: Record<string, string | undefined> = {};
    for (const p of participants) {
      const source = p.type === "volunteer" ? volunteers : partners;
      const entry = source.find((e) => e.id === p.id);
      emailMap[p.id] = entry?.email;
    }
    return emailMap;
  }, [participants, volunteers, partners]);

  const participantsWithEmail = useMemo(
    () => participants.filter((p) => participantEmails[p.id]?.trim()),
    [participants, participantEmails],
  );

  const selectedEmails = useMemo(
    () =>
      [...emailSelection]
        .map((id) => participantEmails[id])
        .filter((e): e is string => !!e && e.trim() !== ""),
    [emailSelection, participantEmails],
  );

  const toggleEmailSelection = (id: string): void => {
    setEmailSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllEmails = (): void => {
    setEmailSelection(new Set(participantsWithEmail.map((p) => p.id)));
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
    const formattedDate = date
      ? format(parseISO(date), "dd.MM.yyyy", { locale: de })
      : "";
    const subject = encodeURIComponent(`${title.trim()} – ${formattedDate}`);
    const mailto = `mailto:${selectedEmails.map((e) => encodeURIComponent(e)).join(",")}?subject=${subject}`;
    window.api.openExternalUrl(mailto);
  };

  const openOutlookWeb = (): void => {
    if (selectedEmails.length === 0) return;
    const to = selectedEmails.join(";");
    const formattedDate = date
      ? format(parseISO(date), "dd.MM.yyyy", { locale: de })
      : "";
    const subject = `${title.trim()} – ${formattedDate}`;
    const url = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}`;
    window.api.openExternalUrl(url);
  };

  const isParticipantSelected = (entryId: string): boolean =>
    participants.some((p) => p.id === entryId);

  const toggleParticipant = (entry: VolunteerIndexEntry): void => {
    if (isParticipantSelected(entry.id)) {
      setParticipants((prev) => prev.filter((p) => p.id !== entry.id));
    } else {
      setParticipants((prev) => [
        ...prev,
        {
          id: entry.id,
          name: `${entry.firstName} ${entry.lastName}`,
          type: activeTab,
          attendance: "unknown",
        },
      ]);
    }
  };

  const selectAllActiveForTab = (): void => {
    setParticipants((prev) => {
      const existingIds = new Set(prev.map((participant) => participant.id));
      const additions = currentActiveList
        .filter((entry) => !existingIds.has(entry.id))
        .map((entry) => ({
          id: entry.id,
          name: `${entry.firstName} ${entry.lastName}`,
          type: activeTab,
          attendance: "unknown" as const,
        }));

      return [...prev, ...additions];
    });
  };

  const clearParticipantsForTab = (): void => {
    setParticipants((prev) =>
      prev.filter((participant) => participant.type !== activeTab),
    );
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
    setParticipants((prev) => prev.filter((p) => p.id !== participantId));
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
    if (!title.trim() || !date) return;

    setSaving(true);

    const meeting: GroupMeeting = {
      id: isEdit ? id! : uuidv4(),
      title: title.trim(),
      date,
      participants,
      notes: notes.trim() || undefined,
      _createdAt: "",
      _updatedAt: "",
    };

    // If editing, preserve original createdAt
    if (isEdit && meetingsIndex) {
      const existing = meetingsIndex.meetings.find((m) => m.id === id);
      if (existing) {
        meeting._createdAt = existing._createdAt;
      }
    }

    try {
      const result = await window.api.saveGroupMeeting(meeting);
      if (result.success) {
        navigate("/meetings");
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
        <button className="btn btn-ghost" onClick={() => navigate("/meetings")}>
          <ArrowLeft size={18} />
        </button>
        <h1>{isEdit ? "Treffen bearbeiten" : "Neues Gruppentreffen"}</h1>
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
              placeholder="z.B. Monatliches Teamtreffen"
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
        </div>

        <label>
          Notizen
          <textarea
            className="input"
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Optionale Notizen zum Treffen..."
          />
        </label>

        {/* Participant picker */}
        <div className="participant-section">
          <h3>Teilnehmer</h3>

          {/* Selected participants */}
          <div className="selected-participants">
            {participants.map((p) => (
              <span
                key={p.id}
                className={`selected-participant-chip type-${p.type}`}
              >
                {p.name}
                <button
                  type="button"
                  className="participant-chip-remove"
                  onClick={() => removeParticipant(p.id)}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {participants.length === 0 && (
              <span className="text-muted" style={{ fontSize: "0.8rem" }}>
                Noch keine Teilnehmer ausgewählt
              </span>
            )}
          </div>

          <div className="participant-bulk-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={selectAllActiveForTab}
              disabled={currentActiveList.length === 0}
            >
              Alle aktiven{" "}
              {activeTab === "volunteer"
                ? "Ehrenamtlichen"
                : "Kooperationspartner"}{" "}
              auswählen ({currentActiveList.length})
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={clearParticipantsForTab}
            >
              Auswahl im Tab löschen
            </button>
          </div>

          {/* Type tabs */}
          <div className="participant-type-tabs">
            <button
              type="button"
              className={`participant-type-tab${activeTab === "volunteer" ? " active" : ""}`}
              onClick={() => setActiveTab("volunteer")}
            >
              Ehrenamtliche ({volunteers.length})
            </button>
            <button
              type="button"
              className={`participant-type-tab${activeTab === "partner" ? " active" : ""}`}
              onClick={() => setActiveTab("partner")}
            >
              Kooperationspartner ({partners.length})
            </button>
          </div>

          {/* Pick list */}
          <div className="participant-picker-list">
            {currentList.length === 0 && (
              <div
                className="text-muted"
                style={{ padding: "12px", textAlign: "center" }}
              >
                Keine{" "}
                {activeTab === "volunteer"
                  ? "Ehrenamtlichen"
                  : "Kooperationspartner"}{" "}
                vorhanden
              </div>
            )}
            {currentList.map((entry) => (
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
                Die Ampel kann direkt oder auch nachträglich nach dem Treffen
                gespeichert werden.
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
                          {participant.type === "volunteer"
                            ? "Ehrenamtlich"
                            : "Kooperationspartner"}
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

        {/* ── E-Mail Actions ── */}
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

              {participants.map((p) => {
                const email = participantEmails[p.id];
                const hasEmail = !!email?.trim();
                return (
                  <label
                    key={p.id}
                    className={`email-participant-item${hasEmail ? "" : " no-email"}`}
                  >
                    <input
                      type="checkbox"
                      checked={emailSelection.has(p.id)}
                      onChange={() => toggleEmailSelection(p.id)}
                      disabled={!hasEmail}
                    />
                    <span className="email-participant-name">{p.name}</span>
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
            onClick={() => navigate("/meetings")}
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
