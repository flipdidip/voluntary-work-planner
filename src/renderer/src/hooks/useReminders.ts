import { Reminder } from "@shared/types";

export interface DueReminder {
  volunteerId: string;
  volunteerName: string;
  reminder: Reminder;
}
