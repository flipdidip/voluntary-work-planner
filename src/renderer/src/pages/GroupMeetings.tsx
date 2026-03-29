import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Users2, Mail, Globe } from "lucide-react";
import { format, parseISO, isSameDay, isBefore, startOfDay } from "date-fns";
import { de } from "date-fns/locale";
import { useGroupMeetings } from "../hooks/useGroupMeetings";
import { useVolunteerIndex } from "../hooks/useVolunteers";
import { usePartnerIndex } from "../hooks/usePartners";
import { GroupMeeting } from "@shared/types";
import "./GroupMeetings.css";

export default function GroupMeetings(): JSX.Element {
  const { index, loading, refresh } = useGroupMeetings();
  const { index: volunteerIndex } = useVolunteerIndex();
  const { index: partnerIndex } = usePartnerIndex();
  const navigate = useNavigate();

  const meetings = useMemo(() => {
    if (!index) return [];
    // Sort by date ascending (upcoming first), then past at the bottom
    return [...index.meetings].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }, [index]);

  const today = startOfDay(new Date());

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
    const formattedDate = format(parseISO(meeting.date), "dd.MM.yyyy", {
      locale: de,
    });
    const subject = encodeURIComponent(`${meeting.title} – ${formattedDate}`);
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
    const fmtDate = format(parseISO(meeting.date), "dd.MM.yyyy", {
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

      {loading && <p className="text-muted">Lade...</p>}

      {!loading && meetings.length === 0 && (
        <p className="text-muted empty-hint">
          Noch keine Gruppentreffen erstellt.
        </p>
      )}

      <div className="meeting-list">
        {meetings.map((m) => {
          const meetingDate = parseISO(m.date);
          const isToday = isSameDay(meetingDate, today);
          const isPast = isBefore(meetingDate, today) && !isToday;

          return (
            <div
              key={m.id}
              className={`meeting-item card${isPast ? " meeting-past" : ""}${isToday ? " meeting-today" : ""}`}
              onClick={() => navigate(`/meetings/${m.id}`)}
            >
              <div className="meeting-date">
                {format(meetingDate, "dd. MMM yyyy", { locale: de })}
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
