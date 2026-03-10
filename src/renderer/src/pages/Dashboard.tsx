import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Bell,
  Calendar,
  FolderOpen,
  Cake,
  Gift,
  Clock,
  Award,
  CheckCircle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { useVolunteerIndex } from "../hooks/useVolunteers";
import {
  calculateUpcomingEvents,
  UpcomingEvent,
} from "@shared/eventCalculationService";
import "./Dashboard.css";

// Helper to get event kind badge info
function getEventKindInfo(kind: UpcomingEvent["kind"]) {
  const info: Record<
    UpcomingEvent["kind"],
    { icon: React.ReactNode; label: string; color: string }
  > = {
    birthday: {
      icon: <Cake size={14} />,
      label: "Geburtstag",
      color: "badge-blue",
    },
    "birthday-round": {
      icon: <Gift size={14} />,
      label: "Runder Geburtstag",
      color: "badge-gold",
    },
    "anniversary-joined": {
      icon: <Bell size={14} />,
      label: "Jubiläum (Eintritt)",
      color: "badge-green",
    },
    "anniversary-activity": {
      icon: <Clock size={14} />,
      label: "Jubiläum (Aktivität)",
      color: "badge-teal",
    },
    "requirement-renewal": {
      icon: <CheckCircle size={14} />,
      label: "Qualifikation",
      color: "badge-orange",
    },
    custom: {
      icon: <Award size={14} />,
      label: "Erinnerung",
      color: "badge-purple",
    },
  };
  return info[kind];
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
      try {
        const settings = await window.api.getSettings();
        const events = await calculateUpcomingEvents(
          index,
          settings,
          (id) => window.api.getVolunteer(id),
          { daysLimit: 30 },
        );

        if (!cancelled) {
          setUpcoming(events);
        }
      } catch {
        // Keep dashboard visible even if calculation fails
        if (!cancelled) {
          setUpcoming([]);
        }
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
          {upcoming.map((ev) => {
            const kindInfo = getEventKindInfo(ev.kind);
            return (
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
                <div
                  className={`event-kind-badge badge ${kindInfo.color}`}
                  title={kindInfo.label}
                >
                  {kindInfo.icon}
                </div>
                <div className="upcoming-info">
                  <span className="upcoming-name">{ev.volunteerName}</span>
                  <span className="upcoming-label">{ev.label}</span>
                </div>
                <div className="upcoming-date">
                  {format(parseISO(ev.date), "dd. MMM", { locale: de })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
