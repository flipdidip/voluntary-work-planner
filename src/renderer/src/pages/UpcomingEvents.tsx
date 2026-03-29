import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Cake,
  Gift,
  Bell,
  Clock,
  Award,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { de } from "date-fns/locale";
import { useVolunteerIndex } from "../hooks/useVolunteers";
import {
  calculateUpcomingEvents,
  UpcomingEvent,
} from "@shared/eventCalculationService";
import "./UpcomingEvents.css";

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

// Helper to get event kind badge info
function getEventKindInfo(kind: UpcomingEvent["kind"]) {
  const info: Record<
    UpcomingEvent["kind"],
    { icon: React.ReactNode; label: string; color: string }
  > = {
    birthday: {
      icon: <Cake size={12} />,
      label: "Geburtstag",
      color: "badge-blue",
    },
    "birthday-round": {
      icon: <Gift size={12} />,
      label: "Runder Geburtstag",
      color: "badge-gold",
    },
    "anniversary-joined": {
      icon: <Bell size={12} />,
      label: "Jubiläum (Eintritt)",
      color: "badge-green",
    },
    "anniversary-activity": {
      icon: <Clock size={12} />,
      label: "Jubiläum (Aktivität)",
      color: "badge-teal",
    },
    "requirement-renewal": {
      icon: <CheckCircle size={12} />,
      label: "Qualifikation",
      color: "badge-orange",
    },
    custom: {
      icon: <Award size={12} />,
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
  const [currentMonth, setCurrentMonth] = useState(() =>
    startOfMonth(new Date()),
  );

  useEffect(() => {
    if (!index) {
      setEventsLoading(false);
      return;
    }

    let cancelled = false;

    const loadEvents = async (): Promise<void> => {
      try {
        setEventsLoading(true);
        const settings = await globalThis.api.getSettings();
        const result = await calculateUpcomingEvents(index, settings, (id) =>
          globalThis.api.getVolunteer(id),
        );

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

  // Build calendar grid days for the current month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  // Group events by date string for quick lookup
  const eventsByDate = useMemo(() => {
    const map = new Map<string, UpcomingEvent[]>();
    for (const ev of events) {
      const key = ev.date; // already "yyyy-MM-dd"
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [events]);

  const today = new Date();

  const goToPreviousMonth = (): void => setCurrentMonth((m) => subMonths(m, 1));
  const goToNextMonth = (): void => setCurrentMonth((m) => addMonths(m, 1));
  const goToToday = (): void => setCurrentMonth(startOfMonth(new Date()));

  return (
    <div className="upcoming-events-page">
      <div className="page-header">
        <h1>Kommende Ereignisse</h1>
        <p className="text-muted">
          Monatsübersicht aller Geburtstage und Erinnerungen
        </p>
      </div>

      {(loading || eventsLoading) && <p className="text-muted">Lade...</p>}

      {!loading && !eventsLoading && (
        <>
          {/* Calendar navigation */}
          <div className="cal-nav">
            <button
              className="cal-nav-btn"
              onClick={goToPreviousMonth}
              title="Vorheriger Monat"
            >
              <ChevronLeft size={20} />
            </button>
            <button className="cal-nav-today" onClick={goToToday}>
              Heute
            </button>
            <h2 className="cal-nav-title">
              {format(currentMonth, "MMMM yyyy", { locale: de })}
            </h2>
            <button
              className="cal-nav-btn"
              onClick={goToNextMonth}
              title="Nächster Monat"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Calendar grid */}
          <div className="cal-grid">
            {/* Weekday header */}
            {WEEKDAY_LABELS.map((d) => (
              <div key={d} className="cal-weekday">
                {d}
              </div>
            ))}

            {/* Day cells */}
            {calendarDays.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayEvents = eventsByDate.get(dateKey) ?? [];
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, today);

              return (
                <div
                  key={dateKey}
                  className={`cal-day${isCurrentMonth ? "" : " cal-day--other"}${isToday ? " cal-day--today" : ""}${dayEvents.length > 0 ? " cal-day--has-events" : ""}`}
                >
                  <span className="cal-day-number">{format(day, "d")}</span>
                  {dayEvents.length > 0 && (
                    <div className="cal-day-events">
                      {dayEvents.map((ev) => {
                        const kindInfo = getEventKindInfo(ev.kind);
                        return (
                          <button
                            key={`${ev.volunteerId}-${ev.kind}-${ev.label}`}
                            className={`cal-event-pill ${kindInfo.color}`}
                            title={`${ev.volunteerName} – ${ev.label}`}
                            onClick={() =>
                              navigate(`/volunteers/${ev.volunteerId}`)
                            }
                          >
                            <span className="cal-event-icon">
                              {kindInfo.icon}
                            </span>
                            <span className="cal-event-text">
                              {ev.volunteerName}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
