import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Users2 } from "lucide-react";
import { format, parseISO, isSameDay, isBefore, startOfDay } from "date-fns";
import { de } from "date-fns/locale";
import { useGroupMeetings } from "../hooks/useGroupMeetings";
import "./GroupMeetings.css";

export default function GroupMeetings(): JSX.Element {
  const { index, loading, refresh } = useGroupMeetings();
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
