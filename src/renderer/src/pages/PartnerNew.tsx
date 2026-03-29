import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Volunteer } from "@shared/types";
import { v4 as uuidv4 } from "uuid";
import BirthdayInput from "../components/BirthdayInput";
import RolesInput from "../components/RolesInput";
import "./PartnerNew.css";

const EMPTY_PARTNER: Omit<
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
  statusLog: [],
  joinedDate: new Date().toISOString().split("T")[0],
  roles: [],
  notes: "",
  reminders: [],
  fileRecords: [],
  requirements: [], // Partners don't use requirements
};

export default function PartnerNew(): JSX.Element {
  const navigate = useNavigate();
  const [dateOfBirth, setDateOfBirth] = useState<string | undefined>(undefined);
  const [roles, setRoles] = useState<string[]>([]);

  const handleCreate = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const partner: Volunteer = {
      ...EMPTY_PARTNER,
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

    const result = await window.api.savePartner(partner);
    if (result.success) {
      navigate(`/partners/${result.volunteer.id}`);
    } else {
      alert(result.message);
    }
  };

  return (
    <div className="volunteer-new">
      <div className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate("/partners")}>
          <ArrowLeft size={16} /> Zurück
        </button>
        <h1>Neuer Kooperationspartner</h1>
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
            onClick={() => navigate("/partners")}
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
