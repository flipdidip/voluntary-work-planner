import {
  addYears,
  differenceInCalendarDays,
  differenceInYears,
  format,
  parseISO,
  startOfDay,
} from "date-fns";
import {
  Reminder,
  Volunteer,
  VolunteerIndex,
  AppSettings,
  calculateActivityTime,
  calculateRequirementExpiryDate,
  REQUIREMENT_DEFINITIONS,
} from "./types";

export interface UpcomingEvent {
  volunteerId: string;
  volunteerName: string;
  eventType: "birthday" | "reminder";
  /**
   * Specific kind of event for visual categorization:
   * - birthday: Regular yearly birthday
   * - birthday-round: Round birthday milestone
   * - anniversary-joined: Joined date anniversary
   * - anniversary-activity: Activity time anniversary
   * - requirement-renewal: Requirement/qualification renewal
   * - custom: Custom reminder
   */
  kind:
    | "birthday"
    | "birthday-round"
    | "anniversary-joined"
    | "anniversary-activity"
    | "requirement-renewal"
    | "custom";
  label: string;
  daysUntil: number;
  date: string;
}

/**
 * Calculate the next birthday date for a volunteer
 */
export function getNextBirthdayDate(dateOfBirth: string, today: Date): Date {
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

/**
 * Get the next date for a reminder (for reminders stored per volunteer)
 */
export function getReminderNextDate(
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

export interface EventCalculationOptions {
  /**
   * Limit results to events within N days from today.
   * If undefined, returns all upcoming events (no limit)
   */
  daysLimit?: number;
  /**
   * Include only today's events (overrides daysLimit)
   */
  todayOnly?: boolean;
  /**
   * Whether this is being called from the main process (for logging purposes)
   */
  isBackgroundCheck?: boolean;
}

/**
 * Calculate all upcoming events for a volunteer index
 * This is the unified event calculation used across Dashboard, UpcomingEvents, and Reminders
 */
export async function calculateUpcomingEvents(
  index: VolunteerIndex,
  settings: AppSettings,
  getVolunteerFull?: (id: string) => Promise<Volunteer | null>,
  options: EventCalculationOptions = {},
): Promise<UpcomingEvent[]> {
  const today = startOfDay(new Date());
  const events: UpcomingEvent[] = [];
  const { daysLimit, todayOnly } = options;

  // Helper to check if event is within range
  const isEventInRange = (daysUntil: number): boolean => {
    if (todayOnly) {
      return daysUntil === 0;
    }
    if (daysLimit !== undefined) {
      return daysUntil >= 0 && daysUntil <= daysLimit;
    }
    return daysUntil >= 0;
  };

  // Determine which volunteers to process (exclude archived)
  const activeVolunteers = index.volunteers.filter(
    (v) => v.status !== "archived",
  );

  // ======== BIRTHDAY EVENTS ========
  if (
    settings.enableYearlyBirthdayReminders ||
    settings.enableRoundBirthdayReminders
  ) {
    for (const v of activeVolunteers) {
      if (!v.dateOfBirth) continue;

      const nextBirthday = getNextBirthdayDate(v.dateOfBirth, today);
      const daysUntil = differenceInCalendarDays(nextBirthday, today);

      if (isEventInRange(daysUntil)) {
        const age =
          nextBirthday.getFullYear() - parseISO(v.dateOfBirth).getFullYear();

        // Check if this is a round birthday
        const isRound =
          settings.enableRoundBirthdayReminders &&
          settings.roundBirthdayYears.includes(age);

        // Show birthday if yearly reminders are enabled, or if it's a round birthday and round reminders are enabled
        if (
          settings.enableYearlyBirthdayReminders ||
          (isRound && settings.enableRoundBirthdayReminders)
        ) {
          events.push({
            volunteerId: v.id,
            volunteerName: `${v.firstName} ${v.lastName}`,
            eventType: "birthday",
            kind: isRound ? "birthday-round" : "birthday",
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

  // ======== JOINED DATE ANNIVERSARY EVENTS ========
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
      const daysUntil = differenceInCalendarDays(nextAnniversary, today);

      if (isEventInRange(daysUntil)) {
        const yearsOfService =
          nextAnniversary.getFullYear() - joinedDate.getFullYear();
        const joinedDateAnniversaryYears =
          settings.joinedDateAnniversaryYears;

        if (
          yearsOfService > 0 &&
          joinedDateAnniversaryYears.includes(yearsOfService)
        ) {
          events.push({
            volunteerId: v.id,
            volunteerName: `${v.firstName} ${v.lastName}`,
            eventType: "reminder",
            kind: "anniversary-joined",
            label: `${yearsOfService}-jähriges Jubiläum (Eintrittsdatum)`,
            daysUntil,
            date: format(nextAnniversary, "yyyy-MM-dd"),
          });
        }
      }
    }
  }

  // ======== ACTIVITY TIME ANNIVERSARY EVENTS ========
  if (settings.enableActivityTimeAnniversaryReminders && getVolunteerFull) {
    for (const indexEntry of activeVolunteers) {
      try {
        const v = await getVolunteerFull(indexEntry.id);
        if (
          !v ||
          v.status !== "active" ||
          !v.statusLog ||
          v.statusLog.length === 0
        )
          continue;

        const activityTimeMs = calculateActivityTime(v);
        if (activityTimeMs > 0) {
          const activityTimeAnniversaryYears =
            settings.activityTimeAnniversaryYears;

          // For each milestone, check if we're approaching it
          for (const milestoneYears of activityTimeAnniversaryYears) {
            const milestoneMs = milestoneYears * 365 * 24 * 60 * 60 * 1000;

            // Only show if milestone not yet reached
            if (activityTimeMs < milestoneMs) {
              const remainingMs = milestoneMs - activityTimeMs;
              const remainingDays = Math.ceil(
                remainingMs / (1000 * 60 * 60 * 24),
              );

              if (isEventInRange(remainingDays)) {
                const anniversaryDate = new Date(today.getTime() + remainingMs);
                events.push({
                  volunteerId: v.id,
                  volunteerName: `${v.firstName} ${v.lastName}`,
                  eventType: "reminder",
                  kind: "anniversary-activity",
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

  // ======== REQUIREMENT RENEWAL EVENTS ========
  if (settings.enableRequirementRenewalReminders && getVolunteerFull) {
    const warningDays = settings.requirementRenewalDaysWarning ?? 30;
    const activeVolunteerIds = activeVolunteers.map((v) => v.id);

    for (const id of activeVolunteerIds) {
      try {
        const fullVolunteer = await getVolunteerFull(id);
        if (!fullVolunteer || !fullVolunteer.requirements) continue;

        for (const requirement of fullVolunteer.requirements) {
          // Only check renewable requirements with completion dates
          const expiryDate = calculateRequirementExpiryDate(
            requirement,
            requirement.requirementType,
          );
          if (!expiryDate) continue;

          const daysUntilExpiry = differenceInCalendarDays(expiryDate, today);

          // Show if expiring within warning period and not yet expired
          if (daysUntilExpiry >= 0 && daysUntilExpiry <= warningDays) {
            const requirementLabel =
              REQUIREMENT_DEFINITIONS[requirement.requirementType]?.label ||
              requirement.requirementType;

            events.push({
              volunteerId: fullVolunteer.id,
              volunteerName: `${fullVolunteer.firstName} ${fullVolunteer.lastName}`,
              eventType: "reminder",
              kind: "requirement-renewal",
              label: `${requirementLabel} - Erneuerung fällig`,
              daysUntil: daysUntilExpiry,
              date: format(expiryDate, "yyyy-MM-dd"),
            });
          }
        }
      } catch {
        // Skip if volunteer cannot be loaded
        continue;
      }
    }
  }

  // ======== CUSTOM REMINDERS (for full volunteer objects) ========
  if (getVolunteerFull) {
    const activeVolunteerIds = activeVolunteers.map((v) => v.id);
    for (const id of activeVolunteerIds) {
      try {
        const fullVolunteer = await getVolunteerFull(id);
        if (!fullVolunteer || !fullVolunteer.reminders) continue;

        for (const reminder of fullVolunteer.reminders) {
          // Skip birthday-based reminders to avoid duplicates
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

            if (isEventInRange(daysUntil)) {
              events.push({
                volunteerId: fullVolunteer.id,
                volunteerName: `${fullVolunteer.firstName} ${fullVolunteer.lastName}`,
                eventType: "reminder",
                kind: "custom",
                label: reminder.title,
                daysUntil,
                date: format(reminderDate, "yyyy-MM-dd"),
              });
            }
          }
        }
      } catch {
        // Skip if volunteer cannot be loaded
        continue;
      }
    }
  }

  // Sort by days until event
  events.sort((a, b) => a.daysUntil - b.daysUntil);
  return events;
}

/**
 * Check if a specific reminder is due today
 * Used by the background reminder scheduler
 */
export function isReminderDueToday(
  reminder: Reminder,
  volunteer: Volunteer,
  today: Date,
): boolean {
  if (reminder.dismissed) return false;

  if (reminder.type === "custom") {
    if (!reminder.triggerDate) return false;
    const triggerDate = parseISO(reminder.triggerDate);
    return differenceInCalendarDays(triggerDate, today) === 0;
  }

  return false;
}

/**
 * Check if a birthday is today
 */
export function isBirthdayToday(dateOfBirth: string, today: Date): boolean {
  const dob = parseISO(dateOfBirth);
  return (
    dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth()
  );
}

/**
 * Get age based on date of birth for a given date
 */
export function getAgeAtDate(dateOfBirth: string, atDate: Date): number {
  const dob = parseISO(dateOfBirth);
  return differenceInYears(atDate, dob);
}

/**
 * Check if a joined date anniversary is today
 */
export function isJoinedDateAnniversaryToday(
  joinedDate: string,
  today: Date,
): boolean {
  const jd = parseISO(joinedDate);
  return jd.getDate() === today.getDate() && jd.getMonth() === today.getMonth();
}

/**
 * Get years of service based on joined date for a given date
 */
export function getYearsOfService(joinedDate: string, atDate: Date): number {
  const jd = parseISO(joinedDate);
  return differenceInYears(atDate, jd);
}
