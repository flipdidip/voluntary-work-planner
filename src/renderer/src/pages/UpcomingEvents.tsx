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
  Users2,
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
import { usePartnerIndex } from "../hooks/usePartners";
import {
  calculateUpcomingEvents,
  UpcomingEvent,
} from "@shared/eventCalculationService";
import { DinoIconId } from "@shared/types";
import { getDatePart, normalizeEventDateTime } from "@shared/dateTime";
import DinoIconBadge from "../components/DinoIcon";
import "../components/DinoIcon.css";
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
    "group-meeting": {
      icon: <Users2 size={12} />,
      label: "Gruppentreffen",
      color: "badge-teal",
    },
  };
  return info[kind];
}

function getEventTimeLabel(event: UpcomingEvent): string | null {
  const isTimedEvent = event.kind === "group-meeting";

  if (!isTimedEvent) {
    return null;
  }

  const match = normalizeEventDateTime(event.date).match(/T(\d{2}:\d{2})/);
  return match ? match[1] : null;
}

function getEventSortMinutes(event: UpcomingEvent): number | null {
  if (event.kind !== "group-meeting") {
    return null;
  }

  const match = event.date.match(/T(\d{2}):(\d{2})/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

export default function UpcomingEvents(): JSX.Element {
  const navigate = useNavigate();
  const { index, loading } = useVolunteerIndex();
  const { index: partnerIndex } = usePartnerIndex();
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
        const settings = await window.api.getSettings();
        const meetingsIdx = await window.api.getGroupMeetings();
        const result = await calculateUpcomingEvents(
          index,
          settings,
          (id) => window.api.getVolunteer(id),
          { includePastInMonth: currentMonth },
          meetingsIdx,
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
  }, [index, currentMonth]);

  // Build calendar grid days for the current month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const dinoIconByParticipantId = useMemo(() => {
    const iconMap = new Map<string, DinoIconId>();

    (index?.volunteers ?? []).forEach((entry) => {
      if (entry.dinoIconId) {
        iconMap.set(entry.id, entry.dinoIconId);
      }
    });

    (partnerIndex?.volunteers ?? []).forEach((entry) => {
      if (entry.dinoIconId) {
        iconMap.set(entry.id, entry.dinoIconId);
      }
    });

    return iconMap;
  }, [index, partnerIndex]);

  const participantNameById = useMemo(() => {
    const nameMap = new Map<string, string>();

    (index?.volunteers ?? []).forEach((entry) => {
      nameMap.set(entry.id, `${entry.firstName} ${entry.lastName}`);
    });

    (partnerIndex?.volunteers ?? []).forEach((entry) => {
      nameMap.set(entry.id, `${entry.firstName} ${entry.lastName}`);
    });

    return nameMap;
  }, [index, partnerIndex]);

  const getEventDinoParticipants = (
    event: UpcomingEvent,
  ): Array<{ participantId: string; iconId: DinoIconId; name: string }> => {
    if (!event.participants || event.participants.length === 0) {
      return [];
    }

    return event.participants
      .map((participant) => {
        const iconId = dinoIconByParticipantId.get(participant.id);
        if (!iconId) {
          return null;
        }

        return {
          participantId: participant.id,
          iconId,
          name: participantNameById.get(participant.id) || "Unbekannte Person",
        };
      })
      .filter(
        (
          participant,
        ): participant is {
          participantId: string;
          iconId: DinoIconId;
          name: string;
        } => !!participant,
      );
  };

  // Group events by date string for quick lookup
  const eventsByDate = useMemo(() => {
    const map = new Map<string, UpcomingEvent[]>();
    for (const ev of events) {
      const key = getDatePart(ev.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }

    // Sort each day by event time (timed events first), keep untimed order stable.
    for (const [key, dayEvents] of map.entries()) {
      const sortedDayEvents = dayEvents
        .map((event, index) => ({
          event,
          index,
          sortMinutes: getEventSortMinutes(event),
        }))
        .sort((a, b) => {
          if (a.sortMinutes !== null && b.sortMinutes !== null) {
            return a.sortMinutes - b.sortMinutes;
          }
          if (a.sortMinutes !== null) {
            return -1;
          }
          if (b.sortMinutes !== null) {
            return 1;
          }
          return a.index - b.index;
        })
        .map((entry) => entry.event);

      map.set(key, sortedDayEvents);
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
          Monatsübersicht aller Geburtstage, Erinnerungen und Gruppentreffen
        </p>
      </div>

      {(loading || eventsLoading) && (
        <p className="text-muted">Lade...</p>
      )}

      {!(loading || eventsLoading) && (
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
                  <div className="cal-day-header">
                    <span className="cal-day-number">{format(day, "d")}</span>
                    <button
                      className="cal-day-add-btn"
                      title="Neues Gruppentreffen erstellen"
                      aria-label="Neues Gruppentreffen erstellen"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/meetings/new?date=${dateKey}`);
                      }}
                    >
                      <Users2 size={14} />
                    </button>
                  </div>
                  {dayEvents.length > 0 && (
                    <div className="cal-day-events">
                      {dayEvents.map((ev) => {
                        const kindInfo = getEventKindInfo(ev.kind);
                        const eventTimeLabel = getEventTimeLabel(ev);
                        const dinoIcons =
                          ev.kind === "group-meeting"
                            ? getEventDinoParticipants(ev)
                            : [];
                        return (
                          <button
                            key={`${ev.volunteerId}-${ev.kind}-${ev.label}`}
                            className={`cal-event-pill ${kindInfo.color}`}
                            title={`${eventTimeLabel ? `${eventTimeLabel} · ` : ""}${ev.volunteerName} – ${ev.label}`}
                            onClick={() =>
                              ev.meetingId
                                ? navigate(`/meetings/${ev.meetingId}`)
                                : navigate(`/volunteers/${ev.volunteerId}`)
                            }
                          >
                            <span className="cal-event-icon">
                              {kindInfo.icon}
                            </span>
                            {eventTimeLabel && (
                              <span className="cal-event-time">
                                {eventTimeLabel}
                              </span>
                            )}
                            <span className="cal-event-text">
                              {ev.volunteerName}
                            </span>
                            {dinoIcons.length > 0 && (
                              <span className="cal-event-dinos">
                                {dinoIcons.slice(0, 3).map((participant) => (
                                  <DinoIconBadge
                                    key={participant.participantId}
                                    iconId={participant.iconId}
                                    size="sm"
                                    title={participant.name}
                                  />
                                ))}
                                {dinoIcons.length > 3 && (
                                  <span className="cal-event-dinos-more">
                                    +{dinoIcons.length - 3}
                                  </span>
                                )}
                              </span>
                            )}
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
