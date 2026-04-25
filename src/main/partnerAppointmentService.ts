import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { PartnerAppointment, PartnerAppointmentIndex } from "@shared/types";
import { normalizeEventDateTime } from "@shared/dateTime";
import { DataCryptoService } from "./dataCryptoService";

/**
 * Service for persisting partner appointments (Termine).
 * All appointments are stored in a single encrypted JSON file (appointments.json).
 */
export class PartnerAppointmentService {
  constructor(
    private dataPath: string,
    private appointmentsFilePath: string,
    private cryptoService: DataCryptoService,
  ) {}

  readAll(): PartnerAppointmentIndex {
    const emptyIndex: PartnerAppointmentIndex = {
      _version: 1,
      _updatedAt: new Date().toISOString(),
      appointments: [],
    };

    if (!existsSync(this.appointmentsFilePath)) {
      return emptyIndex;
    }

    try {
      const raw = readFileSync(this.appointmentsFilePath);
      const decrypted = this.cryptoService.decryptBytesForDataFolder(
        this.dataPath,
        raw,
      );
      const parsed = JSON.parse(
        decrypted.toString("utf-8"),
      ) as Partial<PartnerAppointmentIndex>;
      const appointments: PartnerAppointment[] = Array.isArray(
        parsed.appointments,
      )
        ? parsed.appointments.map((appointment) => ({
            id: typeof appointment?.id === "string" ? appointment.id : "",
            title:
              typeof appointment?.title === "string" ? appointment.title : "",
            date: normalizeEventDateTime(appointment?.date),
            participants: Array.isArray(appointment?.participants)
              ? appointment.participants.map((participant) => ({
                  id: typeof participant?.id === "string" ? participant.id : "",
                  name:
                    typeof participant?.name === "string"
                      ? participant.name
                      : "",
                  attendance:
                    participant?.attendance === "present" ||
                    participant?.attendance === "absent" ||
                    participant?.attendance === "unknown"
                      ? participant.attendance
                      : "unknown",
                }))
              : [],
            notes:
              typeof appointment?.notes === "string"
                ? appointment.notes
                : undefined,
            _createdAt:
              typeof appointment?._createdAt === "string"
                ? appointment._createdAt
                : new Date().toISOString(),
            _updatedAt:
              typeof appointment?._updatedAt === "string"
                ? appointment._updatedAt
                : new Date().toISOString(),
          }))
        : [];

      return {
        _version: typeof parsed._version === "number" ? parsed._version : 1,
        _updatedAt:
          typeof parsed._updatedAt === "string"
            ? parsed._updatedAt
            : new Date().toISOString(),
        appointments,
      };
    } catch {
      return emptyIndex;
    }
  }

  private writeAll(index: PartnerAppointmentIndex): void {
    index._updatedAt = new Date().toISOString();
    index._version += 1;
    const json = JSON.stringify(index, null, 2);
    const encrypted = this.cryptoService.encryptBytesForDataFolder(
      this.dataPath,
      Buffer.from(json, "utf-8"),
    );
    writeFileSync(this.appointmentsFilePath, encrypted);
  }

  save(appointment: PartnerAppointment): PartnerAppointment {
    const index = this.readAll();
    const existingIdx = index.appointments.findIndex(
      (entry) => entry.id === appointment.id,
    );

    appointment.date = normalizeEventDateTime(appointment.date);
    appointment._updatedAt = new Date().toISOString();
    if (!appointment._createdAt) {
      appointment._createdAt = appointment._updatedAt;
    }

    if (existingIdx >= 0) {
      index.appointments[existingIdx] = appointment;
    } else {
      index.appointments.push(appointment);
    }

    this.writeAll(index);
    return appointment;
  }

  delete(appointmentId: string): boolean {
    const index = this.readAll();
    const before = index.appointments.length;
    index.appointments = index.appointments.filter(
      (entry) => entry.id !== appointmentId,
    );
    if (index.appointments.length < before) {
      this.writeAll(index);
      return true;
    }
    return false;
  }
}
