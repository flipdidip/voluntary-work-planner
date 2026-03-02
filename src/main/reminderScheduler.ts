import {
  differenceInYears,
  isToday,
  parseISO,
  addDays,
  isAfter,
  isBefore,
} from "date-fns";
import { Reminder, Volunteer, VolunteerIndex } from "@shared/types";
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

      for (const entry of index.volunteers) {
        if (entry.status === "archived") continue;

        const volunteer = fileService.readVolunteer(entry.id);
        if (!volunteer) continue;

        for (const reminder of volunteer.reminders) {
          if (reminder.dismissed) continue;

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

    switch (reminder.type) {
      case "birthday-every-year": {
        if (!volunteer.dateOfBirth) return false;
        const dob = parseISO(volunteer.dateOfBirth);
        // Check if birthday is today
        return (
          dob.getDate() === now.getDate() && dob.getMonth() === now.getMonth()
        );
      }

      case "birthday-round": {
        if (!volunteer.dateOfBirth) return false;
        const dob = parseISO(volunteer.dateOfBirth);
        const age = differenceInYears(now, dob);
        const roundYears = reminder.roundBirthdayYears ?? [
          50, 60, 65, 70, 75, 80, 85, 90,
        ];
        if (!roundYears.includes(age)) return false;
        // Check if birthday is today
        return (
          dob.getDate() === now.getDate() && dob.getMonth() === now.getMonth()
        );
      }

      case "custom": {
        if (!reminder.triggerDate) return false;
        const triggerDate = parseISO(reminder.triggerDate);
        // Due if trigger date is today or in the past (but not dismissed)
        return !isAfter(triggerDate, addDays(now, 0)) || isToday(triggerDate);
      }

      default:
        return false;
    }
  }
}

/**
 * Helper: compute all upcoming reminders within the next N days
 * (used by the renderer via IPC for the dashboard)
 */
export function getUpcomingReminders(
  volunteers: Volunteer[],
  daysAhead = 30,
): DueReminder[] {
  const now = new Date();
  const cutoff = addDays(now, daysAhead);
  const results: DueReminder[] = [];

  for (const v of volunteers) {
    for (const reminder of v.reminders) {
      if (reminder.dismissed) continue;

      let triggersSoon = false;

      if (reminder.type === "birthday-every-year" && v.dateOfBirth) {
        const dob = parseISO(v.dateOfBirth);
        // Next birthday this year
        const nextBirthday = new Date(
          now.getFullYear(),
          dob.getMonth(),
          dob.getDate(),
        );
        if (isBefore(nextBirthday, now)) {
          nextBirthday.setFullYear(now.getFullYear() + 1);
        }
        triggersSoon = isBefore(nextBirthday, cutoff);
      } else if (reminder.type === "birthday-round" && v.dateOfBirth) {
        const dob = parseISO(v.dateOfBirth);
        const roundYears = reminder.roundBirthdayYears ?? [
          50, 60, 65, 70, 75, 80, 85, 90,
        ];
        for (const years of roundYears) {
          const roundDate = new Date(
            dob.getFullYear() + years,
            dob.getMonth(),
            dob.getDate(),
          );
          if (!isBefore(roundDate, now) && isBefore(roundDate, cutoff)) {
            triggersSoon = true;
            break;
          }
        }
      } else if (reminder.type === "custom" && reminder.triggerDate) {
        const d = parseISO(reminder.triggerDate);
        triggersSoon = !isBefore(d, now) && isBefore(d, cutoff);
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
