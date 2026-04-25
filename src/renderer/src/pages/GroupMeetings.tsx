import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Users2, Mail, Globe, CalendarClock } from "lucide-react";
import { format, parseISO, isSameDay, isBefore, startOfDay } from "date-fns";
import { de } from "date-fns/locale";
import { useGroupMeetings } from "../hooks/useGroupMeetings";
import { useVolunteerIndex } from "../hooks/useVolunteers";
import { usePartnerIndex } from "../hooks/usePartners";
import { GroupMeeting, getGroupMeetingAttendanceStatus } from "@shared/types";
import "./GroupMeetings.css";

export default function GroupMeetings(): JSX.Element {
  const { index, loading, refresh } = useGroupMeetings();
  const { index: volunteerIndex } = useVolunteerIndex();
  const { index: partnerIndex } = usePartnerIndex();
  const navigate = useNavigate();
  const [showPast, setShowPast] = useState(false);

  const meetings = useMemo(() => {
    if (!index) return [];
    // Sort by date ascending (upcoming first), then past at the bottom
    return [...index.meetings].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }, [index]);

  const today = startOfDay(new Date());

  const visibleMeetings = useMemo(() => {
    if (showPast) return meetings;
    return meetings.filter((meeting) => {
      const meetingDate = parseISO(meeting.date);
      return !isBefore(meetingDate, today) || isSameDay(meetingDate, today);
    });
  }, [meetings, showPast, today]);

  const handleDelete = async (
    e: React.MouseEvent,
    meetingId: string,
  ): Promise<void> => {
    e.stopPropagation();
    if (!confirm("Dieses Gruppentreffen wirklich löschen?")) return;
    await window.api.deleteGroupMeeting(meetingId);
    refresh();
  };

  const handleMailAll = (e: React.MouseEvent, meeting: GroupMeeting): void => {
    e.stopPropagation();
    const emails: string[] = [];
    for (const p of meeting.participants) {
      const source =
        p.type === "volunteer"
          ? volunteerIndex?.volunteers
          : partnerIndex?.volunteers;
      const entry = source?.find((v) => v.id === p.id);
      if (entry?.email?.trim()) emails.push(entry.email.trim());
    }
    if (emails.length === 0) {
      alert("Keine E-Mail-Adressen bei den Teilnehmern hinterlegt.");
      return;
    }
    const formattedDateTime = format(
      parseISO(meeting.date),
      "dd.MM.yyyy HH:mm",
      {
        locale: de,
      },
    );
    const subject = encodeURIComponent(
      `${meeting.title} – ${formattedDateTime}`,
    );
    const mailto = `mailto:${emails.map((e) => encodeURIComponent(e)).join(",")}?subject=${subject}`;
    window.api.openExternalUrl(mailto);
  };

  const handleOutlookWebAll = (
    e: React.MouseEvent,
    meeting: GroupMeeting,
  ): void => {
    e.stopPropagation();
    const emails: string[] = [];
    for (const p of meeting.participants) {
      const source =
        p.type === "volunteer"
          ? volunteerIndex?.volunteers
          : partnerIndex?.volunteers;
      const entry = source?.find((v) => v.id === p.id);
      if (entry?.email?.trim()) emails.push(entry.email.trim());
    }
    if (emails.length === 0) {
      alert("Keine E-Mail-Adressen bei den Teilnehmern hinterlegt.");
      return;
    }
    const to = emails.join(";");
    const fmtDate = format(parseISO(meeting.date), "dd.MM.yyyy HH:mm", {
      locale: de,
    });
    const url = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(`${meeting.title} – ${fmtDate}`)}`;
    window.api.openExternalUrl(url);
  };

  return (
    <div className="group-meetings-page">
      <div className="page-header-row">
        <div>
          <h1>Gruppen Treffen</h1>
          <p className="text-muted">
            Termine für gemeinsame Treffen mit Ehrenamtlichen und
            Kooperationspartnern
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/meetings/new")}
        >
          <Plus size={16} /> Neues Treffen
        </button>
      </div>

      <div className="meeting-filters">
        <span className="meeting-filters-label">Filter:</span>
        <button
          type="button"
          className={`meeting-filter-chip ${showPast ? "active" : ""}`}
          onClick={() => setShowPast((prev) => !prev)}
          title="Aus: vergangene Treffen ausblenden · Aktiv: alle Treffen anzeigen"
        >
          <CalendarClock size={14} />
          Vergangene: {showPast ? "Alle" : "Aus"}
        </button>
      </div>

      {loading && <p className="text-muted">Lade...</p>}

      {!loading && visibleMeetings.length === 0 && (
        <p className="text-muted empty-hint">
          {showPast
            ? "Noch keine Gruppentreffen erstellt."
            : "Keine kommenden Gruppentreffen. Aktiviere den Filter, um vergangene zu sehen."}
        </p>
      )}

      <div className="meeting-list">
        {visibleMeetings.map((m) => {
          const meetingDate = parseISO(m.date);
          const isToday = isSameDay(meetingDate, today);
          const isPast = isBefore(meetingDate, today) && !isToday;
          const attendanceCounts = m.participants.reduce(
            (acc, participant) => {
              const status = getGroupMeetingAttendanceStatus(participant);
              acc[status] += 1;
              return acc;
            },
            { present: 0, unknown: 0, absent: 0 },
          );

          return (
            <div
              key={m.id}
              className={`meeting-item card${isPast ? " meeting-past" : ""}${isToday ? " meeting-today" : ""}`}
              onClick={() => navigate(`/meetings/${m.id}`)}
            >
              <div className="meeting-date">
                {format(meetingDate, "dd. MMM yyyy, HH:mm", { locale: de })}
                {isToday && " (Heute)"}
              </div>
              <div className="meeting-title">{m.title}</div>
              <div className="meeting-participants">
                {m.participants.map((p) => (
                  <span
                    key={p.id}
                    className={`participant-badge type-${p.type}`}
                  >
                    {p.name}
                  </span>
                ))}
                {m.participants.length === 0 && (
                  <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                    <Users2 size={12} /> Keine Teilnehmer
                  </span>
                )}
              </div>
              {m.participants.length > 0 && (
                <div className="meeting-attendance-summary">
                  <span className="attendance-pill attendance-pill-present">
                    {attendanceCounts.present} anwesend
                  </span>
                  <span className="attendance-pill attendance-pill-unknown">
                    {attendanceCounts.unknown} offen
                  </span>
                  <span className="attendance-pill attendance-pill-absent">
                    {attendanceCounts.absent} nicht da
                  </span>
                </div>
              )}
              <div className="meeting-actions">
                <button
                  className="btn-icon-mail"
                  title="E-Mail an alle Teilnehmer"
                  onClick={(e) => handleMailAll(e, m)}
                >
                  <Mail size={14} />
                </button>
                <button
                  className="btn-icon-mail"
                  title="Outlook Web öffnen"
                  onClick={(e) => handleOutlookWebAll(e, m)}
                >
                  <Globe size={14} />
                </button>
                <button
                  className="btn-icon-danger"
                  title="Löschen"
                  onClick={(e) => handleDelete(e, m.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
