import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, CalendarDays, Mail, Globe, Users2 } from "lucide-react";
import { format, parseISO, isSameDay, isBefore, startOfDay } from "date-fns";
import { de } from "date-fns/locale";
import { usePartnerAppointments } from "../hooks/usePartnerAppointments";
import { usePartnerIndex } from "../hooks/usePartners";
import {
  PartnerAppointment,
  getGroupMeetingAttendanceStatus,
} from "@shared/types";
import "./GroupMeetings.css";

export default function PartnerAppointments(): JSX.Element {
  const { index, loading, refresh } = usePartnerAppointments();
  const { index: partnerIndex } = usePartnerIndex();
  const navigate = useNavigate();

  const appointments = useMemo(() => {
    if (!index) return [];
    return [...index.appointments].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }, [index]);

  const today = startOfDay(new Date());

  const handleDelete = async (
    e: React.MouseEvent,
    appointmentId: string,
  ): Promise<void> => {
    e.stopPropagation();
    if (!confirm("Diesen Termin wirklich löschen?")) return;
    await window.api.deletePartnerAppointment(appointmentId);
    refresh();
  };

  const handleMailAll = (
    e: React.MouseEvent,
    appointment: PartnerAppointment,
  ): void => {
    e.stopPropagation();
    const emails: string[] = [];
    for (const p of appointment.participants) {
      const entry = partnerIndex?.volunteers.find((v) => v.id === p.id);
      if (entry?.email?.trim()) emails.push(entry.email.trim());
    }
    if (emails.length === 0) {
      alert("Keine E-Mail-Adressen bei den Teilnehmern hinterlegt.");
      return;
    }
    const formattedDate = format(
      parseISO(appointment.date),
      "dd.MM.yyyy HH:mm",
      {
        locale: de,
      },
    );
    const subject = encodeURIComponent(
      `${appointment.title} – ${formattedDate}`,
    );
    const mailto = `mailto:${emails.map((mail) => encodeURIComponent(mail)).join(",")}?subject=${subject}`;
    window.api.openExternalUrl(mailto);
  };

  const handleOutlookWebAll = (
    e: React.MouseEvent,
    appointment: PartnerAppointment,
  ): void => {
    e.stopPropagation();
    const emails: string[] = [];
    for (const p of appointment.participants) {
      const entry = partnerIndex?.volunteers.find((v) => v.id === p.id);
      if (entry?.email?.trim()) emails.push(entry.email.trim());
    }
    if (emails.length === 0) {
      alert("Keine E-Mail-Adressen bei den Teilnehmern hinterlegt.");
      return;
    }
    const to = emails.join(";");
    const fmtDate = format(parseISO(appointment.date), "dd.MM.yyyy HH:mm", {
      locale: de,
    });
    const url = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(`${appointment.title} – ${fmtDate}`)}`;
    window.api.openExternalUrl(url);
  };

  return (
    <div className="group-meetings-page">
      <div className="page-header-row">
        <div>
          <h1>Termine</h1>
          <p className="text-muted">
            Termine und Absprachen mit Kooperationspartnern
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/appointments/new")}
        >
          <Plus size={16} /> Neuer Termin
        </button>
      </div>

      {loading && <p className="text-muted">Lade...</p>}

      {!loading && appointments.length === 0 && (
        <p className="text-muted empty-hint">Noch keine Termine erstellt.</p>
      )}

      <div className="meeting-list">
        {appointments.map((appointment) => {
          const appointmentDate = parseISO(appointment.date);
          const isToday = isSameDay(appointmentDate, today);
          const isPast = isBefore(appointmentDate, today) && !isToday;
          const attendanceCounts = appointment.participants.reduce(
            (acc, participant) => {
              const status = getGroupMeetingAttendanceStatus(participant);
              acc[status] += 1;
              return acc;
            },
            { present: 0, unknown: 0, absent: 0 },
          );

          return (
            <div
              key={appointment.id}
              className={`meeting-item card${isPast ? " meeting-past" : ""}${isToday ? " meeting-today" : ""}`}
              onClick={() => navigate(`/appointments/${appointment.id}`)}
            >
              <div className="meeting-date">
                {format(appointmentDate, "dd. MMM yyyy, HH:mm", { locale: de })}
                {isToday && " (Heute)"}
              </div>
              <div className="meeting-title">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CalendarDays size={16} />
                  <span>{appointment.title}</span>
                </div>
              </div>
              <div className="meeting-participants">
                {appointment.participants.map((participant) => (
                  <span
                    key={participant.id}
                    className="participant-badge type-partner"
                  >
                    {participant.name}
                  </span>
                ))}
                {appointment.participants.length === 0 && (
                  <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                    <Users2 size={12} /> Keine Teilnehmer
                  </span>
                )}
              </div>
              {appointment.participants.length > 0 && (
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
                  onClick={(e) => handleMailAll(e, appointment)}
                >
                  <Mail size={14} />
                </button>
                <button
                  className="btn-icon-mail"
                  title="Outlook Web öffnen"
                  onClick={(e) => handleOutlookWebAll(e, appointment)}
                >
                  <Globe size={14} />
                </button>
                <button
                  className="btn-icon-danger"
                  title="Löschen"
                  onClick={(e) => handleDelete(e, appointment.id)}
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
