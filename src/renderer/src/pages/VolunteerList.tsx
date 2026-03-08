import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { UserPlus, Search, Mail, Phone, X } from "lucide-react";
import { useVolunteerIndex } from "../hooks/useVolunteers";
import { VolunteerStatus } from "@shared/types";
import {
  differenceInMonths,
  differenceInYears,
  format,
  parseISO,
  isAfter,
  isWithinInterval,
  addDays,
  subYears,
} from "date-fns";
import { de } from "date-fns/locale";
import "./VolunteerList.css";

type JoinedFilter = "all" | "last12m" | "atLeast12m";

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
  const [selectedStatus, setSelectedStatus] = useState<VolunteerStatus | null>(
    null,
  );
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [hasEmail, setHasEmail] = useState(false);
  const [hasPhone, setHasPhone] = useState(false);
  const [upcomingBirthday, setUpcomingBirthday] = useState(false);
  const [joinedFilter, setJoinedFilter] = useState<JoinedFilter>("all");

  const statusFromQuery = searchParams.get("status");

  useEffect(() => {
    if (
      statusFromQuery === "active" ||
      statusFromQuery === "inactive" ||
      statusFromQuery === "archived"
    ) {
      setSelectedStatus(statusFromQuery);
      return;
    }
    setSelectedStatus(null);
  }, [statusFromQuery]);

  // Extract all unique roles from volunteers
  const allRoles = useMemo(() => {
    if (!index) return [];
    const roleSet = new Set<string>();
    index.volunteers.forEach((v) => v.roles.forEach((r) => roleSet.add(r)));
    return Array.from(roleSet).sort();
  }, [index]);

  const filtered = useMemo(() => {
    if (!index) return [];
    return index.volunteers.filter((v) => {
      // Status filter
      const matchesStatus = !selectedStatus || v.status === selectedStatus;

      // Search query filter
      const q = query.toLowerCase();
      const matchesQuery =
        !q ||
        v.firstName.toLowerCase().includes(q) ||
        v.lastName.toLowerCase().includes(q) ||
        v.roles.some((r) => r.toLowerCase().includes(q));

      // Role filter
      const matchesRoles =
        selectedRoles.length === 0 ||
        selectedRoles.some((role) => v.roles.includes(role));

      // Contact filters - need to check main volunteer data (not in index)
      const matchesEmail = !hasEmail; // Will need full data
      const matchesPhone = !hasPhone; // Will need full data

      // Birthday filter
      let matchesBirthday = true;
      if (upcomingBirthday && v.dateOfBirth) {
        const today = new Date();
        const dob = parseISO(v.dateOfBirth);
        const thisYearBirthday = new Date(
          today.getFullYear(),
          dob.getMonth(),
          dob.getDate(),
        );
        const nextYearBirthday = new Date(
          today.getFullYear() + 1,
          dob.getMonth(),
          dob.getDate(),
        );

        const upcoming =
          isWithinInterval(thisYearBirthday, {
            start: today,
            end: addDays(today, 30),
          }) ||
          isWithinInterval(nextYearBirthday, {
            start: today,
            end: addDays(today, 30),
          });
        matchesBirthday = upcoming;
      } else if (upcomingBirthday) {
        matchesBirthday = false;
      }

      // Joined date / tenure filter
      let matchesJoined = true;
      if (joinedFilter !== "all") {
        if (!v.joinedDate) {
          matchesJoined = false;
        } else {
          const joinedDate = parseISO(v.joinedDate);
          if (Number.isNaN(joinedDate.getTime())) {
            matchesJoined = false;
          } else {
            const today = new Date();
            if (joinedFilter === "last12m") {
              matchesJoined = isAfter(joinedDate, subYears(today, 1));
            }
            if (joinedFilter === "atLeast12m") {
              matchesJoined = differenceInMonths(today, joinedDate) >= 12;
            }
          }
        }
      }

      return (
        matchesStatus &&
        matchesQuery &&
        matchesRoles &&
        matchesEmail &&
        matchesPhone &&
        matchesBirthday &&
        matchesJoined
      );
    });
  }, [
    index,
    query,
    selectedStatus,
    selectedRoles,
    hasEmail,
    hasPhone,
    upcomingBirthday,
    joinedFilter,
  ]);

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const clearFilters = () => {
    setSelectedStatus(null);
    setSelectedRoles([]);
    setHasEmail(false);
    setHasPhone(false);
    setUpcomingBirthday(false);
    setJoinedFilter("all");
  };

  const hasActiveFilters =
    selectedStatus ||
    selectedRoles.length > 0 ||
    hasEmail ||
    hasPhone ||
    upcomingBirthday ||
    joinedFilter !== "all";

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

      <div className="filters-section">
        {hasActiveFilters && (
          <div className="filters-header">
            <button className="btn-clear-filters" onClick={clearFilters}>
              <X size={14} />
              Alle zurücksetzen
            </button>
          </div>
        )}

        <div className="filter-group">
          <span className="filter-group-label">Status:</span>
          <div className="filter-chips">
            {(["active", "inactive", "archived"] as VolunteerStatus[]).map(
              (status) => (
                <button
                  key={status}
                  className={`filter-chip ${selectedStatus === status ? "active" : ""}`}
                  onClick={() =>
                    setSelectedStatus(selectedStatus === status ? null : status)
                  }
                >
                  {STATUS_LABELS[status]}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="filter-group">
          <span className="filter-group-label">Sonstiges:</span>
          <div className="filter-chips">
            <button
              className={`filter-chip ${upcomingBirthday ? "active" : ""}`}
              onClick={() => setUpcomingBirthday(!upcomingBirthday)}
            >
              Geburtstag (30 Tage)
            </button>
            <button
              className={`filter-chip ${hasEmail ? "active" : ""}`}
              onClick={() => setHasEmail(!hasEmail)}
            >
              Hat E-Mail
            </button>
            <button
              className={`filter-chip ${hasPhone ? "active" : ""}`}
              onClick={() => setHasPhone(!hasPhone)}
            >
              Hat Telefon
            </button>
          </div>
        </div>

        <div className="filter-group">
          <span className="filter-group-label">Beitritt:</span>
          <div className="filter-chips">
            <button
              className={`filter-chip ${joinedFilter === "last12m" ? "active" : ""}`}
              onClick={() =>
                setJoinedFilter((prev) =>
                  prev === "last12m" ? "all" : "last12m",
                )
              }
            >
              Letzte 12 Monate
            </button>
            <button
              className={`filter-chip ${joinedFilter === "atLeast12m" ? "active" : ""}`}
              onClick={() =>
                setJoinedFilter((prev) =>
                  prev === "atLeast12m" ? "all" : "atLeast12m",
                )
              }
            >
              Seit mind. 1 Jahr
            </button>
          </div>
        </div>

        {allRoles.length > 0 && (
          <div className="filter-group">
            <span className="filter-group-label">Aufgaben:</span>
            <div className="filter-chips">
              {allRoles.map((role) => (
                <button
                  key={role}
                  className={`filter-chip ${selectedRoles.includes(role) ? "active" : ""}`}
                  onClick={() => toggleRole(role)}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading && <p className="text-muted">Lade...</p>}

      <div className="volunteer-table card">
        {filtered.length === 0 && !loading && (
          <p className="empty-hint">Keine Einträge gefunden.</p>
        )}
        {filtered.map((v) => {
          const age = v.dateOfBirth
            ? differenceInYears(new Date(), parseISO(v.dateOfBirth))
            : null;
          const volunteerTenure = v.joinedDate
            ? getVolunteerTenure(v.joinedDate)
            : null;
          return (
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
                <div className="vol-header">
                  <span className="vol-name">
                    {v.firstName} {v.lastName}
                  </span>
                  {age !== null && <span className="vol-age">{age} Jahre</span>}
                  {volunteerTenure && (
                    <span className="vol-tenure">
                      Seit {volunteerTenure.formattedDate} ·{" "}
                      {volunteerTenure.duration}
                    </span>
                  )}
                </div>
                <span className="vol-roles">{v.roles.join(", ") || "—"}</span>
                <div className="vol-contact">
                  {v.phone && (
                    <span className="contact-item">
                      <Phone size={12} />
                      {v.phone}
                    </span>
                  )}
                  {v.mobile && (
                    <span className="contact-item">
                      <Phone size={12} />
                      {v.mobile}
                    </span>
                  )}
                  {v.email && (
                    <span className="contact-item">
                      <Mail size={12} />
                      {v.email}
                    </span>
                  )}
                </div>
              </div>
              <div className="vol-meta">
                <span className={`badge ${STATUS_BADGE[v.status]}`}>
                  {STATUS_LABELS[v.status]}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getVolunteerTenure(
  joinedDateIso: string,
): { formattedDate: string; duration: string } | null {
  const joinedDate = parseISO(joinedDateIso);
  if (Number.isNaN(joinedDate.getTime())) return null;

  const now = new Date();
  const from = joinedDate <= now ? joinedDate : now;
  const to = joinedDate <= now ? now : joinedDate;

  const totalMonths = differenceInMonths(to, from);
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  const durationParts: string[] = [];
  if (years > 0)
    durationParts.push(`${years} ${years === 1 ? "Jahr" : "Jahre"}`);
  if (months > 0)
    durationParts.push(`${months} ${months === 1 ? "Monat" : "Monate"}`);
  if (durationParts.length === 0) durationParts.push("< 1 Monat");

  return {
    formattedDate: format(joinedDate, "dd.MM.yyyy", { locale: de }),
    duration: durationParts.join(" "),
  };
}
