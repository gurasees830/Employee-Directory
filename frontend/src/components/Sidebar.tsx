import type { ReactNode } from "react";
import type { Admin } from "../api/auth";
import type { Screen, Tab } from "../types";
import Avatar from "./Avatar";
import { HomeIcon, LogoutIcon, MessageIcon, MoonIcon, OrgIcon, PanelIcon, SunIcon, UsersIcon } from "./Icons";
import Logo from "./Logo";

interface Props {
  screen: Screen;
  tab: Tab;
  total: number | null;
  collapsed: boolean;
  theme: "light" | "dark";
  admin: Admin;
  onNavigate: (screen: Screen, tab?: Tab) => void;
  onToggleCollapsed: () => void;
  onToggleTheme: () => void;
  onReport: () => void;
  onSignOut: () => void;
}

function NavItem({
  icon,
  label,
  active,
  badge,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  badge?: ReactNode;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        className={`nav-item ${active ? "is-active" : ""}`}
        aria-current={active ? "page" : undefined}
        onClick={onClick}
        title={label}
      >
        {icon}
        <span className="nav-label">{label}</span>
        {badge !== undefined && <span className="nav-badge">{badge}</span>}
      </button>
    </li>
  );
}

function Sidebar(props: Props) {
  const { screen, tab, total, collapsed, theme, admin } = props;
  const { onNavigate, onToggleCollapsed, onToggleTheme, onReport, onSignOut } = props;
  return (
    <aside className={`side ${collapsed ? "is-collapsed" : ""}`}>
      <div className="side-head">
        <Logo compact={collapsed} />
        <button
          type="button"
          className="icon-btn side-collapse"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <PanelIcon size={18} />
        </button>
      </div>

      <nav className="side-nav" aria-label="Main">
        <p className="nav-heading">Main menu</p>
        <ul>
          <NavItem
            icon={<HomeIcon size={19} />}
            label="Dashboard"
            active={screen === "dashboard"}
            onClick={() => onNavigate("dashboard")}
          />
        </ul>

        <p className="nav-heading">Organisation</p>
        <ul>
          <NavItem
            icon={<UsersIcon size={19} />}
            label="Employees"
            active={screen === "employees" && tab !== "org"}
            badge={total ?? undefined}
            onClick={() => onNavigate("employees", tab === "org" ? "directory" : tab)}
          />
          <NavItem
            icon={<OrgIcon size={19} />}
            label="Org chart"
            active={screen === "employees" && tab === "org"}
            onClick={() => onNavigate("employees", "org")}
          />
        </ul>
      </nav>

      <div className="side-foot">
        <button type="button" className="nav-item" onClick={onReport} title="Report an issue">
          <MessageIcon size={19} />
          <span className="nav-label">Report an issue</span>
        </button>
        <button type="button" className="nav-item" onClick={onToggleTheme} title="Switch theme">
          {theme === "dark" ? <SunIcon size={19} /> : <MoonIcon size={19} />}
          <span className="nav-label">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </button>
        <p className="side-hint">
          <kbd>/</kbd> search · <kbd>N</kbd> new employee
        </p>
        <div className="side-user">
          <Avatar name={admin.name} size="sm" />
          <span className="side-user-text">
            <span className="side-user-name">{admin.name}</span>
            <span className="side-user-email">{admin.email}</span>
          </span>
          <button type="button" className="icon-btn" onClick={onSignOut} aria-label="Sign out" title="Sign out">
            <LogoutIcon size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
