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
  differenceInYears,
} from "date-fns";
import { de } from "date-fns/locale";
import { DueReminder } from "../hooks/useReminders";
import { calculateActivityTime } from "@shared/types";
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

      // Get global settings first
      const settings = await window.api.getSettings();

      // Show birthdays based on global settings
      if (
        settings.enableYearlyBirthdayReminders ||
        settings.enableRoundBirthdayReminders
      ) {
        for (const v of index.volunteers) {
          if (v.status === "archived" || !v.dateOfBirth) continue;

          const nextBirthday = getNextBirthdayDate(v.dateOfBirth, today);
          const daysUntil = differenceInCalendarDays(nextBirthday, today);

          if (daysUntil >= 0 && daysUntil <= 30) {
            const age =
              nextBirthday.getFullYear() -
              parseISO(v.dateOfBirth).getFullYear();

            // Check if this is a round birthday
            const isRound =
              settings.enableRoundBirthdayReminders &&
              settings.roundBirthdayYears?.includes(age);

            // Show birthday if yearly reminders are enabled, or if it's a round birthday and round reminders are enabled
            if (
              settings.enableYearlyBirthdayReminders ||
              (isRound && settings.enableRoundBirthdayReminders)
            ) {
              events.push({
                volunteerId: v.id,
                volunteerName: `${v.firstName} ${v.lastName}`,
                eventType: "birthday",
                label: isRound
                  ? `${age}. Geburtstag (Runder Geburtstag!)`
                  : `${age}. Geburtstag`,
                daysUntil,
                date: format(nextBirthday, "yyyy-MM-dd"),
              });
            }
          }
        }
      }

      // Check for upcoming anniversaries (based on joined date) in next 30 days
      if (settings.enableJoinedDateAnniversaryReminders) {
        for (const v of index.volunteers) {
          if (v.status === "archived" || !v.joinedDate) continue;

          const joinedDate = parseISO(v.joinedDate);
          let nextAnniversary = new Date(
            today.getFullYear(),
            joinedDate.getMonth(),
            joinedDate.getDate(),
          );
          if (differenceInCalendarDays(nextAnniversary, today) < 0) {
            nextAnniversary.setFullYear(nextAnniversary.getFullYear() + 1);
          }
          const daysUntil = differenceInCalendarDays(nextAnniversary, today);

          if (daysUntil >= 0 && daysUntil <= 30) {
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
              events.push({
                volunteerId: v.id,
                volunteerName: `${v.firstName} ${v.lastName}`,
                eventType: "reminder",
                label: `${yearsOfService}-jähriges Jubiläum (Eintrittsdatum)`,
                daysUntil,
                date: format(nextAnniversary, "yyyy-MM-dd"),
              });
            }
          }
        }
      }

      // Check for upcoming anniversaries (based on activity time) in next 30 days
      if (settings.enableActivityTimeAnniversaryReminders) {
        // Need to load full volunteer data to access statusLog
        const activeVolunteers = index.volunteers.filter(
          (v) => v.status === "active",
        );

        for (const indexEntry of activeVolunteers) {
          try {
            const v = await window.api.getVolunteer(indexEntry.id);
            if (!v || !v.statusLog || v.statusLog.length === 0) continue;

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

                  if (remainingDays >= 0 && remainingDays <= 30) {
                    const anniversaryDate = new Date(
                      today.getTime() + remainingMs,
                    );
                    events.push({
                      volunteerId: v.id,
                      volunteerName: `${v.firstName} ${v.lastName}`,
                      eventType: "reminder",
                      label: `${milestoneYears}-jähriges Jubiläum (Aktivitätszeit)`,
                      daysUntil: remainingDays,
                      date: format(anniversaryDate, "yyyy-MM-dd"),
                    });
                  }
                  // Only check the next upcoming milestone
                  break;
                }
              }
            }
          } catch {
            // Skip if volunteer cannot be loaded
            continue;
          }
        }
      }

      // Backwards compatibility: check legacy anniversaries only if new settings don't exist
      if (
        settings.enableAnniversaryReminders &&
        settings.enableJoinedDateAnniversaryReminders === undefined &&
        settings.enableActivityTimeAnniversaryReminders === undefined
      ) {
        for (const v of index.volunteers) {
          if (v.status === "archived" || !v.joinedDate) continue;

          const joinedDate = parseISO(v.joinedDate);
          let nextAnniversary = new Date(
            today.getFullYear(),
            joinedDate.getMonth(),
            joinedDate.getDate(),
          );
          if (differenceInCalendarDays(nextAnniversary, today) < 0) {
            nextAnniversary.setFullYear(nextAnniversary.getFullYear() + 1);
          }
          const daysUntil = differenceInCalendarDays(nextAnniversary, today);

          if (daysUntil >= 0 && daysUntil <= 30) {
            const yearsOfService =
              nextAnniversary.getFullYear() - joinedDate.getFullYear();
            const anniversaryYears = settings.anniversaryYears || [
              5, 10, 15, 20, 25, 30, 35, 40, 45, 50,
            ];

            if (
              yearsOfService > 0 &&
              anniversaryYears.includes(yearsOfService)
            ) {
              events.push({
                volunteerId: v.id,
                volunteerName: `${v.firstName} ${v.lastName}`,
                eventType: "reminder",
                label: `${yearsOfService}-jähriges Jubiläum`,
                daysUntil,
                date: format(nextAnniversary, "yyyy-MM-dd"),
              });
            }
          }
        }
      }

      try {
        const reminders = (await window.api.getDueReminders()) as DueReminder[];

        for (const due of reminders) {
          const reminder = due.reminder;

          // Skip birthday-based reminders to avoid duplicates (birthdays are already added above)
          if (
            reminder.type === "birthday-every-year" ||
            reminder.type === "birthday-round"
          ) {
            continue;
          }

          // Only process custom reminders
          if (reminder.type === "custom" && reminder.triggerDate) {
            const reminderDate = parseISO(reminder.triggerDate);
            const daysUntil = differenceInCalendarDays(reminderDate, today);

            if (daysUntil >= 0 && daysUntil <= 30) {
              events.push({
                volunteerId: due.volunteerId,
                volunteerName: due.volunteerName,
                eventType: "reminder",
                label: reminder.title,
                daysUntil,
                date: format(reminderDate, "yyyy-MM-dd"),
              });
            }
          }
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
