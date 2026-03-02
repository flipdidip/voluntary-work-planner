import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Bell, Calendar, AlertTriangle, FolderOpen } from "lucide-react";
import { useVolunteerIndex } from "../hooks/useVolunteers";
import { format, parseISO, differenceInDays } from "date-fns";
import { de } from "date-fns/locale";
import "./Dashboard.css";

interface UpcomingEvent {
  volunteerId: string;
  volunteerName: string;
  eventType: "birthday" | "reminder";
  label: string;
  daysUntil: number;
  date: string;
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
    const now = new Date();
    const events: UpcomingEvent[] = [];

    for (const v of index.volunteers) {
      if (v.status === "archived") continue;

      if (v.dateOfBirth) {
        const dob = parseISO(v.dateOfBirth);
        const thisYearBirthday = new Date(
          now.getFullYear(),
          dob.getMonth(),
          dob.getDate(),
        );
        if (thisYearBirthday < now)
          thisYearBirthday.setFullYear(now.getFullYear() + 1);
        const days = differenceInDays(thisYearBirthday, now);
        if (days <= 30) {
          const age = thisYearBirthday.getFullYear() - dob.getFullYear();
          events.push({
            volunteerId: v.id,
            volunteerName: `${v.firstName} ${v.lastName}`,
            eventType: "birthday",
            label: `${age}. Geburtstag`,
            daysUntil: days,
            date: thisYearBirthday.toISOString(),
          });
        }
      }
    }

    events.sort((a, b) => a.daysUntil - b.daysUntil);
    setUpcoming(events);
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
        <div className="stat-card card">
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
