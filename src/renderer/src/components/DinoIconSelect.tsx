import { DINO_ICON_OPTIONS, DinoIconId } from "@shared/types";
import DinoIconBadge, { getDinoIconOption } from "./DinoIcon";
import "./DinoIcon.css";

interface DinoIconSelectProps {
  value?: DinoIconId;
  onChange: (value: DinoIconId | undefined) => void;
  placeholder?: string;
}

export default function DinoIconSelect({
  value,
  onChange,
  placeholder = "Kein Dino-Icon",
}: DinoIconSelectProps): JSX.Element {
  const selected = getDinoIconOption(value);

  return (
    <div className="dino-select-row">
      <select
        className="select dino-select"
        style={
          selected
            ? { color: selected.color, borderColor: selected.color }
            : undefined
        }
        value={value ?? ""}
        onChange={(e) => onChange((e.target.value as DinoIconId) || undefined)}
      >
        <option value="">{placeholder}</option>
        {DINO_ICON_OPTIONS.map((option) => (
          <option
            key={option.id}
            value={option.id}
            style={{ color: option.color, fontWeight: 600 }}
          >
            {option.label}
          </option>
        ))}
      </select>
      {selected && (
        <span className="dino-select-preview">
          <DinoIconBadge
            iconId={selected.id}
            size="md"
            title={selected.label}
          />
        </span>
      )}
    </div>
  );
}
