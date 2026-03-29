import { useState, useMemo } from "react";
import { Mail, Copy, Globe, X, Check, Search, Info } from "lucide-react";
import {
  REQUIREMENT_DEFINITIONS,
  type RequirementType,
  type RequirementStatusSummary,
  type VolunteerStatus,
} from "@shared/types";
import "./MailDialog.css";

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  roles: string[];
  status: VolunteerStatus;
  requirementsStatus: RequirementStatusSummary;
}

const allRequirementTypes = Object.keys(
  REQUIREMENT_DEFINITIONS,
) as RequirementType[];

function isFullyQualified(rs?: RequirementStatusSummary): boolean {
  if (!rs) return false;
  return allRequirementTypes.every((t) => rs[t] === "complete");
}

interface MailDialogProps {
  readonly participants: Participant[];
  readonly onClose: () => void;
  readonly onOpenExternalUrl: (url: string) => void;
  readonly initialQualifiedOnly?: boolean;
  readonly initialSelected?: Set<string>;
}

const STATUS_LABELS: Record<VolunteerStatus, string> = {
  active: "Aktiv",
  inactive: "Inaktiv",
  archived: "Archiviert",
};

export default function MailDialog({
  participants,
  onClose,
  onOpenExternalUrl,
  initialQualifiedOnly = true,
  initialSelected,
}: MailDialogProps): JSX.Element {
  const [selected, setSelected] = useState<Set<string>>(
    () => initialSelected ?? new Set(),
  );
  const [subject, setSubject] = useState("");
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<VolunteerStatus | null>(
    null,
  );
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [qualifiedOnly, setQualifiedOnly] = useState(initialQualifiedOnly);

  const withEmail = useMemo(
    () => participants.filter((p) => p.email?.trim()),
    [participants],
  );

  const allRoles = useMemo(() => {
    const roleSet = new Set<string>();
    withEmail.forEach((p) => p.roles.forEach((r) => roleSet.add(r)));
    return Array.from(roleSet).sort((a, b) => a.localeCompare(b));
  }, [withEmail]);

  const filteredParticipants = useMemo(() => {
    let list = withEmail;

    if (qualifiedOnly) {
      list = list.filter((p) => isFullyQualified(p.requirementsStatus));
    }

    if (statusFilter) {
      list = list.filter((p) => p.status === statusFilter);
    }

    if (roleFilter) {
      list = list.filter((p) => p.roles.includes(roleFilter));
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q) ||
          p.roles.some((r) => r.toLowerCase().includes(q)) ||
          p.email?.toLowerCase().includes(q),
      );
    }

    return list;
  }, [withEmail, query, statusFilter, roleFilter, qualifiedOnly]);

  const selectedEmails = useMemo(
    () =>
      [...selected]
        .map((id) => withEmail.find((p) => p.id === id)?.email)
        .filter((e): e is string => !!e?.trim()),
    [selected, withEmail],
  );

  const toggleParticipant = (id: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = (): void => {
    setSelected(new Set(filteredParticipants.map((p) => p.id)));
  };

  const deselectAll = (): void => {
    setSelected(new Set());
  };

  const copyEmails = async (): Promise<void> => {
    if (selectedEmails.length === 0) return;
    await navigator.clipboard.writeText(selectedEmails.join("; "));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openMailto = (): void => {
    if (selectedEmails.length === 0) return;
    const to = selectedEmails.map((e) => encodeURIComponent(e)).join(",");
    const subjectParam = subject.trim()
      ? `?subject=${encodeURIComponent(subject.trim())}`
      : "";
    onOpenExternalUrl(`mailto:${to}${subjectParam}`);
  };

  const openOutlookWeb = (): void => {
    if (selectedEmails.length === 0) return;
    const to = selectedEmails.join(";");
    let url = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}`;
    if (subject.trim()) {
      url += `&subject=${encodeURIComponent(subject.trim())}`;
    }
    onOpenExternalUrl(url);
  };

  const allFilteredSelected =
    filteredParticipants.length > 0 &&
    filteredParticipants.every((p) => selected.has(p.id));

  return (
    <div
      className="mail-dialog-overlay"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="mail-dialog"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="mail-dialog-header">
          <h2>
            <Mail size={20} /> E-Mail senden
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="mail-dialog-body">
          {/* Notice */}
          <div className="mail-dialog-notice">
            <Info size={14} />
            <span>
              Nur Ehrenamtliche mit hinterlegter E-Mail-Adresse werden angezeigt
              ({withEmail.length} von {participants.length}).
            </span>
          </div>

          {/* Subject */}
          <div className="mail-dialog-field">
            <label htmlFor="mail-subject">Betreff</label>
            <input
              id="mail-subject"
              className="input"
              placeholder="Betreff eingeben…"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div className="mail-dialog-filters">
            <div className="mail-dialog-filter-group">
              <span className="mail-dialog-filter-label">Qualifikation:</span>
              <div className="mail-dialog-filter-chips">
                <button
                  className={`filter-chip${qualifiedOnly ? " active" : ""}`}
                  onClick={() => setQualifiedOnly((prev) => !prev)}
                >
                  ✓ Nur Qualifizierte
                </button>
              </div>
            </div>

            <div className="mail-dialog-filter-group">
              <span className="mail-dialog-filter-label">Status:</span>
              <div className="mail-dialog-filter-chips">
                {(["active", "inactive", "archived"] as VolunteerStatus[]).map(
                  (s) => (
                    <button
                      key={s}
                      className={`filter-chip${statusFilter === s ? " active" : ""}`}
                      onClick={() =>
                        setStatusFilter((prev) => (prev === s ? null : s))
                      }
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ),
                )}
              </div>
            </div>

            {allRoles.length > 0 && (
              <div className="mail-dialog-filter-group">
                <span className="mail-dialog-filter-label">Aufgaben:</span>
                <div className="mail-dialog-filter-chips">
                  {allRoles.map((role) => (
                    <button
                      key={role}
                      className={`filter-chip${roleFilter === role ? " active" : ""}`}
                      onClick={() =>
                        setRoleFilter((prev) => (prev === role ? null : role))
                      }
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Participant search */}
          <div className="mail-dialog-field">
            <label>
              Empfänger{" "}
              <span className="mail-dialog-count">
                ({selected.size} von {filteredParticipants.length} ausgewählt)
              </span>
            </label>
            <div className="mail-dialog-search">
              <Search size={14} className="mail-dialog-search-icon" />
              <input
                className="input"
                placeholder="Teilnehmer suchen…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Select all / deselect all */}
          <div className="mail-dialog-select-actions">
            <button
              className="btn btn-ghost btn-sm"
              onClick={allFilteredSelected ? deselectAll : selectAll}
            >
              {allFilteredSelected
                ? "Alle abwählen"
                : `Alle auswählen (${filteredParticipants.length})`}
            </button>
          </div>

          {/* Participant list – same layout as group meeting picker */}
          <div className="participant-picker-list">
            {filteredParticipants.length === 0 && (
              <div
                className="text-muted"
                style={{ padding: "12px", textAlign: "center", width: "100%" }}
              >
                Keine Teilnehmer mit E-Mail gefunden.
              </div>
            )}
            {filteredParticipants.map((p) => (
              <label key={p.id} className="participant-pick-item">
                <input
                  type="checkbox"
                  checked={selected.has(p.id)}
                  onChange={() => toggleParticipant(p.id)}
                />
                {p.firstName} {p.lastName}
              </label>
            ))}
          </div>
        </div>

        <div className="mail-dialog-footer">
          <button
            className="btn btn-ghost"
            disabled={selectedEmails.length === 0}
            onClick={copyEmails}
          >
            {copied ? (
              <>
                <Check size={14} /> Kopiert!
              </>
            ) : (
              <>
                <Copy size={14} /> E-Mails kopieren
              </>
            )}
          </button>
          <button
            className="btn btn-primary"
            disabled={selectedEmails.length === 0}
            onClick={openMailto}
          >
            <Mail size={14} /> Mailto
          </button>
          <button
            className="btn btn-secondary"
            disabled={selectedEmails.length === 0}
            onClick={openOutlookWeb}
          >
            <Globe size={14} /> Outlook Web
          </button>
        </div>
      </div>
    </div>
  );
}
