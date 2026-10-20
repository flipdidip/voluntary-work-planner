import { type FormEvent, useState } from "react";
import { Pencil, Trash2, Users, UserPlus, X } from "lucide-react";
import { Hauptamtliche as HauptamtlichePerson } from "@shared/types";
import Snackbar from "../components/Snackbar";
import { useHauptamtliche } from "../hooks/useHauptamtliche";
import "./Hauptamtliche.css";

export default function Hauptamtliche(): JSX.Element {
  const { index, loading, error, refresh } = useHauptamtliche();
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [editingPerson, setEditingPerson] =
    useState<HauptamtlichePerson | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [personToDelete, setPersonToDelete] =
    useState<HauptamtlichePerson | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !lastName.trim()) return;

    setSaving(true);
    setActionError(null);
    setSuccessMessage(null);
    try {
      const isCreating = !editingPerson;
      const result = await window.api.saveHauptamtliche(
        name,
        lastName,
        editingPerson?.id,
      );
      if (!result.success) {
        setActionError(result.error || "Der Eintrag konnte nicht gespeichert werden.");
        return;
      }
      setName("");
      setLastName("");
      setEditingPerson(null);
      await refresh();
      if (isCreating) {
        setSuccessMessage("Hauptamtliche Person erfolgreich hinzugefügt.");
      }
    } catch (e) {
      setActionError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (person: HauptamtlichePerson) => {
    setEditingPerson(person);
    setName(person.firstName);
    setLastName(person.lastName);
    setActionError(null);
  };

  const cancelEditing = () => {
    setEditingPerson(null);
    setName("");
    setLastName("");
    setActionError(null);
  };

  const handleDelete = async () => {
    if (!personToDelete) return;
    setActionError(null);
    try {
      const result = await window.api.deleteHauptamtliche(personToDelete.id);
      if (!result.success) {
        setActionError(result.error || "Der Eintrag konnte nicht gelöscht werden.");
        return;
      }
      if (editingPerson?.id === personToDelete.id) {
        cancelEditing();
      }
      setSuccessMessage("Hauptamtliche Person erfolgreich gelöscht.");
      setPersonToDelete(null);
      await refresh();
    } catch (e) {
      setActionError(String(e));
    }
  };

  return (
    <div className="hauptamtliche-page">
      <div className="page-header">
        <div>
          <h1>Hauptamtliche</h1>
          <p className="text-muted">
            Namen verwalten, die bei Gruppentreffen als Teilnehmende ausgewählt
            werden können.
          </p>
        </div>
      </div>

      <section className="card hauptamtliche-form-card">
        <h2>
          {editingPerson ? <Pencil size={18} /> : <UserPlus size={18} />}
          {editingPerson
            ? "Hauptamtliche Person bearbeiten"
            : "Neue hauptamtliche Person"}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="hauptamtliche-form-row">
            <input
              id="hauptamtliche-vorname"
              type="text"
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={200}
              required
              autoComplete="given-name"
              aria-label="Vorname"
              placeholder="Vorname"
            />
            <input
              id="hauptamtliche-nachname"
              type="text"
              className="input"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              maxLength={200}
              required
              autoComplete="family-name"
              aria-label="Nachname"
              placeholder="Nachname"
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || !name.trim() || !lastName.trim()}
            >
              {saving
                ? "Wird gespeichert..."
                : editingPerson
                  ? "Änderungen speichern"
                  : "Hinzufügen"}
            </button>
            {editingPerson && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={cancelEditing}
              >
                <X size={16} /> Abbrechen
              </button>
            )}
          </div>
        </form>
      </section>

      {actionError && (
        <div className="hauptamtliche-error" role="alert">
          {actionError}
        </div>
      )}
      {error && (
        <div className="hauptamtliche-error" role="alert">
          {error}
        </div>
      )}

      <section className="card hauptamtliche-list-card">
        <h2>
          <Users size={18} /> Hauptamtliche ({index?.people.length ?? 0})
        </h2>
        {loading ? (
          <p className="text-muted">Wird geladen...</p>
        ) : index?.people.length ? (
          <ul className="hauptamtliche-list">
            {index.people.map((person) => (
              <li key={person.id}>
                <span>{person.firstName} {person.lastName}</span>
                <div className="hauptamtliche-row-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    aria-label={`${person.firstName} ${person.lastName} bearbeiten`}
                    title="Bearbeiten"
                    onClick={() => startEditing(person)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost hauptamtliche-delete"
                    aria-label={`${person.firstName} ${person.lastName} löschen`}
                    title="Löschen"
                    onClick={() => setPersonToDelete(person)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">
            Noch keine hauptamtlichen Personen eingetragen.
          </p>
        )}
      </section>
      {personToDelete && (
        <div
          className="hauptamtliche-dialog-overlay"
          role="presentation"
          onClick={() => setPersonToDelete(null)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setPersonToDelete(null);
          }}
        >
          <div
            className="hauptamtliche-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hauptamtliche-delete-title"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <div className="hauptamtliche-dialog-header">
              <h2 id="hauptamtliche-delete-title">Hauptamtliche löschen?</h2>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                aria-label="Dialog schließen"
                onClick={() => setPersonToDelete(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="hauptamtliche-dialog-body">
              <p>
                Soll <strong>{personToDelete.firstName} {personToDelete.lastName}</strong>{" "}
                wirklich gelöscht werden?
              </p>
            </div>
            <div className="hauptamtliche-dialog-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setPersonToDelete(null)}
              >
                Abbrechen
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDelete}
              >
                <Trash2 size={16} /> Löschen
              </button>
            </div>
          </div>
        </div>
      )}
      {successMessage && (
        <Snackbar
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />
      )}
    </div>
  );
}
