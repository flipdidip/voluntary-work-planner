import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Bell, Calendar, FolderOpen } from "lucide-react";
import { useVolunteerIndex } from "../hooks/useVolunteers";
import {
  format,
  parseISO,
  differenceInCalendarDays,
  addYears,
  startOfDay,
} from "date-fns";
import { de } from "date-fns/locale";
import { DueReminder } from "../hooks/useReminders";
import "./Dashboard.css";

interface UpcomingEvent {
  volunteerId: string;
  volunteerName: string;
  eventType: "birthday" | "reminder";
  label: string;
  daysUntil: number;
  date: string;
}

function getNextBirthdayDate(dateOfBirth: string, today: Date): Date {
  const dob = parseISO(dateOfBirth);
  const nextBirthday = new Date(
    today.getFullYear(),
    dob.getMonth(),
    dob.getDate(),
  );
  if (differenceInCalendarDays(nextBirthday, today) < 0) {
    return addYears(nextBirthday, 1);
  }
  return nextBirthday;
}

export default function Dashboard(): JSX.Element {
  const { index, loading } = useVolunteerIndex();
  const navigate = useNavigate();
  const [dataPath, setDataPath] = useState<string>("");
  const [upcoming, setUpcoming] = useState<UpcomingEvent[]>([]);

  useEffect(() => {
    window.api.getDataPath().then(setDataPath);
  }, []);

  useEffect(() => {
    if (!index) return;

    let cancelled = false;

    const loadUpcoming = async (): Promise<void> => {
      const today = startOfDay(new Date());
      const events: UpcomingEvent[] = [];

      for (const v of index.volunteers) {
        if (v.status === "archived" || !v.dateOfBirth) continue;

        const nextBirthday = getNextBirthdayDate(v.dateOfBirth, today);
        const daysUntil = differenceInCalendarDays(nextBirthday, today);

        if (daysUntil >= 0 && daysUntil <= 30) {
          const age =
            nextBirthday.getFullYear() - parseISO(v.dateOfBirth).getFullYear();
          events.push({
            volunteerId: v.id,
            volunteerName: `${v.firstName} ${v.lastName}`,
            eventType: "birthday",
            label: `${age}. Geburtstag`,
            daysUntil,
            date: format(nextBirthday, "yyyy-MM-dd"),
          });
        }
      }

      const dateOfBirthById = new Map(
        index.volunteers.map((v) => [v.id, v.dateOfBirth]),
      );

      try {
        const reminders = (await window.api.getDueReminders()) as DueReminder[];

        for (const due of reminders) {
          const reminder = due.reminder;
          let reminderDate: Date | null = null;

          if (reminder.type === "custom" && reminder.triggerDate) {
            reminderDate = parseISO(reminder.triggerDate);
          } else {
            const dateOfBirth = dateOfBirthById.get(due.volunteerId);
            if (dateOfBirth) {
              reminderDate = getNextBirthdayDate(dateOfBirth, today);
            }
          }

          if (!reminderDate) continue;

          const daysUntil = differenceInCalendarDays(reminderDate, today);
          if (daysUntil < 0 || daysUntil > 30) continue;

          events.push({
            volunteerId: due.volunteerId,
            volunteerName: due.volunteerName,
            eventType: "reminder",
            label: reminder.title,
            daysUntil,
            date: format(reminderDate, "yyyy-MM-dd"),
          });
        }
      } catch {
        // Keep birthdays visible even if reminders fail
      }

      events.sort((a, b) => a.daysUntil - b.daysUntil);
      if (!cancelled) {
        setUpcoming(events);
      }
    };

    loadUpcoming();

    return () => {
      cancelled = true;
    };
  }, [index]);

  const activeCount =
    index?.volunteers.filter((v) => v.status === "active").length ?? 0;
  const inactiveCount =
    index?.volunteers.filter((v) => v.status === "inactive").length ?? 0;
  const totalCount = index?.volunteers.length ?? 0;

  if (!dataPath) {
    return (
      <div className="dashboard-setup">
        <div className="card setup-card">
          <FolderOpen size={40} className="setup-icon" />
          <h2>Willkommen!</h2>
          <p>
            Bitte zuerst den Datenordner konfigurieren (z.B. OneDrive /
            SharePoint-Sync-Ordner).
          </p>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/settings")}
          >
            Einstellungen öffnen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="text-muted">Übersicht der Ehrenamtlichen</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card card" onClick={() => navigate("/volunteers")}>
          <div className="stat-icon stat-icon--blue">
            <Users size={20} />
          </div>
          <div className="stat-value">{totalCount}</div>
          <div className="stat-label">Gesamt</div>
        </div>
        <div
          className="stat-card card"
          onClick={() => navigate("/volunteers?status=active")}
        >
          <div className="stat-icon stat-icon--green">
            <Users size={20} />
          </div>
          <div className="stat-value">{activeCount}</div>
          <div className="stat-label">Aktiv</div>
        </div>
        <div
          className="stat-card card"
          onClick={() => navigate("/volunteers?status=inactive")}
        >
          <div className="stat-icon stat-icon--gray">
            <Users size={20} />
          </div>
          <div className="stat-value">{inactiveCount}</div>
          <div className="stat-label">Inaktiv</div>
        </div>
        <div className="stat-card card" onClick={() => navigate("/events")}>
          <div className="stat-icon stat-icon--purple">
            <Bell size={20} />
          </div>
          <div className="stat-value">{upcoming.length}</div>
          <div className="stat-label">Bald fällig</div>
        </div>
      </div>

      {/* Upcoming birthdays / reminders */}
      <section className="section">
        <h2>
          <Calendar size={18} /> Nächste Ereignisse (30 Tage)
        </h2>
        {loading && <p className="text-muted">Lade...</p>}
        {!loading && upcoming.length === 0 && (
          <p className="text-muted empty-hint">Keine anstehenden Ereignisse.</p>
        )}
        <div className="upcoming-list">
          {upcoming.map((ev) => (
            <div
              key={`${ev.volunteerId}-${ev.date}`}
              className="upcoming-item card"
              onClick={() => navigate(`/volunteers/${ev.volunteerId}`)}
            >
              <div
                className={`upcoming-badge ${ev.daysUntil === 0 ? "badge-green" : "badge-purple"} badge`}
              >
                {ev.daysUntil === 0 ? "Heute!" : `in ${ev.daysUntil}d`}
              </div>
              <div className="upcoming-info">
                <span className="upcoming-name">{ev.volunteerName}</span>
                <span className="upcoming-label">{ev.label}</span>
              </div>
              <div className="upcoming-date">
                {format(parseISO(ev.date), "dd. MMM", { locale: de })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
