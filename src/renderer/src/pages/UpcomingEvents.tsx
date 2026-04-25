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
  Handshake,
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
import { DinoIconId, UserRole } from "@shared/types";
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
    "partner-appointment": {
      icon: <Handshake size={12} />,
      label: "Kooperationspartner-Termin",
      color: "badge-green",
    },
  };
  return info[kind];
}

interface UpcomingEventsProps {
  userRole?: UserRole;
}

type PartnerFilterMode = "off" | "include" | "exclude";

export default function UpcomingEvents({
  userRole = "primary",
}: UpcomingEventsProps): JSX.Element {
  const navigate = useNavigate();
  const { index, loading } = useVolunteerIndex();
  const { index: partnerIndex } = usePartnerIndex();
  const isPartnerOnly = userRole === "partner-only";
  const hasFullAccess = userRole === "primary";
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() =>
    startOfMonth(new Date()),
  );
  const [partnerFilterMode, setPartnerFilterMode] =
    useState<PartnerFilterMode>("off");

  useEffect(() => {
    if (!isPartnerOnly && !index) {
      setEventsLoading(false);
      return;
    }

    let cancelled = false;

    const loadEvents = async (): Promise<void> => {
      try {
        setEventsLoading(true);
        const appointmentsIdx = await window.api.getPartnerAppointments();

        if (isPartnerOnly) {
          const today = new Date();
          const partnerEvents = appointmentsIdx.appointments
            .map((appointment) => {
              const appointmentDate = new Date(appointment.date);
              const daysUntil = Math.floor(
                (appointmentDate.setHours(0, 0, 0, 0) -
                  new Date(today.setHours(0, 0, 0, 0)).getTime()) /
                  (1000 * 60 * 60 * 24),
              );

              return {
                volunteerId: appointment.id,
                volunteerName: appointment.title,
                eventType: "reminder" as const,
                kind: "partner-appointment" as const,
                label: `Kooperationspartner-Termin (${appointment.participants.length} Teilnehmer)`,
                daysUntil,
                date: normalizeEventDateTime(appointment.date),
                appointmentId: appointment.id,
                participants: appointment.participants.map((participant) => ({
                  id: participant.id,
                  type: "partner" as const,
                })),
              };
            })
            .sort((a, b) => a.daysUntil - b.daysUntil);

          if (!cancelled) {
            setEvents(partnerEvents);
            setEventsLoading(false);
          }
          return;
        }

        const settings = await window.api.getSettings();
        const meetingsIdx = await window.api.getGroupMeetings();
        const result = await calculateUpcomingEvents(
          index!,
          settings,
          (id) => window.api.getVolunteer(id),
          { includePastInMonth: currentMonth },
          meetingsIdx,
          appointmentsIdx,
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
  }, [index, isPartnerOnly, currentMonth]);

  // Build calendar grid days for the current month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const filteredEvents = useMemo(() => {
    if (partnerFilterMode === "off") {
      return events;
    }

    return events.filter((event) => {
      const isPartnerEvent = event.kind === "partner-appointment";
      return partnerFilterMode === "include" ? isPartnerEvent : !isPartnerEvent;
    });
  }, [events, partnerFilterMode]);

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
    for (const ev of filteredEvents) {
      const key = getDatePart(ev.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [filteredEvents]);

  const today = new Date();

  const goToPreviousMonth = (): void => setCurrentMonth((m) => subMonths(m, 1));
  const goToNextMonth = (): void => setCurrentMonth((m) => addMonths(m, 1));
  const goToToday = (): void => setCurrentMonth(startOfMonth(new Date()));
  const cyclePartnerFilter = (): void => {
    setPartnerFilterMode((prev) => {
      if (prev === "off") return "include";
      if (prev === "include") return "exclude";
      return "off";
    });
  };

  return (
    <div className="upcoming-events-page">
      <div className="page-header">
        <h1>Kommende Ereignisse</h1>
        <p className="text-muted">
          {isPartnerOnly
            ? "Monatsübersicht der Kooperationspartner-Termine"
            : "Monatsübersicht aller Geburtstage, Erinnerungen und Termine"}
        </p>
      </div>

      {((!isPartnerOnly && loading) || eventsLoading) && (
        <p className="text-muted">Lade...</p>
      )}

      {!((!isPartnerOnly && loading) || eventsLoading) && (
        <>
          {hasFullAccess && (
            <div className="cal-filters">
              <span className="cal-filters-label">Filter:</span>
              <button
                className={`cal-filter-chip ${partnerFilterMode === "include" ? "active" : partnerFilterMode === "exclude" ? "exclude" : ""}`}
                onClick={cyclePartnerFilter}
                type="button"
                title="Aus: alle Ereignisse · Aktiv: nur Kooperationspartner · Ausschließen: nur Nicht-Kooperationspartner"
              >
                <Handshake size={14} />
                Kooperationspartner:{" "}
                {partnerFilterMode === "include"
                  ? "Nur"
                  : partnerFilterMode === "exclude"
                    ? "Ohne"
                    : "Alle"}
              </button>
            </div>
          )}

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
                      title={
                        isPartnerOnly
                          ? "Neuen Termin erstellen"
                          : "Neues Gruppentreffen erstellen"
                      }
                      aria-label={
                        isPartnerOnly
                          ? "Neuen Termin erstellen"
                          : "Neues Gruppentreffen erstellen"
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(
                          isPartnerOnly
                            ? `/appointments/new?date=${dateKey}`
                            : `/meetings/new?date=${dateKey}`,
                        );
                      }}
                    >
                      {isPartnerOnly ? (
                        <Handshake size={14} />
                      ) : (
                        <Users2 size={14} />
                      )}
                    </button>
                  </div>
                  {dayEvents.length > 0 && (
                    <div className="cal-day-events">
                      {dayEvents.map((ev) => {
                        const kindInfo = getEventKindInfo(ev.kind);
                        const dinoIcons =
                          ev.kind === "group-meeting" ||
                          ev.kind === "partner-appointment"
                            ? getEventDinoParticipants(ev)
                            : [];
                        return (
                          <button
                            key={`${ev.volunteerId}-${ev.kind}-${ev.label}`}
                            className={`cal-event-pill ${kindInfo.color}`}
                            title={`${ev.volunteerName} – ${ev.label}`}
                            onClick={() =>
                              ev.appointmentId
                                ? navigate(`/appointments/${ev.appointmentId}`)
                                : ev.meetingId
                                  ? navigate(`/meetings/${ev.meetingId}`)
                                  : navigate(`/volunteers/${ev.volunteerId}`)
                            }
                          >
                            <span className="cal-event-icon">
                              {kindInfo.icon}
                            </span>
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
