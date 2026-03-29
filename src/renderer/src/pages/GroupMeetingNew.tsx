import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, X } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import {
  GroupMeeting,
  GroupMeetingParticipant,
  VolunteerIndexEntry,
} from "@shared/types";
import { useVolunteerIndex } from "../hooks/useVolunteers";
import { usePartnerIndex } from "../hooks/usePartners";
import { useGroupMeetings } from "../hooks/useGroupMeetings";
import "./GroupMeetingNew.css";

type ParticipantTab = "volunteer" | "partner";

export default function GroupMeetingNew(): JSX.Element {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id && id !== "new";

  const { index: volunteerIndex } = useVolunteerIndex();
  const { index: partnerIndex } = usePartnerIndex();
  const { index: meetingsIndex } = useGroupMeetings();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [participants, setParticipants] = useState<GroupMeetingParticipant[]>(
    [],
  );
  const [activeTab, setActiveTab] = useState<ParticipantTab>("volunteer");
  const [saving, setSaving] = useState(false);

  // If editing, load existing meeting
  useEffect(() => {
    if (!isEdit || !meetingsIndex) return;
    const meeting = meetingsIndex.meetings.find((m) => m.id === id);
    if (meeting) {
      setTitle(meeting.title);
      setDate(meeting.date);
      setNotes(meeting.notes || "");
      setParticipants(meeting.participants);
    }
  }, [isEdit, id, meetingsIndex]);

  const volunteers: VolunteerIndexEntry[] = useMemo(
    () =>
      (volunteerIndex?.volunteers ?? []).filter((v) => v.status !== "archived"),
    [volunteerIndex],
  );

  const partners: VolunteerIndexEntry[] = useMemo(
    () =>
      (partnerIndex?.volunteers ?? []).filter((v) => v.status !== "archived"),
    [partnerIndex],
  );

  const currentList = activeTab === "volunteer" ? volunteers : partners;

  const isParticipantSelected = (entryId: string): boolean =>
    participants.some((p) => p.id === entryId);

  const toggleParticipant = (entry: VolunteerIndexEntry): void => {
    if (isParticipantSelected(entry.id)) {
      setParticipants((prev) => prev.filter((p) => p.id !== entry.id));
    } else {
      setParticipants((prev) => [
        ...prev,
        {
          id: entry.id,
          name: `${entry.firstName} ${entry.lastName}`,
          type: activeTab,
        },
      ]);
    }
  };

  const removeParticipant = (participantId: string): void => {
    setParticipants((prev) => prev.filter((p) => p.id !== participantId));
  };

  const handleSave = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    setSaving(true);

    const meeting: GroupMeeting = {
      id: isEdit ? id! : uuidv4(),
      title: title.trim(),
      date,
      participants,
      notes: notes.trim() || undefined,
      _createdAt: "",
      _updatedAt: "",
    };

    // If editing, preserve original createdAt
    if (isEdit && meetingsIndex) {
      const existing = meetingsIndex.meetings.find((m) => m.id === id);
      if (existing) {
        meeting._createdAt = existing._createdAt;
      }
    }

    try {
      const result = await window.api.saveGroupMeeting(meeting);
      if (result.success) {
        navigate("/meetings");
      } else {
        alert(result.error || "Fehler beim Speichern.");
      }
    } catch (err) {
      alert(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="group-meeting-new">
      <div className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate("/meetings")}>
          <ArrowLeft size={18} />
        </button>
        <h1>{isEdit ? "Treffen bearbeiten" : "Neues Gruppentreffen"}</h1>
      </div>

      <form className="new-form card" onSubmit={handleSave}>
        <div className="form-row">
          <label>
            Titel *
            <input
              className="input"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="z.B. Monatliches Teamtreffen"
            />
          </label>
          <label>
            Datum *
            <input
              className="input"
              type="date"
              name="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
        </div>

        <label>
          Notizen
          <textarea
            className="input"
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Optionale Notizen zum Treffen..."
          />
        </label>

        {/* Participant picker */}
        <div className="participant-section">
          <h3>Teilnehmer</h3>

          {/* Selected participants */}
          <div className="selected-participants">
            {participants.map((p) => (
              <span
                key={p.id}
                className={`selected-participant-chip type-${p.type}`}
              >
                {p.name}
                <button
                  type="button"
                  className="participant-chip-remove"
                  onClick={() => removeParticipant(p.id)}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {participants.length === 0 && (
              <span className="text-muted" style={{ fontSize: "0.8rem" }}>
                Noch keine Teilnehmer ausgewählt
              </span>
            )}
          </div>

          {/* Type tabs */}
          <div className="participant-type-tabs">
            <button
              type="button"
              className={`participant-type-tab${activeTab === "volunteer" ? " active" : ""}`}
              onClick={() => setActiveTab("volunteer")}
            >
              Ehrenamtliche ({volunteers.length})
            </button>
            <button
              type="button"
              className={`participant-type-tab${activeTab === "partner" ? " active" : ""}`}
              onClick={() => setActiveTab("partner")}
            >
              Kooperationspartner ({partners.length})
            </button>
          </div>

          {/* Pick list */}
          <div className="participant-picker-list">
            {currentList.length === 0 && (
              <div
                className="text-muted"
                style={{ padding: "12px", textAlign: "center" }}
              >
                Keine{" "}
                {activeTab === "volunteer"
                  ? "Ehrenamtlichen"
                  : "Kooperationspartner"}{" "}
                vorhanden
              </div>
            )}
            {currentList.map((entry) => (
              <label key={entry.id} className="participant-pick-item">
                <input
                  type="checkbox"
                  checked={isParticipantSelected(entry.id)}
                  onChange={() => toggleParticipant(entry)}
                />
                {entry.firstName} {entry.lastName}
              </label>
            ))}
          </div>
        </div>

        <div className="new-form-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate("/meetings")}
          >
            Abbrechen
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Speichern..." : isEdit ? "Speichern" : "Erstellen"}
          </button>
        </div>
      </form>
    </div>
  );
}
