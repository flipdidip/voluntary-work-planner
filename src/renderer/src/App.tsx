import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import VolunteerList from "./pages/VolunteerList";
import VolunteerDetail from "./pages/VolunteerDetail";
import VolunteerNew from "./pages/VolunteerNew";
import Settings from "./pages/Settings";
import ReminderToast from "./components/ReminderToast";
import { DueReminder } from "./hooks/useReminders";

export default function App(): JSX.Element {
  const [liveReminders, setLiveReminders] = useState<DueReminder[]>([]);

  useEffect(() => {
    window.api.onReminderTriggered((reminders) => {
      setLiveReminders((prev) => [...prev, ...(reminders as DueReminder[])]);
    });
    return () => window.api.removeReminderListener();
  }, []);

  const dismissLive = (idx: number): void => {
    setLiveReminders((prev) => prev.filter((_, i) => i !== idx));
  };

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
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </>
  );
}
