import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Cake,
  Gift,
  Bell,
  Clock,
  Award,
  CheckCircle,
} from "lucide-react";
import { Volunteer } from "@shared/types";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { useVolunteerIndex } from "../hooks/useVolunteers";
import {
  calculateUpcomingEvents,
  UpcomingEvent,
} from "@shared/eventCalculationService";
import "./UpcomingEvents.css";

// Helper to get event kind badge info
function getEventKindInfo(kind: UpcomingEvent["kind"]) {
  const info: Record<
    UpcomingEvent["kind"],
    { icon: React.ReactNode; label: string; color: string }
  > = {
    birthday: {
      icon: <Cake size={16} />,
      label: "Geburtstag",
      color: "badge-blue",
    },
    "birthday-round": {
      icon: <Gift size={16} />,
      label: "Runder Geburtstag",
      color: "badge-gold",
    },
    "anniversary-joined": {
      icon: <Bell size={16} />,
      label: "Jubiläum (Eintritt)",
      color: "badge-green",
    },
    "anniversary-activity": {
      icon: <Clock size={16} />,
      label: "Jubiläum (Aktivität)",
      color: "badge-teal",
    },
    "requirement-renewal": {
      icon: <CheckCircle size={16} />,
      label: "Qualifikation",
      color: "badge-orange",
    },
    custom: {
      icon: <Award size={16} />,
      label: "Erinnerung",
      color: "badge-purple",
    },
  };
  return info[kind];
}

export default function UpcomingEvents(): JSX.Element {
  const navigate = useNavigate();
  const { index, loading } = useVolunteerIndex();
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    if (!index) {
      setEventsLoading(false);
      return;
    }

    let cancelled = false;

    const loadEvents = async (): Promise<void> => {
      try {
        setEventsLoading(true);
        const settings = await window.api.getSettings();
        const result = await calculateUpcomingEvents(
          index,
          settings,
          (id) => window.api.getVolunteer(id),
          // No daysLimit - show all upcoming events
        );

        // Sort by days, then by volunteer name
        result.sort((a, b) => {
          if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
          return a.volunteerName.localeCompare(b.volunteerName, "de");
        });

        if (!cancelled) {
          setEvents(result);
          setEventsLoading(false);
        }
      } catch (error) {
        console.error("Failed to load upcoming events:", error);
        if (!cancelled) {
          setEvents([]);
          setEventsLoading(false);
        }
      }
    };

    loadEvents();

    return () => {
      cancelled = true;
    };
  }, [index]);

  return (
    <div className="upcoming-events-page">
      <div className="page-header">
        <h1>Kommende Ereignisse</h1>
        <p className="text-muted">
          Alle kommenden Geburtstage und Erinnerungen
        </p>
      </div>

      {(loading || eventsLoading) && <p className="text-muted">Lade...</p>}

      {!loading && !eventsLoading && events.length === 0 && (
        <p className="text-muted empty-hint">
          Keine kommenden Ereignisse gefunden.
        </p>
      )}

      <div className="events-list">
        {events.map((event) => {
          const kindInfo = getEventKindInfo(event.kind);
          return (
            <div
              key={`${event.volunteerId}-${event.eventType}-${event.label}-${event.date}`}
              className="event-row card"
              onClick={() => navigate(`/volunteers/${event.volunteerId}`)}
            >
              <div
                className={`event-badge ${event.daysUntil === 0 ? "badge-green" : "badge-purple"} badge`}
              >
                {event.daysUntil === 0 ? "Heute!" : `in ${event.daysUntil}d`}
              </div>
              <div
                className={`event-kind-badge badge ${kindInfo.color}`}
                title={kindInfo.label}
              >
                {kindInfo.icon}
              </div>
              <div className="event-main">
                <span className="event-name">{event.volunteerName}</span>
                <span className="event-label">{event.label}</span>
              </div>
              <div className="event-date">
                <Calendar size={14} />
                <span>
                  {format(parseISO(event.date), "dd. MMM yyyy", { locale: de })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
