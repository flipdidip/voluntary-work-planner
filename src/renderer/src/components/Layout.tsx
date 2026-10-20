import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Settings,
  Calendar,
  Handshake,
  Users2,
  MessagesSquare,
  Phone,
  Megaphone,
} from "lucide-react";
import { ReactNode } from "react";
import { UserRole } from "@shared/types";
import "./Layout.css";

interface LayoutProps {
  children: ReactNode;
  settingsBadgeCount?: number;
  /** Current user’s authorization role. Defaults to "primary" (full access). */
  userRole?: UserRole;
}

const navItems = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    primaryOnly: true,
  },
  {
    to: "/events",
    label: "Ereignisse",
    icon: Calendar,
    primaryOnly: true,
  },
  { to: "/volunteers", label: "Ehrenamtliche", icon: Users, primaryOnly: true },
  {
    to: "/volunteer-contacts",
    label: "Ehrenamtliche Kontakte",
    icon: Phone,
    primaryOnly: true,
    partnerOnly: true,
  },
  {
    to: "/meetings",
    label: "Gruppen Treffen",
    icon: MessagesSquare,
    primaryOnly: true,
  },
  {
    to: "/hauptamtliche",
    label: "Hauptamtliche",
    icon: Users,
    primaryOnly: true,
  },
  {
    to: "/partners",
    label: "Kooperationspartner",
    icon: Handshake,
    primaryOnly: false,
  },
  {
    to: "/public-relations",
    label: "Öffentlichkeitsarbeit",
    icon: Megaphone,
    primaryOnly: true,
    publicRelationsOnly: true,
  },
  {
    to: "/intern-overview",
    label: "Interne Übersicht",
    icon: Users,
    primaryOnly: true,
    internOnly: true,
  },
  {
    to: "/settings",
    label: "Einstellungen",
    icon: Settings,
    primaryOnly: false,
  },
];

export default function Layout({
  children,
  settingsBadgeCount = 0,
  userRole = "primary",
}: LayoutProps): JSX.Element {
  const visibleNavItems =
    userRole === "public-relations"
      ? navItems.filter(
          (item) =>
            item.to === "/settings" ||
            ("publicRelationsOnly" in item && item.publicRelationsOnly === true),
        )
      : userRole === "intern-read-only"
      ? navItems.filter(
          (item) =>
            item.to === "/settings" ||
            ("internOnly" in item && item.internOnly === true),
        )
      : userRole === "partner-only"
      ? navItems.filter(
          (item) =>
            !item.primaryOnly ||
            ("partnerOnly" in item && item.partnerOnly === true),
        )
      : navItems.filter(
          (item) =>
            !("partnerOnly" in item && item.partnerOnly === true) &&
            !("publicRelationsOnly" in item && item.publicRelationsOnly) &&
            !("internOnly" in item && item.internOnly),
        );
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img
            src="app-icon.ico"
            alt="App Icon"
            width={22}
            height={22}
            className="logo-icon"
          />
          <span>
            Ehrenamt
            <br />
            <small>Verwaltung</small>
          </span>
        </div>
        <nav className="sidebar-nav">
          {visibleNavItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `nav-item ${isActive ? "nav-item--active" : ""}`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
              {to === "/settings" && settingsBadgeCount > 0 && (
                <span
                  className="nav-badge"
                  aria-label="Offene Zugriffsanfragen"
                >
                  {settingsBadgeCount > 99 ? "99+" : settingsBadgeCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="version-label">
            v{typeof APP_VERSION !== "undefined" ? APP_VERSION : "0.1.0"}
          </span>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}

// Vite injects this at build time via define config
declare const APP_VERSION: string;
