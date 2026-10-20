import { useState } from "react";
import { Upload, X } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { FileRecord } from "@shared/types";

interface AkteRecordFormProps {
  volunteerId: string;
  initialRecord?: FileRecord | null;
  onSave: (record: FileRecord) => void;
  onClose: () => void;
}

export default function AkteRecordForm({
  volunteerId,
  initialRecord,
  onSave,
  onClose,
}: AkteRecordFormProps): JSX.Element {
  const [title, setTitle] = useState(initialRecord?.title || "");
  const [description, setDescription] = useState(
    initialRecord?.description || "",
  );
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [removeExistingFile, setRemoveExistingFile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectFile = async (): Promise<void> => {
    setError(null);
    try {
      const filePath = await window.api.selectFile();
      if (filePath) {
        setSelectedFilePath(filePath);
        setRemoveExistingFile(false);
      }
    } catch (selectError) {
      setError(String(selectError));
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!title.trim()) return;

    setUploading(true);
    setError(null);
    try {
      let fileName = removeExistingFile ? undefined : initialRecord?.fileName;
      let filePath = removeExistingFile ? undefined : initialRecord?.filePath;
      let fileSize = removeExistingFile ? undefined : initialRecord?.fileSize;

      if (selectedFilePath) {
        const uploadResult = await window.api.uploadFile(
          volunteerId,
          selectedFilePath,
        );
        if (!uploadResult.success) {
          setError(uploadResult.error || "Die Datei konnte nicht hochgeladen werden.");
          return;
        }

        fileName = uploadResult.fileName;
        filePath = uploadResult.filePath;
        fileSize = uploadResult.fileSize;
      }

      onSave({
        ...initialRecord,
        id: initialRecord?.id || uuidv4(),
        title: title.trim(),
        description: description.trim(),
        fileName,
        filePath,
        fileSize,
        uploadedAt: initialRecord?.uploadedAt || new Date().toISOString(),
      });
      onClose();
    } catch (saveError) {
      setError(String(saveError));
    } finally {
      setUploading(false);
    }
  };

  const selectedFileName = selectedFilePath?.split(/[\\/]/).pop();

  return (
    <div className="file-record-form card">
      <div className="file-record-form-header">
        <h3>{initialRecord ? "Akte-Eintrag bearbeiten" : "Neues Dokument"}</h3>
        <button className="btn btn-ghost" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <label>
        Titel *
        <input
          className="input"
          placeholder="Titel des Eintrags"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>

      <label>
        Beschreibung
        <textarea
          className="textarea"
          placeholder="Optionale Beschreibung..."
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>

      <label>
        Datei (optional)
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            className="btn btn-secondary"
            onClick={() => void handleSelectFile()}
            type="button"
          >
            <Upload size={15} /> Datei auswählen
          </button>
          {selectedFileName && <span>{selectedFileName}</span>}
          {!selectedFileName && initialRecord?.fileName && !removeExistingFile && (
            <span>{initialRecord.fileName}</span>
          )}
          {initialRecord?.filePath && (
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => setRemoveExistingFile((value) => !value)}
            >
              {removeExistingFile ? "Anhang behalten" : "Anhang entfernen"}
            </button>
          )}
        </div>
      </label>

      {error && (
        <p className="error-msg" role="alert">
          {error}
        </p>
      )}

      <div className="file-record-form-actions">
        <button
          className="btn btn-secondary"
          onClick={onClose}
          disabled={uploading}
        >
          Abbrechen
        </button>
        <button
          className="btn btn-primary"
          onClick={() => void handleSave()}
          disabled={uploading || !title.trim()}
        >
          <Upload size={15} />
          {uploading ? "Hochladen..." : initialRecord ? "Änderungen übernehmen" : "Hinzufügen"}
        </button>
      </div>
    </div>
  );
}
