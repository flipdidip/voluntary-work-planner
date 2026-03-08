import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Volunteer } from "@shared/types";
import { v4 as uuidv4 } from "uuid";
import BirthdayInput from "../components/BirthdayInput";
import RolesInput from "../components/RolesInput";
import "./VolunteerNew.css";

const EMPTY_VOLUNTEER: Omit<
  Volunteer,
  "id" | "_version" | "_createdAt" | "_updatedAt"
> = {
  firstName: "",
  lastName: "",
  dateOfBirth: undefined,
  gender: undefined,
  phone: undefined,
  mobile: undefined,
  email: undefined,
  address: undefined,
  emergencyContact: undefined,
  status: "active",
  joinedDate: new Date().toISOString().split("T")[0],
  roles: [],
  notes: "",
  reminders: [],
};

export default function VolunteerNew(): JSX.Element {
  const navigate = useNavigate();
  const [dateOfBirth, setDateOfBirth] = useState<string | undefined>(undefined);
  const [roles, setRoles] = useState<string[]>([]);

  const handleCreate = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const volunteer: Volunteer = {
      ...EMPTY_VOLUNTEER,
      id: uuidv4(),
      _version: 0,
      _createdAt: new Date().toISOString(),
      _updatedAt: new Date().toISOString(),
      firstName: fd.get("firstName") as string,
      lastName: fd.get("lastName") as string,
      dateOfBirth: dateOfBirth,
      phone: (fd.get("phone") as string) || undefined,
      email: (fd.get("email") as string) || undefined,
      status: (fd.get("status") as Volunteer["status"]) ?? "active",
      joinedDate: (fd.get("joinedDate") as string) || undefined,
      roles: roles,
    };

    const result = await window.api.saveVolunteer(volunteer);
    if (result.success) {
      navigate(`/volunteers/${result.volunteer.id}`);
    } else {
      alert(result.message);
    }
  };

  return (
    <div className="volunteer-new">
      <div className="page-header">
        <button
          className="btn btn-ghost"
          onClick={() => navigate("/volunteers")}
        >
          <ArrowLeft size={16} /> Zurück
        </button>
        <h1>Neue Ehrenamtliche Person</h1>
      </div>

      <form className="new-form card" onSubmit={handleCreate}>
        <div className="form-header-row">
          <h3>Basisdaten</h3>
          <label className="status-select-label">
            Status
            <select className="select" name="status" defaultValue="active">
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>
            Vorname *
            <input className="input" name="firstName" required />
          </label>
          <label>
            Nachname *
            <input className="input" name="lastName" required />
          </label>
        </div>
        <label>
          Geburtsdatum
          <BirthdayInput
            value={dateOfBirth}
            onChange={setDateOfBirth}
            name="dateOfBirth"
          />
        </label>
        <div className="form-row">
          <label>
            Telefon
            <input className="input" name="phone" type="tel" />
          </label>
          <label>
            E-Mail
            <input className="input" name="email" type="email" />
          </label>
        </div>
        <label>
          Aufgaben
          <RolesInput value={roles} onChange={setRoles} />
        </label>
        <label>
          Beitritt
          <input
            className="input"
            name="joinedDate"
            type="date"
            defaultValue={new Date().toISOString().split("T")[0]}
          />
        </label>
        <div className="new-form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/volunteers")}
          >
            Abbrechen
          </button>
          <button type="submit" className="btn btn-primary">
            Anlegen
          </button>
        </div>
      </form>
    </div>
  );
}
