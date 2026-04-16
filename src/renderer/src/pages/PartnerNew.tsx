import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Volunteer } from "@shared/types";
import { v4 as uuidv4 } from "uuid";
import RolesInput from "../components/RolesInput";
import { usePartnerIndex } from "../hooks/usePartners";
import "./PartnerNew.css";

const EMPTY_PARTNER: Omit<
  Volunteer,
  "id" | "_version" | "_createdAt" | "_updatedAt"
> = {
  firstName: "",
  lastName: "",
  organization: "",
  contactPerson: "",
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
  const { index } = usePartnerIndex();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [organization, setOrganization] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [roles, setRoles] = useState<string[]>([]);

  const contactSuggestions = useMemo(() => {
    if (!index) {
      return [];
    }

    const contacts = new Set<string>();
    index.volunteers.forEach((entry) => {
      const value = entry.contactPerson?.trim();
      if (value) {
        contacts.add(value);
      }
    });

    return Array.from(contacts).sort((a, b) => a.localeCompare(b, "de"));
  }, [index]);

  const organizationSuggestions = useMemo(() => {
    if (!index) {
      return [];
    }

    const organizations = new Set<string>();
    index.volunteers.forEach((entry) => {
      const value = entry.organization?.trim();
      if (value) {
        organizations.add(value);
      }
    });

    return Array.from(organizations).sort((a, b) => a.localeCompare(b, "de"));
  }, [index]);

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
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      organization: organization.trim() || undefined,
      contactPerson: contactPerson.trim() || undefined,
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
          <h3>Kooperationspartner</h3>
          <label className="status-select-label">
            Status
            <select className="select" name="status" defaultValue="active">
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
            </select>
          </label>
        </div>
        <label>
          Einrichtung / Institution *
          <div className="roles-input">
            {organizationSuggestions.length > 0 && (
              <div className="roles-input-field">
                <select
                  className="select roles-select"
                  defaultValue=""
                  onChange={(e) => setOrganization(e.target.value)}
                >
                  <option value="">Vorhandene Einrichtung auswählen...</option>
                  {organizationSuggestions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="roles-input-field">
              <input
                className="input"
                name="organization"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                required
              />
            </div>
          </div>
        </label>
        <div className="form-row">
          <label>
            Vorname Kooperationspartner *
            <input
              className="input"
              name="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </label>
          <label>
            Nachname Kooperationspartner *
            <input
              className="input"
              name="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </label>
        </div>
        <label>
          Ansprechpartner
          <div className="roles-input">
            {contactSuggestions.length > 0 && (
              <div className="roles-input-field">
                <select
                  className="select roles-select"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                >
                  <option value="">
                    Vorhandene Ansprechperson auswählen...
                  </option>
                  {contactSuggestions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="roles-input-field">
              <input
                className="input"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="z.B. Max Mustermann"
              />
            </div>
          </div>
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
          Kooperationsbereich / Aufgaben
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
