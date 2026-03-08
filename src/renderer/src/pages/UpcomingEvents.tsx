import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "lucide-react";
import { Reminder, Volunteer, calculateActivityTime } from "@shared/types";
import {
  addYears,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfDay,
} from "date-fns";
import { de } from "date-fns/locale";
import { useVolunteerIndex } from "../hooks/useVolunteers";
import "./UpcomingEvents.css";

interface EventItem {
  volunteerId: string;
  volunteerName: string;
  eventType: "birthday" | "reminder";
  label: string;
  date: string;
  daysUntil: number;
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

function getReminderNextDate(
  reminder: Reminder,
  volunteer: Volunteer,
  today: Date,
): Date | null {
  if (reminder.dismissed) return null;

  if (reminder.type === "custom") {
    if (!reminder.triggerDate) return null;
    const triggerDate = parseISO(reminder.triggerDate);
    return differenceInCalendarDays(triggerDate, today) >= 0
      ? triggerDate
      : null;
  }

  if (!volunteer.dateOfBirth) return null;

  if (reminder.type === "birthday-every-year") {
    return getNextBirthdayDate(volunteer.dateOfBirth, today);
  }

  if (reminder.type === "birthday-round") {
    const dob = parseISO(volunteer.dateOfBirth);
    const roundYears = [
      ...(reminder.roundBirthdayYears ?? [50, 60, 70, 75, 80, 85, 90, 95, 100]),
    ].sort((a, b) => a - b);

    for (const years of roundYears) {
      const roundDate = new Date(
        dob.getFullYear() + years,
        dob.getMonth(),
        dob.getDate(),
      );
      if (differenceInCalendarDays(roundDate, today) >= 0) {
        return roundDate;
      }
    }
  }

  return null;
}

export default function UpcomingEvents(): JSX.Element {
  const navigate = useNavigate();
  const { index, loading } = useVolunteerIndex();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    if (!index) {
      setEventsLoading(false);
      return;
    }

    let cancelled = false;

    const loadEvents = async (): Promise<void> => {
      setEventsLoading(true);
      const today = startOfDay(new Date());
      const result: EventItem[] = [];

      // Get global settings to check birthday reminder preferences
      const settings = await window.api.getSettings();

      const activeVolunteers = index.volunteers.filter(
        (v) => v.status !== "archived",
      );

      // Show birthdays based on global settings
      if (
        settings.enableYearlyBirthdayReminders ||
        settings.enableRoundBirthdayReminders
      ) {
        for (const v of activeVolunteers) {
          if (!v.dateOfBirth) continue;
          const nextBirthday = getNextBirthdayDate(v.dateOfBirth, today);
          const daysUntil = differenceInCalendarDays(nextBirthday, today);
          const age =
            nextBirthday.getFullYear() - parseISO(v.dateOfBirth).getFullYear();

          // Check if this is a round birthday
          const isRound =
            settings.enableRoundBirthdayReminders &&
            settings.roundBirthdayYears?.includes(age);

          // Show birthday if yearly reminders are enabled, or if it's a round birthday and round reminders are enabled
          if (
            settings.enableYearlyBirthdayReminders ||
            (isRound && settings.enableRoundBirthdayReminders)
          ) {
            result.push({
              volunteerId: v.id,
              volunteerName: `${v.firstName} ${v.lastName}`,
              eventType: "birthday",
              label: isRound
                ? `${age}. Geburtstag (Runder Geburtstag!)`
                : `${age}. Geburtstag`,
              date: format(nextBirthday, "yyyy-MM-dd"),
              daysUntil,
            });
          }
        }
      }

      // Show anniversaries based on joined date
      if (settings.enableJoinedDateAnniversaryReminders) {
        for (const v of activeVolunteers) {
          if (!v.joinedDate) continue;
          const joinedDate = parseISO(v.joinedDate);
          let nextAnniversary = new Date(
            today.getFullYear(),
            joinedDate.getMonth(),
            joinedDate.getDate(),
          );
          if (differenceInCalendarDays(nextAnniversary, today) < 0) {
            nextAnniversary.setFullYear(nextAnniversary.getFullYear() + 1);
          }
          const yearsOfService =
            nextAnniversary.getFullYear() - joinedDate.getFullYear();
          const joinedDateAnniversaryYears =
            settings.joinedDateAnniversaryYears || [
              5, 10, 15, 20, 25, 30, 35, 40, 45, 50,
            ];

          if (
            yearsOfService > 0 &&
            joinedDateAnniversaryYears.includes(yearsOfService)
          ) {
            const daysUntil = differenceInCalendarDays(nextAnniversary, today);
            result.push({
              volunteerId: v.id,
              volunteerName: `${v.firstName} ${v.lastName}`,
              eventType: "reminder",
              label: `${yearsOfService}-jähriges Jubiläum (Eintrittsdatum)`,
              date: format(nextAnniversary, "yyyy-MM-dd"),
              daysUntil,
            });
          }
        }
      }

      // Load full volunteer data to access statusLog for activity time calculations
      const fullVolunteers = (
        await Promise.all(
          activeVolunteers.map((v) => window.api.getVolunteer(v.id)),
        )
      ).filter((v): v is Volunteer => Boolean(v));

      // Show anniversaries based on activity time
      if (settings.enableActivityTimeAnniversaryReminders) {
        for (const v of fullVolunteers) {
          if (v.status !== "active" || !v.statusLog || v.statusLog.length === 0)
            continue;
          const activityTimeMs = calculateActivityTime(v);
          if (activityTimeMs > 0) {
            const activityTimeAnniversaryYears =
              settings.activityTimeAnniversaryYears || [
                5, 10, 15, 20, 25, 30, 35, 40, 45, 50,
              ];

            // For each milestone, check if we're approaching it
            for (const milestoneYears of activityTimeAnniversaryYears) {
              const milestoneMs = milestoneYears * 365 * 24 * 60 * 60 * 1000;

              // Only show if milestone not yet reached
              if (activityTimeMs < milestoneMs) {
                const remainingMs = milestoneMs - activityTimeMs;
                const remainingDays = Math.ceil(
                  remainingMs / (1000 * 60 * 60 * 24),
                );

                const anniversaryDate = new Date(today.getTime() + remainingMs);
                result.push({
                  volunteerId: v.id,
                  volunteerName: `${v.firstName} ${v.lastName}`,
                  eventType: "reminder",
                  label: `${milestoneYears}-jähriges Jubiläum (Aktivitätszeit)`,
                  date: format(anniversaryDate, "yyyy-MM-dd"),
                  daysUntil: remainingDays,
                });
                // Only check the next upcoming milestone
                break;
              }
            }
          }
        }
      }

      // Backwards compatibility: Show legacy anniversaries only if new settings don't exist
      if (
        settings.enableAnniversaryReminders &&
        settings.enableJoinedDateAnniversaryReminders === undefined &&
        settings.enableActivityTimeAnniversaryReminders === undefined
      ) {
        for (const v of activeVolunteers) {
          if (!v.joinedDate) continue;
          const joinedDate = parseISO(v.joinedDate);
          let nextAnniversary = new Date(
            today.getFullYear(),
            joinedDate.getMonth(),
            joinedDate.getDate(),
          );
          if (differenceInCalendarDays(nextAnniversary, today) < 0) {
            nextAnniversary.setFullYear(nextAnniversary.getFullYear() + 1);
          }
          const yearsOfService =
            nextAnniversary.getFullYear() - joinedDate.getFullYear();
          const anniversaryYears = settings.anniversaryYears || [
            5, 10, 15, 20, 25, 30, 35, 40, 45, 50,
          ];

          if (yearsOfService > 0 && anniversaryYears.includes(yearsOfService)) {
            const daysUntil = differenceInCalendarDays(nextAnniversary, today);
            result.push({
              volunteerId: v.id,
              volunteerName: `${v.firstName} ${v.lastName}`,
              eventType: "reminder",
              label: `${yearsOfService}-jähriges Jubiläum`,
              date: format(nextAnniversary, "yyyy-MM-dd"),
              daysUntil,
            });
          }
        }
      }

      // Only show custom reminders now
      for (const volunteer of fullVolunteers) {
        for (const reminder of volunteer.reminders) {
          if (reminder.type !== "custom") continue; // Skip birthday reminders
          const nextDate = getReminderNextDate(reminder, volunteer, today);
          if (!nextDate) continue;
          result.push({
            volunteerId: volunteer.id,
            volunteerName: `${volunteer.firstName} ${volunteer.lastName}`,
            eventType: "reminder",
            label: reminder.title,
            date: format(nextDate, "yyyy-MM-dd"),
            daysUntil: differenceInCalendarDays(nextDate, today),
          });
        }
      }

      result.sort((a, b) => {
        if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
        return a.volunteerName.localeCompare(b.volunteerName, "de");
      });

      if (!cancelled) {
        setEvents(result);
        setEventsLoading(false);
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
        {events.map((event) => (
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
        ))}
      </div>
    </div>
  );
}
