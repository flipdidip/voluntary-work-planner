import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, Settings, Bell, Calendar } from "lucide-react";
import { ReactNode } from "react";
import "./Layout.css";

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/events", label: "Ereignisse", icon: Calendar },
  { to: "/volunteers", label: "Ehrenamtliche", icon: Users },
  { to: "/settings", label: "Einstellungen", icon: Settings },
];

export default function Layout({ children }: LayoutProps): JSX.Element {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Bell size={22} className="logo-icon" />
          <span>
            Ehrenamt
            <br />
            <small>Verwaltung</small>
          </span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `nav-item ${isActive ? "nav-item--active" : ""}`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
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
