import { useState } from "react";
import { Plus, X } from "lucide-react";
import "./RolesInput.css";

interface RolesInputProps {
  value: string[];
  onChange: (roles: string[]) => void;
  placeholder?: string;
}

export default function RolesInput({
  value,
  onChange,
  placeholder = "z.B. Sterbebegleitung",
}: RolesInputProps): JSX.Element {
  const [input, setInput] = useState("");

  const addRole = (): void => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInput("");
    }
  };

  const removeRole = (index: number): void => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "Enter") {
      e.preventDefault();
      addRole();
    }
  };

  return (
    <div className="roles-input">
      <div className="roles-input-field">
        <input
          type="text"
          className="input"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <button
          type="button"
          className="btn btn-primary roles-add-btn"
          onClick={addRole}
          disabled={!input.trim()}
        >
          <Plus size={16} />
          Hinzufügen
        </button>
      </div>

      {value.length > 0 && (
        <div className="roles-list">
          {value.map((role, index) => (
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
