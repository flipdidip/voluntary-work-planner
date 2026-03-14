import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import VolunteerList from "./pages/VolunteerList";
import VolunteerDetail from "./pages/VolunteerDetail";
import VolunteerNew from "./pages/VolunteerNew";
import Settings from "./pages/Settings";
import UpcomingEvents from "./pages/UpcomingEvents";
import ReminderToast from "./components/ReminderToast";
import ConsentDialog from "./components/ConsentDialog";
import { DueReminder } from "./hooks/useReminders";
import { PRIVACY_POLICY_VERSION } from "@shared/types";

export default function App(): JSX.Element {
  const [liveReminders, setLiveReminders] = useState<DueReminder[]>([]);
  const [consentGiven, setConsentGiven] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if consent has been given
    window.api.getSettings().then((settings) => {
      setConsentGiven(
        settings.privacyConsentGiven &&
          settings.privacyConsentVersion === PRIVACY_POLICY_VERSION,
      );
      setLoading(false);
    });

    window.api.onReminderTriggered((reminders) => {
      setLiveReminders((prev) => [...prev, ...(reminders as DueReminder[])]);
    });
    return () => window.api.removeReminderListener();
  }, []);

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
