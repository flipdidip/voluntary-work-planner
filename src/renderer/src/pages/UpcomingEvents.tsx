import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "lucide-react";
import { Reminder, Volunteer } from "@shared/types";
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
      if (settings.enableYearlyBirthdayReminders) {
        for (const v of activeVolunteers) {
          if (!v.dateOfBirth) continue;
          const nextBirthday = getNextBirthdayDate(v.dateOfBirth, today);
          const daysUntil = differenceInCalendarDays(nextBirthday, today);
          const age =
            nextBirthday.getFullYear() - parseISO(v.dateOfBirth).getFullYear();

          // If round birthdays are also enabled, check if this is a round birthday
          const isRound =
            settings.enableRoundBirthdayReminders &&
            settings.roundBirthdayYears?.includes(age);

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
      } else if (settings.enableRoundBirthdayReminders) {
        // Only show round birthdays
        for (const v of activeVolunteers) {
          if (!v.dateOfBirth) continue;
          const nextBirthday = getNextBirthdayDate(v.dateOfBirth, today);
          const age =
            nextBirthday.getFullYear() - parseISO(v.dateOfBirth).getFullYear();

          if (settings.roundBirthdayYears?.includes(age)) {
            const daysUntil = differenceInCalendarDays(nextBirthday, today);
            result.push({
              volunteerId: v.id,
              volunteerName: `${v.firstName} ${v.lastName}`,
              eventType: "birthday",
              label: `${age}. Geburtstag (Runder Geburtstag!)`,
              date: format(nextBirthday, "yyyy-MM-dd"),
              daysUntil,
            });
          }
        }
      }

      const fullVolunteers = (
        await Promise.all(
          activeVolunteers.map((v) => window.api.getVolunteer(v.id)),
        )
      ).filter((v): v is Volunteer => Boolean(v));

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
