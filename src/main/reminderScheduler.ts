import {
  differenceInYears,
  differenceInCalendarDays,
  isToday,
  parseISO,
  startOfDay,
  subMilliseconds,
} from "date-fns";
import {
  Reminder,
  Volunteer,
  VolunteerIndex,
  calculateActivityTime,
} from "@shared/types";
import { VolunteerFileService } from "./volunteerFileService";
import { SettingsService } from "./settingsService";
import { mkdirSync } from "fs";

export interface DueReminder {
  volunteerId: string;
  volunteerName: string;
  reminder: Reminder;
}

type ReminderCallback = (reminders: DueReminder[]) => void;

export class ReminderScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private callback: ReminderCallback;

  constructor(
    private settings: SettingsService,
    callback: ReminderCallback,
  ) {
    this.callback = callback;
  }

  start(): void {
    const intervalMs =
      (this.settings.get().reminderCheckIntervalMinutes ?? 60) * 60 * 1000;
    this.check(); // check immediately on start
    this.timer = setInterval(() => this.check(), intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  check(): void {
    const dataPath = this.settings.getDataFolderPath();
    if (!dataPath) return;

    try {
      mkdirSync(this.settings.getVolunteersPath(), { recursive: true });
      const fileService = new VolunteerFileService(
        this.settings.getVolunteersPath(),
        this.settings.getIndexPath(),
        this.settings.getBackupsPath(),
      );

      const index: VolunteerIndex = fileService.readIndex();
      const dueReminders: DueReminder[] = [];
      const now = new Date();
      const appSettings = this.settings.get();

      for (const entry of index.volunteers) {
        if (entry.status === "archived") continue;

        const volunteer = fileService.readVolunteer(entry.id);
        if (!volunteer) continue;

        // Check global birthday reminder settings
        if (volunteer.dateOfBirth) {
          const dob = parseISO(volunteer.dateOfBirth);
          const isBirthdayToday =
            dob.getDate() === now.getDate() &&
            dob.getMonth() === now.getMonth();

          // Check yearly birthday reminder
          if (appSettings.enableYearlyBirthdayReminders && isBirthdayToday) {
            const age = differenceInYears(now, dob);
            dueReminders.push({
              volunteerId: volunteer.id,
              volunteerName: `${volunteer.firstName} ${volunteer.lastName}`,
              reminder: {
                id: `birthday-yearly-${volunteer.id}`,
                type: "birthday-every-year",
                title: `Geburtstag: ${volunteer.firstName} ${volunteer.lastName}`,
                message: `${volunteer.firstName} ${volunteer.lastName} wird heute ${age} Jahre alt!`,
                dismissed: false,
              },
            });
          }

          // Check round birthday reminder
          if (appSettings.enableRoundBirthdayReminders && isBirthdayToday) {
            const age = differenceInYears(now, dob);
            const roundYears = appSettings.roundBirthdayYears || [
              50, 60, 70, 80, 90,
            ];
            if (roundYears.includes(age)) {
              dueReminders.push({
                volunteerId: volunteer.id,
                volunteerName: `${volunteer.firstName} ${volunteer.lastName}`,
                reminder: {
                  id: `birthday-round-${volunteer.id}`,
                  type: "birthday-round",
                  title: `Runder Geburtstag: ${volunteer.firstName} ${volunteer.lastName}`,
                  message: `${volunteer.firstName} ${volunteer.lastName} wird heute ${age} Jahre alt - ein runder Geburtstag!`,
                  dismissed: false,
                  roundBirthdayYears: roundYears,
                },
              });
            }
          }
        }

        // Check anniversary reminder based on joined date (Eintrittsdatum)
        if (
          volunteer.joinedDate &&
          appSettings.enableJoinedDateAnniversaryReminders
        ) {
          const joinedDate = parseISO(volunteer.joinedDate);
          const isAnniversaryToday =
            joinedDate.getDate() === now.getDate() &&
            joinedDate.getMonth() === now.getMonth();

          if (isAnniversaryToday) {
            const yearsOfService = differenceInYears(now, joinedDate);
            const joinedDateAnniversaryYears =
              appSettings.joinedDateAnniversaryYears || [
                5, 10, 15, 20, 25, 30, 35, 40, 45, 50,
              ];
            if (
              yearsOfService > 0 &&
              joinedDateAnniversaryYears.includes(yearsOfService)
            ) {
              dueReminders.push({
                volunteerId: volunteer.id,
                volunteerName: `${volunteer.firstName} ${volunteer.lastName}`,
                reminder: {
                  id: `anniversary-joined-${volunteer.id}`,
                  type: "custom",
                  title: `Jubiläum (Eintrittsdatum): ${volunteer.firstName} ${volunteer.lastName}`,
                  message: `${volunteer.firstName} ${volunteer.lastName} ist seit ${yearsOfService} Jahren registriert!`,
                  dismissed: false,
                },
              });
            }
          }
        }

        // Check anniversary reminder based on total activity time
        if (
          appSettings.enableActivityTimeAnniversaryReminders &&
          volunteer.status === "active"
        ) {
          const activityTimeMs = calculateActivityTime(volunteer);
          if (activityTimeMs > 0) {
            const activityTimeAnniversaryYears =
              appSettings.activityTimeAnniversaryYears || [
                5, 10, 15, 20, 25, 30, 35, 40, 45, 50,
              ];

            // Check each milestone to see if we're reaching it today
            for (const milestoneYears of activityTimeAnniversaryYears) {
              const milestoneMs = milestoneYears * 365 * 24 * 60 * 60 * 1000;
              const remainingMs = milestoneMs - activityTimeMs;
              const remainingDays = remainingMs / (1000 * 60 * 60 * 24);

              // Trigger if milestone is reached today (between 0 and 1 day remaining)
              if (remainingDays >= 0 && remainingDays < 1) {
                dueReminders.push({
                  volunteerId: volunteer.id,
                  volunteerName: `${volunteer.firstName} ${volunteer.lastName}`,
                  reminder: {
                    id: `anniversary-activity-${volunteer.id}-${milestoneYears}`,
                    type: "custom",
                    title: `Jubiläum (Aktivitätszeit): ${volunteer.firstName} ${volunteer.lastName}`,
                    message: `${volunteer.firstName} ${volunteer.lastName} hat insgesamt ${milestoneYears} Jahre aktive Zeit erreicht!`,
                    dismissed: false,
                  },
                });
              }
            }
          }
        }

        // Backwards compatibility: check legacy enableAnniversaryReminders only if new settings don't exist
        if (
          volunteer.joinedDate &&
          appSettings.enableAnniversaryReminders &&
          appSettings.enableJoinedDateAnniversaryReminders === undefined &&
          appSettings.enableActivityTimeAnniversaryReminders === undefined
        ) {
          const joinedDate = parseISO(volunteer.joinedDate);
          const isAnniversaryToday =
            joinedDate.getDate() === now.getDate() &&
            joinedDate.getMonth() === now.getMonth();

          if (isAnniversaryToday) {
            const yearsOfService = differenceInYears(now, joinedDate);
            const anniversaryYears = appSettings.anniversaryYears || [
              5, 10, 15, 20, 25, 30, 35, 40, 45, 50,
            ];
            if (
              yearsOfService > 0 &&
              anniversaryYears.includes(yearsOfService)
            ) {
              dueReminders.push({
                volunteerId: volunteer.id,
                volunteerName: `${volunteer.firstName} ${volunteer.lastName}`,
                reminder: {
                  id: `anniversary-${volunteer.id}`,
                  type: "custom",
                  title: `Jubiläum: ${volunteer.firstName} ${volunteer.lastName}`,
                  message: `${volunteer.firstName} ${volunteer.lastName} ist heute seit ${yearsOfService} Jahren aktiv!`,
                  dismissed: false,
                },
              });
            }
          }
        }

        // Check custom reminders for this volunteer
        for (const reminder of volunteer.reminders) {
          if (reminder.dismissed) continue;
          if (reminder.type !== "custom") continue; // Only custom reminders stored per volunteer now

          if (this.isReminderDue(reminder, volunteer, now)) {
            dueReminders.push({
              volunteerId: volunteer.id,
              volunteerName: `${volunteer.firstName} ${volunteer.lastName}`,
              reminder,
            });
          }
        }
      }

      if (dueReminders.length > 0) {
        this.callback(dueReminders);
      }
    } catch {
      // Non-fatal: data folder may not be configured yet
    }
  }

  private isReminderDue(
    reminder: Reminder,
    volunteer: Volunteer,
    now: Date,
  ): boolean {
    // Don't re-trigger within the same calendar day
    if (reminder.lastTriggeredAt) {
      const lastTriggered = parseISO(reminder.lastTriggeredAt);
      if (isToday(lastTriggered)) return false;
    }

    // Only check custom reminders here - birthday reminders are handled globally
    if (reminder.type === "custom") {
      if (!reminder.triggerDate) return false;
      const triggerDate = parseISO(reminder.triggerDate);
      // Due if trigger date is today or in the past (but not dismissed)
      return (
        differenceInCalendarDays(triggerDate, now) <= 0 || isToday(triggerDate)
      );
    }

    return false;
  }
}

/**
 * Helper: compute all upcoming reminders within the next N days
 * (used by the renderer via IPC for the dashboard)
 */
export function getUpcomingReminders(
  volunteers: Volunteer[],
  appSettings: import("@shared/types").AppSettings,
  daysAhead = 30,
): DueReminder[] {
  const today = startOfDay(new Date());
  const results: DueReminder[] = [];

  for (const v of volunteers) {
    if (v.status === "archived") continue;

    // Check global birthday reminders
    if (v.dateOfBirth) {
      const dob = parseISO(v.dateOfBirth);

      // Check yearly birthday
      if (appSettings.enableYearlyBirthdayReminders) {
        let nextBirthday = new Date(
          today.getFullYear(),
          dob.getMonth(),
          dob.getDate(),
        );
        if (differenceInCalendarDays(nextBirthday, today) < 0) {
          nextBirthday.setFullYear(today.getFullYear() + 1);
        }
        const daysUntil = differenceInCalendarDays(nextBirthday, today);
        if (daysUntil >= 0 && daysUntil <= daysAhead) {
          const age = differenceInYears(nextBirthday, dob);
          results.push({
            volunteerId: v.id,
            volunteerName: `${v.firstName} ${v.lastName}`,
            reminder: {
              id: `birthday-yearly-${v.id}`,
              type: "birthday-every-year",
              title: `Geburtstag: ${v.firstName} ${v.lastName}`,
              message: `${v.firstName} ${v.lastName} wird ${age} Jahre alt`,
              dismissed: false,
            },
          });
        }
      }

      // Check round birthdays
      if (appSettings.enableRoundBirthdayReminders) {
        const roundYears = appSettings.roundBirthdayYears || [
          50, 60, 70, 80, 90,
        ];
        for (const years of roundYears) {
          const roundDate = new Date(
            dob.getFullYear() + years,
            dob.getMonth(),
            dob.getDate(),
          );
          const daysUntil = differenceInCalendarDays(roundDate, today);
          if (daysUntil >= 0 && daysUntil <= daysAhead) {
            results.push({
              volunteerId: v.id,
              volunteerName: `${v.firstName} ${v.lastName}`,
              reminder: {
                id: `birthday-round-${v.id}-${years}`,
                type: "birthday-round",
                title: `Runder Geburtstag: ${v.firstName} ${v.lastName}`,
                message: `${v.firstName} ${v.lastName} wird ${years} Jahre alt`,
                dismissed: false,
                roundBirthdayYears: roundYears,
              },
            });
          }
        }
      }
    }

    // Check anniversary reminders based on joined date (Eintrittsdatum)
    if (v.joinedDate && appSettings.enableJoinedDateAnniversaryReminders) {
      const joinedDate = parseISO(v.joinedDate);
      const joinedDateAnniversaryYears =
        appSettings.joinedDateAnniversaryYears || [
          5, 10, 15, 20, 25, 30, 35, 40, 45, 50,
        ];
      for (const years of joinedDateAnniversaryYears) {
        const anniversaryDate = new Date(
          joinedDate.getFullYear() + years,
          joinedDate.getMonth(),
          joinedDate.getDate(),
        );
        const daysUntil = differenceInCalendarDays(anniversaryDate, today);
        if (daysUntil >= 0 && daysUntil <= daysAhead) {
          results.push({
            volunteerId: v.id,
            volunteerName: `${v.firstName} ${v.lastName}`,
            reminder: {
              id: `anniversary-joined-${v.id}-${years}`,
              type: "custom",
              title: `${years}-jähriges Jubiläum (Eintrittsdatum): ${v.firstName} ${v.lastName}`,
              message: `${v.firstName} ${v.lastName} - ${years} Jahre seit Eintritt`,
              dismissed: false,
            },
          });
        }
      }
    }

    // Check anniversary reminders based on activity time
    if (
      appSettings.enableActivityTimeAnniversaryReminders &&
      v.status === "active"
    ) {
      const activityTimeMs = calculateActivityTime(v);
      if (activityTimeMs > 0 && v.statusLog && v.statusLog.length > 0) {
        const activityTimeAnniversaryYears =
          appSettings.activityTimeAnniversaryYears || [
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

            if (remainingDays >= 0 && remainingDays <= daysAhead) {
              const anniversaryDate = new Date(today.getTime() + remainingMs);
              results.push({
                volunteerId: v.id,
                volunteerName: `${v.firstName} ${v.lastName}`,
                reminder: {
                  id: `anniversary-activity-${v.id}-${milestoneYears}`,
                  type: "custom",
                  title: `${milestoneYears}-jähriges Jubiläum (Aktivitätszeit): ${v.firstName} ${v.lastName}`,
                  message: `${v.firstName} ${v.lastName} - ${milestoneYears} Jahre Aktivitätszeit`,
                  dismissed: false,
                },
              });
            }
            // Only check the next upcoming milestone
            break;
          }
        }
      }
    }

    // Backwards compatibility: check legacy anniversaries only if new settings don't exist
    if (
      v.joinedDate &&
      appSettings.enableAnniversaryReminders &&
      appSettings.enableJoinedDateAnniversaryReminders === undefined &&
      appSettings.enableActivityTimeAnniversaryReminders === undefined
    ) {
      const joinedDate = parseISO(v.joinedDate);
      const anniversaryYears = appSettings.anniversaryYears || [
        5, 10, 15, 20, 25, 30, 35, 40, 45, 50,
      ];
      for (const years of anniversaryYears) {
        const anniversaryDate = new Date(
          joinedDate.getFullYear() + years,
          joinedDate.getMonth(),
          joinedDate.getDate(),
        );
        const daysUntil = differenceInCalendarDays(anniversaryDate, today);
        if (daysUntil >= 0 && daysUntil <= daysAhead) {
          results.push({
            volunteerId: v.id,
            volunteerName: `${v.firstName} ${v.lastName}`,
            reminder: {
              id: `anniversary-${v.id}-${years}`,
              type: "custom",
              title: `${years}-jähriges Jubiläum: ${v.firstName} ${v.lastName}`,
              message: `${v.firstName} ${v.lastName} - ${years} Jahre`,
              dismissed: false,
            },
          });
        }
      }
    }

    // Check custom reminders for this volunteer
    for (const reminder of v.reminders) {
      if (reminder.dismissed) continue;
      if (reminder.type !== "custom") continue; // Only custom reminders stored per volunteer now

      let triggersSoon = false;

      if (reminder.triggerDate) {
        const d = parseISO(reminder.triggerDate);
        const daysUntil = differenceInCalendarDays(d, today);
        triggersSoon = daysUntil >= 0 && daysUntil <= daysAhead;
      }

      if (triggersSoon) {
        results.push({
          volunteerId: v.id,
          volunteerName: `${v.firstName} ${v.lastName}`,
          reminder,
        });
      }
    }
  }

  return results;
}
