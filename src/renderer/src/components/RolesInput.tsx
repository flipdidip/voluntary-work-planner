import { useState } from "react";
import { Plus, X } from "lucide-react";
import "./RolesInput.css";

interface RolesInputProps {
  value: string[];
  onChange: (roles: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}

export default function RolesInput({
  value,
  onChange,
  placeholder = "z.B. Sterbebegleitung",
  suggestions = [],
}: RolesInputProps): JSX.Element {
  const [newRoleInput, setNewRoleInput] = useState("");
  const [selectedSuggestion, setSelectedSuggestion] = useState("");

  const safeValue = Array.isArray(value) ? value : [];
  const normalizedExistingRoles = new Set(
    safeValue
      .filter((role): role is string => typeof role === "string")
      .map((role) => role.trim()),
  );
  const availableSuggestions = suggestions
    .map((role) => role.trim())
    .filter((role) => role.length > 0 && !normalizedExistingRoles.has(role))
    .sort((a, b) => a.localeCompare(b, "de"));

  const addRole = (roleInput: string): void => {
    const trimmed = roleInput.trim();
    if (trimmed && !safeValue.includes(trimmed)) {
      onChange([...safeValue, trimmed]);
    }
  };

  const addNewRole = (): void => {
    addRole(newRoleInput);
    setNewRoleInput("");
  };

  const addExistingRole = (): void => {
    addRole(selectedSuggestion);
    setSelectedSuggestion("");
  };

  const removeRole = (index: number): void => {
    onChange(safeValue.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "Enter") {
      e.preventDefault();
      addNewRole();
    }
  };

  return (
    <div className="roles-input">
      {availableSuggestions.length > 0 && (
        <div className="roles-input-field">
          <select
            className="select roles-select"
            value={selectedSuggestion}
            onChange={(e) => setSelectedSuggestion(e.target.value)}
          >
            <option value="">Vorhandene Aufgabe auswählen...</option>
            {availableSuggestions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-secondary roles-add-btn"
            onClick={addExistingRole}
            disabled={!selectedSuggestion}
          >
            <Plus size={16} />
            Aus Liste
          </button>
        </div>
      )}

      <div className="roles-input-field">
        <input
          type="text"
          className="input"
          placeholder={placeholder}
          value={newRoleInput}
          onChange={(e) => setNewRoleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <button
          type="button"
          className="btn btn-primary roles-add-btn"
          onClick={addNewRole}
          disabled={!newRoleInput.trim()}
        >
          <Plus size={16} />
          Neu hinzufügen
        </button>
      </div>

      {safeValue.length > 0 && (
        <div className="roles-list">
          {safeValue.map((role, index) => (
            <div key={index} className="role-item">
              <span className="role-text">{role}</span>
              <button
                type="button"
                className="role-delete-btn"
                onClick={() => removeRole(index)}
                title="Entfernen"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
