import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { UserPlus, Search } from "lucide-react";
import { useVolunteerIndex } from "../hooks/useVolunteers";
import { VolunteerStatus } from "@shared/types";
import "./VolunteerList.css";

const STATUS_LABELS: Record<VolunteerStatus, string> = {
  active: "Aktiv",
  inactive: "Inaktiv",
  archived: "Archiviert",
};

const STATUS_BADGE: Record<VolunteerStatus, string> = {
  active: "badge-green",
  inactive: "badge-yellow",
  archived: "badge-gray",
};

export default function VolunteerList(): JSX.Element {
  const { index, loading } = useVolunteerIndex();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");

  const statusFilter = searchParams.get("status") as VolunteerStatus | null;

  const filtered = useMemo(() => {
    if (!index) return [];
    return index.volunteers.filter((v) => {
      const matchesStatus = !statusFilter || v.status === statusFilter;
      const q = query.toLowerCase();
      const matchesQuery =
        !q ||
        v.firstName.toLowerCase().includes(q) ||
        v.lastName.toLowerCase().includes(q) ||
        v.roles.some((r) => r.toLowerCase().includes(q));
      return matchesStatus && matchesQuery;
    });
  }, [index, query, statusFilter]);

  return (
    <div className="volunteer-list-page">
      <div className="page-header-row">
        <div>
          <h1>Ehrenamtliche</h1>
          <p className="text-muted">{filtered.length} Einträge</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/volunteers/new")}
        >
          <UserPlus size={16} />
          Neu anlegen
        </button>
      </div>

      <div className="search-bar">
        <Search size={16} className="search-icon" />
        <input
          className="input search-input"
          placeholder="Name oder Aufgabe suchen..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading && <p className="text-muted">Lade...</p>}

      <div className="volunteer-table card">
        {filtered.length === 0 && !loading && (
          <p className="empty-hint">Keine Einträge gefunden.</p>
        )}
        {filtered.map((v) => (
          <div
            key={v.id}
            className="volunteer-row"
            onClick={() => navigate(`/volunteers/${v.id}`)}
          >
            <div className="vol-avatar">
              {v.firstName[0]}
              {v.lastName[0]}
            </div>
            <div className="vol-info">
              <span className="vol-name">
                {v.firstName} {v.lastName}
              </span>
              <span className="vol-roles">{v.roles.join(", ") || "—"}</span>
            </div>
            <div className="vol-meta">
              <span className={`badge ${STATUS_BADGE[v.status]}`}>
                {STATUS_LABELS[v.status]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
