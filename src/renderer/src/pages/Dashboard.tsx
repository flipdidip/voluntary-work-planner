import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Bell,
  Calendar,
  FolderOpen,
  Cake,
  Gift,
  Clock,
  Award,
  CheckCircle,
  Users2,
  Handshake,
  UserPlus,
  BarChart3,
  Copy,
  Download,
} from "lucide-react";
import { format, isValid, parseISO, subYears } from "date-fns";
import { de } from "date-fns/locale";
import { useVolunteerIndex } from "../hooks/useVolunteers";
import { usePartnerIndex } from "../hooks/usePartners";
import { useGroupMeetings } from "../hooks/useGroupMeetings";
import {
  calculateUpcomingEvents,
  UpcomingEvent,
} from "@shared/eventCalculationService";
import {
  DinoIconId,
  getGroupMeetingAttendanceStatus,
  Volunteer,
} from "@shared/types";
import DinoIconBadge from "../components/DinoIcon";
import Snackbar from "../components/Snackbar";
import "../components/DinoIcon.css";
import "./Dashboard.css";

function formatDateInput(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function isInDateRange(value: string | undefined, start: Date, end: Date): boolean {
  if (!value) return false;
  const date = parseISO(value);
  return (
    isValid(date) &&
    date.getTime() >= start.getTime() &&
    date.getTime() <= end.getTime()
  );
}

function hasRequirement(
  volunteer: Volunteer,
  type: "erstgespraech" | "grundkurs",
): boolean {
  return (volunteer.requirements ?? []).some(
    (requirement) =>
      requirement.requirementType === type && !!requirement.completedDate,
  );
}

function wasActiveDuring(
  volunteer: Volunteer,
  start: Date,
  end: Date,
): boolean {
  const statusEntries = [...(volunteer.statusLog ?? [])]
    .filter((entry) => isValid(parseISO(entry.timestamp)))
    .sort(
      (a, b) =>
        parseISO(a.timestamp).getTime() - parseISO(b.timestamp).getTime(),
    );

  return statusEntries.some((entry, index) => {
    if (entry.to !== "active") return false;
    const periodStart = parseISO(entry.timestamp).getTime();
    const periodEnd = statusEntries[index + 1]
      ? parseISO(statusEntries[index + 1].timestamp).getTime()
      : Number.POSITIVE_INFINITY;
    return periodStart <= end.getTime() && periodEnd >= start.getTime();
  });
}

function StatLine({
  label,
  value,
}: {
  label: string;
  value: number | string;
}): JSX.Element {
  return (
    <div className="dashboard-stat-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const INTAKE_CHART_COLORS = [
  "#39a96b",
  "#5686d8",
  "#f0a33a",
  "#9b6bd3",
  "#8b98a8",
  "#e76f8a",
  "#38a3a5",
  "#d0a830",
];

interface PieChartSegment {
  label: string;
  value: number;
  color: string;
}

function colorChartSegments(
  entries: Array<[string, number]>,
): PieChartSegment[] {
  return entries.map(([label, value], index) => ({
    label,
    value,
    color: INTAKE_CHART_COLORS[index % INTAKE_CHART_COLORS.length],
  }));
}

async function copyStatisticsCardImage(element: HTMLElement): Promise<void> {
  if (typeof window.api.copyWindowRectToClipboard !== "function") {
    throw new Error(
      "Die App-Komponente für den Bildexport ist noch nicht aktualisiert. Bitte die App vollständig schließen und neu starten.",
    );
  }

  const { width, height: originalHeight } = element.getBoundingClientRect();
  if (width <= 0 || originalHeight <= 0) {
    throw new Error("Die Statistik-Karte ist nicht sichtbar.");
  }
  const bounds = element.getBoundingClientRect();
  await window.api.copyWindowRectToClipboard({
    x: Math.max(0, Math.round(bounds.x)),
    y: Math.max(0, Math.round(bounds.y)),
    width: Math.round(bounds.width),
    height: Math.round(bounds.height),
  });
}

function escapeCsv(value: string | number): string {
  const rawText = String(value);
  const text = /^[=+\-@\t\r]/.test(rawText) ? `'${rawText}` : rawText;
  return `"${text.replace(/"/g, '""')}"`;
}

function createStatisticsCsv(
  from: string,
  to: string,
  statistics: {
    interestedCount: number;
    origins: PieChartSegment[];
    firstInterviews: number;
    exitedInterestedCount: number;
    intakeSegments: PieChartSegment[];
    activeNow: number;
    newVolunteers: number;
    endedVolunteers: number;
    terminationReasons: PieChartSegment[];
    meetingCount: number;
    invited: number;
    present: number;
    absent: number;
    unknown: number;
    attendanceRate: number;
  },
): string {
  const rows: Array<[string, string, string | number]> = [
    ["Zeitraum", "Von", from],
    ["Zeitraum", "Bis", to],
    ["Interessenten-Management", "Eingegangene Anfragen", statistics.interestedCount],
    ["Verlauf des Aufnahmeprozesses", "Geführte Erstgespräche", statistics.firstInterviews],
    ["Verlauf des Aufnahmeprozesses", "Gesamt inaktiv/archiviert, war Interessent", statistics.exitedInterestedCount],
    ...statistics.intakeSegments.map(
      (segment): [string, string, number] => [
        "Aufnahmeprozess",
        segment.label,
        segment.value,
      ],
    ),
    ["Ehrenamt-Übersicht", "Aktive Ehrenamtliche", statistics.activeNow],
    ["Ehrenamt-Übersicht", "Neue Ehrenamtliche", statistics.newVolunteers],
    ["Ehrenamt-Übersicht", "Beendete Ehrenamtliche", statistics.endedVolunteers],
    ...statistics.terminationReasons.map(
      (segment): [string, string, number] => [
        "Gründe der Beendigung",
        segment.label,
        segment.value,
      ],
    ),
    ...(statistics.terminationReasons.length === 0
      ? [["Gründe der Beendigung", "Keine Beendigungen im Zeitraum", 0] as [
          string,
          string,
          number,
        ]]
      : []),
    ["Gruppentreffen", "Anzahl Treffen", statistics.meetingCount],
    ["Gruppentreffen", "Eingeladene Ehrenamtliche", statistics.invited],
    ["Gruppentreffen", "Anwesend", statistics.present],
    ["Gruppentreffen", "Abwesend", statistics.absent],
    ["Gruppentreffen", "Rückmeldung offen", statistics.unknown],
    ["Gruppentreffen", "Teilnahmequote in Prozent", statistics.attendanceRate],
    ...statistics.origins.map(
      (segment): [string, string, number] => [
        "Herkunft der Anfrage",
        segment.label,
        segment.value,
      ],
    ),
    ...(statistics.origins.length === 0
      ? [["Herkunft der Anfrage", "Keine Anfragen im Zeitraum", 0] as [
          string,
          string,
          number,
        ]]
      : []),
  ];
  return [
    ["Bereich", "Kennzahl", "Wert"].map(escapeCsv).join(";"),
    ...rows.map((row) => row.map(escapeCsv).join(";")),
  ].join("\r\n");
}

function getIntakeChartGradient(
  segments: PieChartSegment[],
  total: number,
): string {
  let current = 0;
  const stops: string[] = [];
  for (const segment of segments) {
    const next = current + (segment.value / total) * 100;
    if (segment.value > 0) {
      stops.push(`${segment.color} ${current}% ${next}%`);
    }
    current = next;
  }
  return `conic-gradient(${stops.join(", ")})`;
}

function PieChart({
  segments,
  emptyMessage,
}: {
  segments: PieChartSegment[];
  emptyMessage: string;
}): JSX.Element {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <div className="intake-chart">
      <div
        className={`intake-pie${total === 0 ? " intake-pie--empty" : ""}`}
        role="img"
        aria-label={`Tortendiagramm mit insgesamt ${total} Einträgen`}
        style={
          total > 0
            ? { background: getIntakeChartGradient(segments, total) }
            : undefined
        }
      >
        {total === 0 && <span>0</span>}
      </div>
      <div className="intake-chart-content">
        {total === 0 ? (
          <p className="text-muted">{emptyMessage}</p>
        ) : (
          <div className="intake-chart-legend">
            {segments.map((segment) => (
              <div className="intake-chart-legend-item" key={segment.label}>
                <span
                  className="intake-chart-swatch"
                  style={{ backgroundColor: segment.color }}
                  aria-hidden="true"
                />
                <span>{segment.label}</span>
                <strong>{segment.value}</strong>
              </div>
            ))}
          </div>
        )}
        </div>
    </div>
  );
}

function CopyCardButton({
  title,
  onClick,
}: {
  title: string;
  onClick: (button: HTMLButtonElement) => void;
}): JSX.Element {
  return (
    <button
      type="button"
      className="btn btn-ghost dashboard-copy-card-button"
      onClick={(event) => onClick(event.currentTarget)}
      data-tooltip={`„${title}“ als Bild kopieren`}
      aria-label={`„${title}“ als Bild in die Zwischenablage kopieren`}
    >
      <Copy size={18} strokeWidth={2.5} />
    </button>
  );
}

// Helper to get event kind badge info
function getEventKindInfo(kind: UpcomingEvent["kind"]) {
  const info: Record<
    UpcomingEvent["kind"],
    { icon: React.ReactNode; label: string; color: string }
  > = {
    birthday: {
      icon: <Cake size={14} />,
      label: "Geburtstag",
      color: "badge-blue",
    },
    "birthday-round": {
      icon: <Gift size={14} />,
      label: "Runder Geburtstag",
      color: "badge-gold",
    },
    "anniversary-joined": {
      icon: <Bell size={14} />,
      label: "Jubiläum (Eintritt)",
      color: "badge-green",
    },
    "anniversary-activity": {
      icon: <Clock size={14} />,
      label: "Jubiläum (Aktivität)",
      color: "badge-teal",
    },
    "requirement-renewal": {
      icon: <CheckCircle size={14} />,
      label: "Qualifikation",
      color: "badge-orange",
    },
    custom: {
      icon: <Award size={14} />,
      label: "Erinnerung",
      color: "badge-purple",
    },
    "group-meeting": {
      icon: <Users2 size={14} />,
      label: "Gruppentreffen",
      color: "badge-teal",
    },
  };
  return info[kind];
}

export default function Dashboard(): JSX.Element {
  const { index, loading } = useVolunteerIndex();
  const { index: partnerIndex, loading: partnerLoading } = usePartnerIndex();
  const { index: meetingsIndex, loading: meetingsLoading } = useGroupMeetings();
  const navigate = useNavigate();
  const [dataPath, setDataPath] = useState<string>("");
  const [upcoming, setUpcoming] = useState<UpcomingEvent[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [missingDetailsCount, setMissingDetailsCount] = useState(0);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [dateFrom, setDateFrom] = useState(() =>
    formatDateInput(subYears(new Date(), 1)),
  );
  const [dateTo, setDateTo] = useState(() => formatDateInput(new Date()));
  const interestedCardRef = useRef<HTMLElement>(null);
  const intakeCardRef = useRef<HTMLElement>(null);
  const volunteerCardRef = useRef<HTMLElement>(null);
  const meetingCardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    window.api.getDataPath().then(setDataPath);
  }, []);

  useEffect(() => {
    if (!index) return;

    let cancelled = false;

    const loadUpcoming = async (): Promise<void> => {
      try {
        const settings = await window.api.getSettings();
        const meetingsIdx = await window.api.getGroupMeetings();
        const events = await calculateUpcomingEvents(
          index,
          settings,
          (id) => window.api.getVolunteer(id),
          { daysLimit: 30 },
          meetingsIdx,
        );

        if (!cancelled) {
          setUpcoming(events);
        }
      } catch {
        // Keep dashboard visible even if calculation fails
        if (!cancelled) {
          setUpcoming([]);
        }
      }
    };

    loadUpcoming();

    return () => {
      cancelled = true;
    };
  }, [index]);

  useEffect(() => {
    if (!index) return;

    let cancelled = false;
    setDetailsLoading(true);
    setDetailsError(null);
    setVolunteers([]);
    setMissingDetailsCount(0);

    Promise.all(
      index.volunteers.map((entry) => window.api.getVolunteer(entry.id)),
    )
      .then((records) => {
        if (cancelled) return;
        const availableRecords = records.filter(
          (record): record is Volunteer => record !== null,
        );
        setVolunteers(availableRecords);
        setMissingDetailsCount(records.length - availableRecords.length);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setDetailsError(`Statistik konnten nicht geladen werden: ${String(error)}`);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [index]);

  const dateRange = useMemo(() => {
    if (!dateFrom || !dateTo) return null;
    const start = parseISO(dateFrom);
    const end = parseISO(dateTo);
    if (!isValid(start) || !isValid(end) || start > end) return null;
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, [dateFrom, dateTo]);

  const statistics = useMemo(() => {
    if (!dateRange) return null;
    const { start, end } = dateRange;
    const interested = volunteers.filter((volunteer) =>
      (volunteer.statusLog ?? []).some(
        (entry) =>
          entry.to === "requested" &&
          isInDateRange(entry.timestamp, start, end),
      ),
    );
    const exitedInterested = interested.filter(
      (volunteer) =>
        volunteer.status === "inactive" || volunteer.status === "archived",
    );
    const intakeSegments = [
      {
        label: "Interessenten, jetzt aktiv",
        value: interested.filter((volunteer) => volunteer.status === "active")
          .length,
      },
      {
        label: "Inaktiv/archiviert, Grundkurs absolviert",
        value: exitedInterested.filter((volunteer) =>
          hasRequirement(volunteer, "grundkurs"),
        ).length,
      },
      {
        label: "Inaktiv/archiviert, mit Erstgespräch",
        value: exitedInterested.filter(
          (volunteer) =>
            !hasRequirement(volunteer, "grundkurs") &&
            hasRequirement(volunteer, "erstgespraech"),
        ).length,
      },
      {
        label: "Inaktiv/archiviert, ohne Erstgespräch",
        value: exitedInterested.filter(
          (volunteer) =>
            !hasRequirement(volunteer, "grundkurs") &&
            !hasRequirement(volunteer, "erstgespraech"),
        ).length,
      },
      {
        label: "Noch im Interessentenstatus",
        value: interested.filter((volunteer) => volunteer.status === "requested")
          .length,
      },
    ].map((segment, index) => ({
      ...segment,
      color: INTAKE_CHART_COLORS[index],
    }));
    const terminated = volunteers.filter(
      (volunteer) =>
        (volunteer.status === "inactive" || volunteer.status === "archived") &&
        wasActiveDuring(volunteer, start, end),
    );
    const terminationReasons = new Map<string, number>();
    terminated.forEach((volunteer) => {
      const terminationEntry = [...(volunteer.statusLog ?? [])]
        .filter(
          (entry) =>
            (entry.to === "inactive" || entry.to === "archived") &&
            isValid(parseISO(entry.timestamp)),
        )
        .sort(
          (a, b) =>
            parseISO(a.timestamp).getTime() - parseISO(b.timestamp).getTime(),
        )
        .pop();
      if (terminationEntry) {
        const reason = terminationEntry.note?.trim() || "Kein Grund angegeben";
        terminationReasons.set(reason, (terminationReasons.get(reason) ?? 0) + 1);
      }
    });
    const origins = new Map<string, number>();
    interested.forEach((volunteer) => {
      const origin = volunteer.requestOrigin?.trim() || "Keine Angabe";
      origins.set(origin, (origins.get(origin) ?? 0) + 1);
    });
    const firstInterviews = volunteers.filter((volunteer) =>
      (volunteer.requirements ?? []).some(
        (requirement) =>
          requirement.requirementType === "erstgespraech" &&
          isInDateRange(requirement.completedDate, start, end),
      ),
    ).length;
    const meetings = (meetingsIndex?.meetings ?? []).filter((meeting) =>
      isInDateRange(meeting.date, start, end),
    );
    const volunteerParticipants = meetings.flatMap((meeting) =>
      (meeting.participants ?? []).filter(
        (participant) => participant.type === "volunteer",
      ),
    );
    const present = volunteerParticipants.filter(
      (participant) =>
        getGroupMeetingAttendanceStatus(participant) === "present",
    ).length;
    const absent = volunteerParticipants.filter(
      (participant) =>
        getGroupMeetingAttendanceStatus(participant) === "absent",
    ).length;
    const rated = present + absent;

    return {
      interestedCount: interested.length,
      origins: colorChartSegments(
        [...origins.entries()].sort((a, b) => b[1] - a[1]),
      ),
      firstInterviews,
      exitedInterestedCount: exitedInterested.length,
      intakeSegments,
      activeNow: volunteers.filter((volunteer) => volunteer.status === "active")
        .length,
      newVolunteers: volunteers.filter((volunteer) => {
        const firstActiveEntry = [...(volunteer.statusLog ?? [])]
          .filter(
            (entry) =>
              entry.to === "active" && isValid(parseISO(entry.timestamp)),
          )
          .sort(
            (a, b) =>
              parseISO(a.timestamp).getTime() -
              parseISO(b.timestamp).getTime(),
          )[0];
        return (
          !!firstActiveEntry &&
          isInDateRange(firstActiveEntry.timestamp, start, end)
        );
      }).length,
      endedVolunteers: terminated.length,
      terminationReasons: colorChartSegments(
        [...terminationReasons.entries()].sort((a, b) => b[1] - a[1]),
      ),
      meetingCount: meetings.length,
      invited: volunteerParticipants.length,
      present,
      absent,
      unknown: volunteerParticipants.length - rated,
      attendanceRate: rated > 0 ? Math.round((present / rated) * 100) : 0,
    };
  }, [dateRange, volunteers, meetingsIndex]);

  const exportStatisticsCsv = (): void => {
    if (!statistics || !dateRange) return;
    try {
      const csv = createStatisticsCsv(dateFrom, dateTo, statistics);
      const blob = new Blob(["\uFEFF", csv], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `statistik-${dateFrom}-bis-${dateTo}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice({
        type: "success",
        message: "Statistik wurde als CSV exportiert.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        message: `CSV-Export fehlgeschlagen: ${String(error)}`,
      });
    }
  };

  const handleCopyCardImage = async (
    title: string,
    cardRef: React.RefObject<HTMLElement | null>,
    button: HTMLButtonElement,
  ): Promise<void> => {
    const previousVisibility = button.style.visibility;
    try {
      if (!cardRef.current) {
        throw new Error("Die Statistik-Karte konnte nicht gefunden werden.");
      }
      button.style.visibility = "hidden";
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      await copyStatisticsCardImage(cardRef.current);
      setNotice({
        type: "success",
        message: `„${title}“ wurde vollständig als Bild in die Zwischenablage kopiert.`,
      });
    } catch (error) {
      setNotice({
        type: "error",
        message: `Bild konnte nicht kopiert werden: ${String(error)}`,
      });
    } finally {
      button.style.visibility = previousVisibility;
    }
  };

  const activeCount =
    index?.volunteers.filter((v) => v.status === "active").length ?? 0;
  const inactiveCount =
    index?.volunteers.filter((v) => v.status === "inactive").length ?? 0;
  const requestedCount =
    index?.volunteers.filter((v) => v.status === "requested").length ?? 0;
  const totalCount = activeCount + inactiveCount + requestedCount;

  const partnerActiveCount =
    partnerIndex?.volunteers.filter((v) => v.status === "active").length ?? 0;
  const partnerInactiveCount =
    partnerIndex?.volunteers.filter((v) => v.status === "inactive").length ?? 0;
  const partnerTotalCount = partnerActiveCount + partnerInactiveCount;

  const dinoIconByParticipantId = useMemo(() => {
    const iconMap = new Map<string, DinoIconId>();

    (index?.volunteers ?? []).forEach((entry) => {
      if (entry.dinoIconId) {
        iconMap.set(entry.id, entry.dinoIconId);
      }
    });

    (partnerIndex?.volunteers ?? []).forEach((entry) => {
      if (entry.dinoIconId) {
        iconMap.set(entry.id, entry.dinoIconId);
      }
    });

    return iconMap;
  }, [index, partnerIndex]);

  const participantNameById = useMemo(() => {
    const nameMap = new Map<string, string>();

    (index?.volunteers ?? []).forEach((entry) => {
      nameMap.set(entry.id, `${entry.firstName} ${entry.lastName}`);
    });

    (partnerIndex?.volunteers ?? []).forEach((entry) => {
      nameMap.set(entry.id, `${entry.firstName} ${entry.lastName}`);
    });

    return nameMap;
  }, [index, partnerIndex]);

  const getEventDinoParticipants = useMemo(
    () =>
      (
        event: UpcomingEvent,
      ): Array<{ participantId: string; iconId: DinoIconId; name: string }> => {
        if (event.participants && event.participants.length > 0) {
          return event.participants
            .map((participant) => {
              const iconId = dinoIconByParticipantId.get(participant.id);
              if (!iconId) {
                return null;
              }

              return {
                participantId: participant.id,
                iconId,
                name:
                  participantNameById.get(participant.id) ||
                  "Unbekannte Person",
              };
            })
            .filter(
              (
                participant,
              ): participant is {
                participantId: string;
                iconId: DinoIconId;
                name: string;
              } => !!participant,
            );
        }

        const iconId = dinoIconByParticipantId.get(event.volunteerId);
        if (!iconId) {
          return [];
        }

        return [
          {
            participantId: event.volunteerId,
            iconId,
            name:
              participantNameById.get(event.volunteerId) || event.volunteerName,
          },
        ];
      },
    [dinoIconByParticipantId, participantNameById],
  );

  if (!dataPath) {
    return (
      <div className="dashboard-setup">
        <div className="card setup-card">
          <FolderOpen size={40} className="setup-icon" />
          <h2>Willkommen!</h2>
          <p>
            Bitte zuerst den Datenordner konfigurieren (z.B. OneDrive /
            SharePoint-Sync-Ordner).
          </p>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/settings")}
          >
            Einstellungen öffnen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="text-muted">
          Übersicht der Ehrenamtlichen und Kooperationspartner
        </p>
      </div>

      <div className="dashboard-overview-grid">
        <section className="section card summary-panel">
          <h2>
            <Users size={18} /> Ehrenamtliche ({totalCount})
          </h2>
          {loading && <p className="text-muted">Lade...</p>}
          <div className="stats-grid stats-grid--compact stats-grid--volunteers">
            <div
              className="stat-card card"
              onClick={() => navigate("/volunteers?status=requested")}
            >
              <div className="stat-icon stat-icon--blue">
                <UserPlus size={20} />
              </div>
              <div className="stat-value">{requestedCount}</div>
              <div className="stat-label">Angefragt</div>
            </div>
            <div
              className="stat-card card"
              onClick={() => navigate("/volunteers?status=active")}
            >
              <div className="stat-icon stat-icon--green">
                <Users size={20} />
              </div>
              <div className="stat-value">{activeCount}</div>
              <div className="stat-label">Aktiv</div>
            </div>
            <div
              className="stat-card card"
              onClick={() => navigate("/volunteers?status=inactive")}
            >
              <div className="stat-icon stat-icon--gray">
                <Users size={20} />
              </div>
              <div className="stat-value">{inactiveCount}</div>
              <div className="stat-label">Inaktiv</div>
            </div>
          </div>
        </section>

        <section className="section card summary-panel">
          <h2>
            <Handshake size={18} /> Kooperationspartner ({partnerTotalCount})
          </h2>
          {partnerLoading && <p className="text-muted">Lade...</p>}
          <div className="stats-grid stats-grid--compact">
            <div
              className="stat-card card"
              onClick={() => navigate("/partners?status=active")}
            >
              <div className="stat-icon stat-icon--green">
                <Handshake size={20} />
              </div>
              <div className="stat-value">{partnerActiveCount}</div>
              <div className="stat-label">Aktiv</div>
            </div>
            <div
              className="stat-card card"
              onClick={() => navigate("/partners?status=inactive")}
            >
              <div className="stat-icon stat-icon--gray">
                <Handshake size={20} />
              </div>
              <div className="stat-value">{partnerInactiveCount}</div>
              <div className="stat-label">Inaktiv</div>
            </div>
          </div>
        </section>
      </div>

      <section className="section dashboard-statistics">
        <div className="dashboard-statistics-header">
          <div>
            <h2>
              <BarChart3 size={18} /> Statistik
            </h2>
            <p className="text-muted">
              Auswertung für den ausgewählten Zeitraum
            </p>
          </div>
          <div className="dashboard-statistics-tools">
            <div className="dashboard-date-range">
              <label>
                <span>Von</span>
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </label>
              <label>
                <span>Bis</span>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  max={formatDateInput(new Date())}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </label>
            </div>
            <button
              type="button"
              className="btn btn-secondary dashboard-csv-button"
              onClick={exportStatisticsCsv}
              disabled={!statistics || detailsLoading || meetingsLoading}
            >
              <Download size={16} /> CSV exportieren
            </button>
          </div>
        </div>

        {(detailsLoading || meetingsLoading) && (
          <p className="text-muted">Lade Statistik...</p>
        )}
        {detailsError && <p className="dashboard-statistics-error">{detailsError}</p>}
        {missingDetailsCount > 0 && (
          <p className="dashboard-statistics-warning">
            Für {missingDetailsCount} Ehrenamtliche konnten keine Detaildaten
            geladen werden; die Kennzahlen können unvollständig sein.
          </p>
        )}
        {!dateRange && (
          <p className="dashboard-statistics-error">
            Bitte wählen Sie einen gültigen Zeitraum aus.
          </p>
        )}
        {statistics &&
          !detailsLoading &&
          !meetingsLoading &&
          !detailsError && (
          <div className="dashboard-statistics-grid">
            <section
              ref={interestedCardRef}
              className="card dashboard-statistics-panel"
            >
              <div className="dashboard-statistics-panel-header">
                <div className="dashboard-statistics-panel-title">
                  <h3>Interessenten-Management</h3>
                  <span className="dashboard-card-date-range">
                    {format(parseISO(dateFrom), "dd.MM.yyyy")} –{" "}
                    {format(parseISO(dateTo), "dd.MM.yyyy")}
                  </span>
                </div>
                <CopyCardButton
                  title="Interessenten-Management"
                  onClick={(button) =>
                    void handleCopyCardImage(
                      "Interessenten-Management",
                      interestedCardRef,
                      button,
                    )
                  }
                />
              </div>
              <div className="dashboard-highlight-stat">
                <strong>{statistics.interestedCount}</strong>
                <span>Eingegangene Anfragen</span>
              </div>
              <h4>Herkunft der Anfrage</h4>
              <PieChart
                segments={statistics.origins}
                emptyMessage="Keine Anfragen im Zeitraum."
              />
            </section>

            <section
              ref={intakeCardRef}
              className="card dashboard-statistics-panel"
            >
              <div className="dashboard-statistics-panel-header">
                <div className="dashboard-statistics-panel-title">
                  <h3>Verlauf des Aufnahmeprozesses</h3>
                  <span className="dashboard-card-date-range">
                    {format(parseISO(dateFrom), "dd.MM.yyyy")} –{" "}
                    {format(parseISO(dateTo), "dd.MM.yyyy")}
                  </span>
                </div>
                <CopyCardButton
                  title="Verlauf des Aufnahmeprozesses"
                  onClick={(button) =>
                    void handleCopyCardImage(
                      "Verlauf des Aufnahmeprozesses",
                      intakeCardRef,
                      button,
                    )
                  }
                />
              </div>
              <div className="intake-chart-summary">
                <strong>{statistics.interestedCount}</strong>
                <span>Interessenten im Zeitraum</span>
              </div>
              <PieChart
                segments={statistics.intakeSegments}
                emptyMessage="Keine Interessenten im ausgewählten Zeitraum."
              />
              <div className="dashboard-stat-list">
                <StatLine
                  label="Geführte Erstgespräche"
                  value={statistics.firstInterviews}
                />
                <StatLine
                  label="Gesamt inaktiv/archiviert, war Interessent"
                  value={statistics.exitedInterestedCount}
                />
              </div>
            </section>

            <section
              ref={volunteerCardRef}
              className="card dashboard-statistics-panel"
            >
              <div className="dashboard-statistics-panel-header">
                <div className="dashboard-statistics-panel-title">
                  <h3>Ehrenamt-Übersicht</h3>
                  <span className="dashboard-card-date-range">
                    {format(parseISO(dateFrom), "dd.MM.yyyy")} –{" "}
                    {format(parseISO(dateTo), "dd.MM.yyyy")}
                  </span>
                </div>
                <CopyCardButton
                  title="Ehrenamt-Übersicht"
                  onClick={(button) =>
                    void handleCopyCardImage(
                      "Ehrenamt-Übersicht",
                      volunteerCardRef,
                      button,
                    )
                  }
                />
              </div>
              <div className="dashboard-stat-list">
                <StatLine
                  label="Aktive Ehrenamtliche"
                  value={statistics.activeNow}
                />
                <StatLine
                  label="Neue Ehrenamtliche im Zeitraum"
                  value={statistics.newVolunteers}
                />
                <StatLine
                  label="Beendete Ehrenamtliche"
                  value={statistics.endedVolunteers}
                />
              </div>
              <h4>Gründe der Beendigung</h4>
              <PieChart
                segments={statistics.terminationReasons}
                emptyMessage="Keine Beendigungen im Zeitraum."
              />
            </section>

            <section
              ref={meetingCardRef}
              className="card dashboard-statistics-panel"
            >
              <div className="dashboard-statistics-panel-header">
                <div className="dashboard-statistics-panel-title">
                  <h3>Teilnahme an Gruppentreffen</h3>
                  <span className="dashboard-card-date-range">
                    {format(parseISO(dateFrom), "dd.MM.yyyy")} –{" "}
                    {format(parseISO(dateTo), "dd.MM.yyyy")}
                  </span>
                </div>
                <CopyCardButton
                  title="Teilnahme an Gruppentreffen"
                  onClick={(button) =>
                    void handleCopyCardImage(
                      "Teilnahme an Gruppentreffen",
                      meetingCardRef,
                      button,
                    )
                  }
                />
              </div>
              <div className="dashboard-stat-list">
                <StatLine
                  label="Gruppentreffen"
                  value={statistics.meetingCount}
                />
                <StatLine
                  label="Eingeladene Ehrenamtliche"
                  value={statistics.invited}
                />
                <StatLine label="Anwesend" value={statistics.present} />
                <StatLine label="Abwesend" value={statistics.absent} />
                <StatLine label="Noch offen" value={statistics.unknown} />
                <StatLine
                  label="Teilnahmequote (ohne offene Rückmeldungen)"
                  value={`${statistics.attendanceRate} %`}
                />
              </div>
            </section>
          </div>
        )}
      </section>

      {/* Upcoming birthdays / reminders */}
      <section className="section">
        <h2>
          <Calendar size={18} /> Nächste Ereignisse (30 Tage)
        </h2>
        {loading && <p className="text-muted">Lade...</p>}
        {!loading && upcoming.length === 0 && (
          <p className="text-muted empty-hint">Keine anstehenden Ereignisse.</p>
        )}
        <div className="upcoming-list">
          {upcoming.map((ev) => {
            const kindInfo = getEventKindInfo(ev.kind);
            const dinoParticipants = getEventDinoParticipants(ev);
            return (
              <div
                key={`${ev.volunteerId}-${ev.date}`}
                className="upcoming-item card"
                onClick={() =>
                  ev.meetingId
                    ? navigate(`/meetings/${ev.meetingId}`)
                    : navigate(`/volunteers/${ev.volunteerId}`)
                }
              >
                <div
                  className={`upcoming-badge ${ev.daysUntil === 0 ? "badge-green" : "badge-purple"} badge`}
                >
                  {ev.daysUntil === 0 ? "Heute!" : `in ${ev.daysUntil}d`}
                </div>
                <div
                  className={`event-kind-badge badge ${kindInfo.color}`}
                  title={kindInfo.label}
                >
                  {kindInfo.icon}
                </div>
                <div className="upcoming-info">
                  <span className="upcoming-name-row">
                    <span className="upcoming-name">{ev.volunteerName}</span>
                    {dinoParticipants.length > 0 && (
                      <span className="upcoming-dinos">
                        {dinoParticipants.slice(0, 3).map((participant) => (
                          <DinoIconBadge
                            key={participant.participantId}
                            iconId={participant.iconId}
                            size="sm"
                            title={participant.name}
                          />
                        ))}
                        {dinoParticipants.length > 3 && (
                          <span className="upcoming-dinos-more">
                            +{dinoParticipants.length - 3}
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                  <span className="upcoming-label">{ev.label}</span>
                </div>
                <div className="upcoming-date">
                  {format(parseISO(ev.date), "dd. MMM", { locale: de })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      {notice && (
        <Snackbar
          message={notice.message}
          type={notice.type}
          onDismiss={() => setNotice(null)}
        />
      )}
    </div>
  );
}
