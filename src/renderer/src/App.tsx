import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import VolunteerList from "./pages/VolunteerList";
import VolunteerDetail from "./pages/VolunteerDetail";
import VolunteerNew from "./pages/VolunteerNew";
import Settings from "./pages/Settings";
import UpcomingEvents from "./pages/UpcomingEvents";
import ReminderToast from "./components/ReminderToast";
import ConsentDialog from "./components/ConsentDialog";
import AccessPendingOverlay from "./components/AccessPendingOverlay";
import { DueReminder } from "./hooks/useReminders";
import { EncryptionStatus, PRIVACY_POLICY_VERSION } from "@shared/types";

const DATA_FOLDER_CHANGED_EVENT = "vwp:data-folder-changed";

export default function App(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();

  const [liveReminders, setLiveReminders] = useState<DueReminder[]>([]);
  const [consentGiven, setConsentGiven] = useState<boolean | null>(null);
  const [encryptionStatus, setEncryptionStatus] =
    useState<EncryptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshEncryptionStatus = useCallback(async (): Promise<void> => {
    try {
      const status = await window.api.getEncryptionStatus();
      setEncryptionStatus(status);
    } catch {
      setEncryptionStatus(null);
    }
  }, []);

  useEffect(() => {
    // Check if consent has been given
    window.api.getSettings().then((settings) => {
      setConsentGiven(
        settings.privacyConsentGiven &&
          settings.privacyConsentVersion === PRIVACY_POLICY_VERSION,
      );
      setLoading(false);
    });

    refreshEncryptionStatus();

    window.api.onReminderTriggered((reminders) => {
      setLiveReminders((prev) => [...prev, ...(reminders as DueReminder[])]);
    });
    return () => window.api.removeReminderListener();
  }, [refreshEncryptionStatus]);

  useEffect(() => {
    if (consentGiven !== true) return;

    refreshEncryptionStatus();

    const intervalId = window.setInterval(() => {
      refreshEncryptionStatus();
    }, 10000);

    const onFocus = () => {
      refreshEncryptionStatus();
    };
    const onDataFolderChanged = () => {
      refreshEncryptionStatus();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener(DATA_FOLDER_CHANGED_EVENT, onDataFolderChanged);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(
        DATA_FOLDER_CHANGED_EVENT,
        onDataFolderChanged,
      );
    };
  }, [consentGiven, refreshEncryptionStatus]);

  const showAccessPendingOverlay =
    consentGiven === true &&
    encryptionStatus?.hasManifest === true &&
    encryptionStatus.authorized === false &&
    location.pathname !== "/settings";

  const handleConsentAccept = async (): Promise<void> => {
    await window.api.saveSettings({
      privacyConsentGiven: true,
      privacyConsentDate: new Date().toISOString(),
      privacyConsentVersion: PRIVACY_POLICY_VERSION,
    });
    setConsentGiven(true);
  };

  const handleConsentDecline = (): void => {
    // Close the app if consent is declined
    if (
      confirm(
        "Ohne Zustimmung zur Datenschutzerklärung kann die Anwendung nicht genutzt werden.\n\n" +
          "Möchten Sie die Anwendung wirklich schließen?",
      )
    ) {
      window.close();
    }
  };

  const dismissLive = (idx: number): void => {
    setLiveReminders((prev) => prev.filter((_, i) => i !== idx));
  };

  // Show loading state while checking consent
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontSize: "1.2rem",
          color: "#666",
        }}
      >
        Wird geladen...
      </div>
    );
  }

  // Show consent dialog if not yet given
  if (!consentGiven) {
    return (
      <ConsentDialog
        onAccept={handleConsentAccept}
        onDecline={handleConsentDecline}
      />
    );
  }

  return (
    <>
      {liveReminders.length > 0 && (
        <ReminderToast reminders={liveReminders} onDismiss={dismissLive} />
      )}
      {showAccessPendingOverlay && (
        <AccessPendingOverlay
          currentUser={encryptionStatus?.currentUser || ""}
          message={encryptionStatus?.message}
          onOpenSettings={() => navigate("/settings")}
          onRetry={() => {
            refreshEncryptionStatus();
          }}
        />
      )}
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/volunteers" element={<VolunteerList />} />
          <Route path="/volunteers/new" element={<VolunteerNew />} />
          <Route path="/volunteers/:id" element={<VolunteerDetail />} />
          <Route path="/events" element={<UpcomingEvents />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </>
  );
}
