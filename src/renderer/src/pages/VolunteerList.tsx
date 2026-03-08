import {
  useState,
  useMemo,
  useEffect,
  type Dispatch,
  type SetStateAction,
} from "react";
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

type FilterMode = "off" | "include" | "exclude";
type JoinedFilter = "last12m" | "atLeast12m";

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
    "archived",
  );
  const [selectedStatusMode, setSelectedStatusMode] =
    useState<FilterMode>("exclude");
  const [includedRoles, setIncludedRoles] = useState<string[]>([]);
  const [excludedRoles, setExcludedRoles] = useState<string[]>([]);
  const [emailFilterMode, setEmailFilterMode] = useState<FilterMode>("off");
  const [phoneFilterMode, setPhoneFilterMode] = useState<FilterMode>("off");
  const [birthdayFilterMode, setBirthdayFilterMode] =
    useState<FilterMode>("off");
  const [joinedFilter, setJoinedFilter] = useState<JoinedFilter | null>(null);
  const [joinedFilterMode, setJoinedFilterMode] = useState<FilterMode>("off");

  const statusFromQuery = searchParams.get("status");

  useEffect(() => {
    if (
      statusFromQuery === "active" ||
      statusFromQuery === "inactive" ||
      statusFromQuery === "archived"
    ) {
      setSelectedStatus(statusFromQuery);
      setSelectedStatusMode("include");
      return;
    }
    setSelectedStatus("archived");
    setSelectedStatusMode("exclude");
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
      let matchesStatus = true;
      if (selectedStatus && selectedStatusMode !== "off") {
        const hasStatus = v.status === selectedStatus;
        matchesStatus =
          selectedStatusMode === "include" ? hasStatus : !hasStatus;
      }

      // Search query filter
      const q = query.toLowerCase();
      const matchesQuery =
        !q ||
        v.firstName.toLowerCase().includes(q) ||
        v.lastName.toLowerCase().includes(q) ||
        v.roles.some((r) => r.toLowerCase().includes(q));

      // Role filter
      const matchesIncludedRoles =
        includedRoles.length === 0 ||
        includedRoles.some((role) => v.roles.includes(role));
      const matchesExcludedRoles =
        excludedRoles.length === 0 ||
        excludedRoles.every((role) => !v.roles.includes(role));
      const matchesRoles = matchesIncludedRoles && matchesExcludedRoles;

      // Contact filters
      const hasVolunteerEmail = Boolean(v.email);
      const hasVolunteerPhone = Boolean(v.phone || v.mobile);
      const matchesEmail =
        emailFilterMode === "off"
          ? true
          : emailFilterMode === "include"
            ? hasVolunteerEmail
            : !hasVolunteerEmail;
      const matchesPhone =
        phoneFilterMode === "off"
          ? true
          : phoneFilterMode === "include"
            ? hasVolunteerPhone
            : !hasVolunteerPhone;

      // Birthday filter
      let isUpcomingBirthday = false;
      if (v.dateOfBirth) {
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
        isUpcomingBirthday = upcoming;
      }

      const matchesBirthday =
        birthdayFilterMode === "off"
          ? true
          : birthdayFilterMode === "include"
            ? isUpcomingBirthday
            : !isUpcomingBirthday;

      // Joined date / tenure filter
      let matchesJoined = true;
      if (joinedFilter && joinedFilterMode !== "off") {
        let inJoinedFilter = false;
        if (v.joinedDate) {
          const joinedDate = parseISO(v.joinedDate);
          if (!Number.isNaN(joinedDate.getTime())) {
            const today = new Date();
            if (joinedFilter === "last12m") {
              inJoinedFilter = isAfter(joinedDate, subYears(today, 1));
            }
            if (joinedFilter === "atLeast12m") {
              inJoinedFilter = differenceInMonths(today, joinedDate) >= 12;
            }
          }
        }
        matchesJoined =
          joinedFilterMode === "include" ? inJoinedFilter : !inJoinedFilter;
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
    selectedStatusMode,
    includedRoles,
    excludedRoles,
    emailFilterMode,
    phoneFilterMode,
    birthdayFilterMode,
    joinedFilter,
    joinedFilterMode,
  ]);

  const cycleRole = (role: string) => {
    const isIncluded = includedRoles.includes(role);
    const isExcluded = excludedRoles.includes(role);

    if (!isIncluded && !isExcluded) {
      setIncludedRoles((prev) => [...prev, role]);
      return;
    }
    if (isIncluded) {
      setIncludedRoles((prev) => prev.filter((r) => r !== role));
      setExcludedRoles((prev) => [...prev, role]);
      return;
    }
    setExcludedRoles((prev) => prev.filter((r) => r !== role));
  };

  const cycleBinaryFilter = (setMode: Dispatch<SetStateAction<FilterMode>>) => {
    setMode((prev) => {
      if (prev === "off") return "include";
      if (prev === "include") return "exclude";
      return "off";
    });
  };

  const cycleStatus = (status: VolunteerStatus) => {
    if (selectedStatus !== status) {
      setSelectedStatus(status);
      setSelectedStatusMode("include");
      return;
    }

    setSelectedStatusMode((prev) => {
      if (prev === "off") return "include";
      if (prev === "include") return "exclude";
      setSelectedStatus(null);
      return "off";
    });
  };

  const cycleJoinedFilter = (value: JoinedFilter) => {
    if (joinedFilter !== value) {
      setJoinedFilter(value);
      setJoinedFilterMode("include");
      return;
    }

    setJoinedFilterMode((prev) => {
      if (prev === "off") return "include";
      if (prev === "include") return "exclude";
      setJoinedFilter(null);
      return "off";
    });
  };

  const chipModeClass = (mode: FilterMode): string => {
    if (mode === "include") return "active";
    if (mode === "exclude") return "exclude";
    return "";
  };

  const clearFilters = () => {
    setSelectedStatus(null);
    setSelectedStatusMode("off");
    setIncludedRoles([]);
    setExcludedRoles([]);
    setEmailFilterMode("off");
    setPhoneFilterMode("off");
    setBirthdayFilterMode("off");
    setJoinedFilter(null);
    setJoinedFilterMode("off");
  };

  const hasActiveFilters =
    (selectedStatus !== null && selectedStatusMode !== "off") ||
    includedRoles.length > 0 ||
    excludedRoles.length > 0 ||
    emailFilterMode !== "off" ||
    phoneFilterMode !== "off" ||
    birthdayFilterMode !== "off" ||
    (joinedFilter !== null && joinedFilterMode !== "off");

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
        <div className="filter-group">
          <span className="filter-group-label">Status:</span>
          <div className="filter-chips">
            {(["active", "inactive", "archived"] as VolunteerStatus[]).map(
              (status) => (
                <button
                  key={status}
                  className={`filter-chip ${selectedStatus === status ? chipModeClass(selectedStatusMode) : ""}`}
                  onClick={() => cycleStatus(status)}
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
              className={`filter-chip ${chipModeClass(birthdayFilterMode)}`}
              onClick={() => cycleBinaryFilter(setBirthdayFilterMode)}
            >
              Geburtstag (30 Tage)
            </button>
            <button
              className={`filter-chip ${chipModeClass(emailFilterMode)}`}
              onClick={() => cycleBinaryFilter(setEmailFilterMode)}
            >
              Hat E-Mail
            </button>
            <button
              className={`filter-chip ${chipModeClass(phoneFilterMode)}`}
              onClick={() => cycleBinaryFilter(setPhoneFilterMode)}
            >
              Hat Telefon
            </button>
          </div>
        </div>

        <div className="filter-group">
          <span className="filter-group-label">Beitritt:</span>
          <div className="filter-chips">
            <button
              className={`filter-chip ${joinedFilter === "last12m" ? chipModeClass(joinedFilterMode) : ""}`}
              onClick={() => cycleJoinedFilter("last12m")}
            >
              Letzte 12 Monate
            </button>
            <button
              className={`filter-chip ${joinedFilter === "atLeast12m" ? chipModeClass(joinedFilterMode) : ""}`}
              onClick={() => cycleJoinedFilter("atLeast12m")}
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
                  className={`filter-chip ${includedRoles.includes(role) ? "active" : excludedRoles.includes(role) ? "exclude" : ""}`}
                  onClick={() => cycleRole(role)}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        )}

        {hasActiveFilters && (
          <div className="filters-header">
            <button className="btn-clear-filters" onClick={clearFilters}>
              <X size={14} />
              Alle zurücksetzen
            </button>
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
