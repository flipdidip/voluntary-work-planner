import { useState, useEffect } from "react";
import "./BirthdayInput.css";

interface BirthdayInputProps {
  value?: string; // ISO date string (YYYY-MM-DD)
  onChange: (value: string) => void;
  name?: string;
  className?: string;
}

export default function BirthdayInput({
  value,
  onChange,
  name,
  className = "",
}: BirthdayInputProps): JSX.Element {
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  // Parse initial value
  useEffect(() => {
    if (value) {
      const parts = value.split("-");
      if (parts.length === 3) {
        setYear(parts[0]);
        setMonth(parts[1]);
        setDay(parts[2]);
      }
    }
  }, [value]);

  // Update parent when any field changes
  useEffect(() => {
    if (day && month && year) {
      const dayNum = parseInt(day, 10);
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);

      if (
        dayNum >= 1 &&
        dayNum <= 31 &&
        monthNum >= 1 &&
        monthNum <= 12 &&
        yearNum >= 1900 &&
        yearNum <= new Date().getFullYear()
      ) {
        const dateStr = `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        onChange(dateStr);
      }
    }
  }, [day, month, year, onChange]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 124 }, (_, i) => currentYear - i); // Last 124 years
  const months = [
    { value: "01", label: "Januar" },
    { value: "02", label: "Februar" },
    { value: "03", label: "März" },
    { value: "04", label: "April" },
    { value: "05", label: "Mai" },
    { value: "06", label: "Juni" },
    { value: "07", label: "Juli" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "Oktober" },
    { value: "11", label: "November" },
    { value: "12", label: "Dezember" },
  ];

  return (
    <div className={`birthday-input ${className}`}>
      <input
        type="number"
        className="input birthday-day"
        placeholder="TT"
        min="1"
        max="31"
        value={day}
        onChange={(e) => setDay(e.target.value)}
      />
      <select
        className="select birthday-month"
        value={month}
        onChange={(e) => setMonth(e.target.value)}
      >
        <option value="">Monat</option>
        {months.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
      <select
        className="select birthday-year"
        value={year}
        onChange={(e) => setYear(e.target.value)}
      >
        <option value="">Jahr</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      {/* Hidden input for form submission */}
      {name && <input type="hidden" name={name} value={value || ""} />}
    </div>
  );
}
