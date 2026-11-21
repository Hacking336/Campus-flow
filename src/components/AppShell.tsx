import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { roleLabel } from "../lib/format";
import { Avatar } from "./ui";
import { Icon } from "./Icon";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
  roles?: string[];
}

const studentNav: NavItem[] = [
  { to: "/", label: "Home", icon: "home", end: true },
  { to: "/records", label: "My records", icon: "file" },
];

const studentUtilityNav: NavItem[] = [{ to: "/profile", label: "Profile", icon: "user" }];

const staffNav: NavItem[] = [
  { to: "/staff", label: "Overview", icon: "home", end: true },
  { to: "/staff/students", label: "Students", icon: "users" },
  { to: "/staff/documents", label: "Document records", icon: "file", roles: ["registrar", "admin"] },
  { to: "/staff/uniforms", label: "Uniform orders", icon: "shirt", roles: ["custodian", "admin"] },
  { to: "/staff/inventory", label: "PE inventory", icon: "box", roles: ["custodian", "admin"] },
];

const staffUtilityNav: NavItem[] = [
  { to: "/profile", label: "Profile", icon: "user" },
  { to: "/staff/accounts", label: "Accounts", icon: "idCard", roles: ["admin"] },
  { to: "/staff/settings", label: "Settings", icon: "settings", roles: ["admin"] },
];

const TITLES: Record<string, { title: string; subtitle?: string }> = {
  "/": { title: "Home", subtitle: "Everything ready for pick-up, in one place" },
  "/records": { title: "My records", subtitle: "Your document requests and uniform orders" },
  "/profile": { title: "Profile", subtitle: "Manage your details, photo and password" },
  "/staff": { title: "Overview", subtitle: "Today's pick-up counters and office activity" },
  "/staff/students": { title: "Students", subtitle: "Search a student number and manage their records" },
  "/staff/documents": { title: "Document records", subtitle: "Update and release registrar documents" },
  "/staff/uniforms": { title: "Uniform orders", subtitle: "Track PE, general and nursing uniform orders" },
  "/staff/inventory": { title: "PE inventory", subtitle: "Stock per size and tailoring availability" },
  "/staff/accounts": { title: "Accounts", subtitle: "Staff logins and student account access" },
  "/staff/settings": { title: "Settings", subtitle: "School info, registration and pick-up notes" },
};

function titleFor(pathname: string) {
  if (pathname.startsWith("/staff/students/")) return { title: "Student record", subtitle: "Documents, uniforms and account status" };
  const exact = TITLES[pathname];
  if (exact) return exact;
  if (pathname.startsWith("/staff/students")) return TITLES["/staff/students"];
  return { title: "CampusFlow" };
}

export function AppShell() {
  const { user, logout } = useAuth();
  const { preference, setPreference, resolved } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const isStaff = user?.role !== "student";
  const items = (isStaff ? staffNav : studentNav).filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );
  const utilityItems = (isStaff ? staffUtilityNav : studentUtilityNav).filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );
  const baseMeta = titleFor(location.pathname);
  // A student record only shows the caller's own desk, so name it accordingly.
  const meta =
    location.pathname.startsWith("/staff/students/") && user?.role !== "admin"
      ? {
          ...baseMeta,
          subtitle:
            user?.role === "registrar" ? "Document records and account status" : "Uniform orders and account status",
        }
      : baseMeta;

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // ⌘K / Ctrl+K jumps to the student search from any staff page. The top bar
  // search is hidden on small screens, so there it opens the Students page,
  // whose own search field takes focus.
  useEffect(() => {
    if (!isStaff) return undefined;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      const input = searchRef.current;
      if (input && input.offsetParent) {
        input.focus();
        input.select();
      } else {
        navigate("/staff/students");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isStaff, navigate]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
    return undefined;
  }, [menuOpen]);

  const sidebar = (
    <>
      <Link to={isStaff ? "/staff" : "/"} className="brand" onClick={() => setMenuOpen(false)}>
        <span className="brand-mark">
          <span className="brand-bar" />
          <span className="brand-bar" />
          <span className="brand-bar" />
        </span>
        <span className="brand-text">
          <strong>CampusFlow</strong>
          <small>Pick-up tracker</small>
        </span>
      </Link>

      <nav className="side-nav" aria-label="Main navigation">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-link ${isActive ? "is-active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            <Icon name={item.icon} size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="side-footer">
        {utilityItems.length > 0 ? (
          <nav className="side-nav side-nav-secondary" aria-label="Preferences and account">
            {utilityItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-link ${isActive ? "is-active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        ) : null}

        <div className="theme-switch" role="group" aria-label="Color theme">
          {(["light", "dark", "system"] as const).map((option) => (
            <button
              key={option}
              type="button"
              className={`theme-option ${preference === option ? "is-active" : ""}`}
              onClick={() => setPreference(option)}
              title={option === "system" ? "Follow system theme" : `${option[0].toUpperCase()}${option.slice(1)} theme`}
              aria-pressed={preference === option}
            >
              <Icon name={option === "light" ? "sun" : option === "dark" ? "moon" : "monitor"} size={15} />
              <span>{option === "system" ? "Auto" : option === "light" ? "Light" : "Dark"}</span>
            </button>
          ))}
        </div>

        {user ? (
          <button type="button" className="nav-link side-signout" onClick={() => logout()}>
            <Icon name="logout" size={18} />
            <span>Sign out</span>
          </button>
        ) : null}
      </div>
    </>
  );

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "is-open" : ""}`}>{sidebar}</aside>
      {menuOpen ? <button type="button" className="sidebar-backdrop" aria-label="Close menu" onClick={() => setMenuOpen(false)} /> : null}

      <div className="app-main">
        <header className="topbar">
          <button type="button" className="icon-btn menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Icon name="menu" size={20} />
          </button>
          {isStaff ? (
            <form
              className="topbar-search"
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                navigate(`/staff/students?q=${encodeURIComponent(query.trim())}`);
              }}
            >
              <Icon name="search" size={17} />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search students"
                aria-label="Search students"
              />
              <kbd>⌘K</kbd>
            </form>
          ) : null}
          {isStaff ? (
            <Link to="/staff/students" className="icon-btn topbar-search-btn" aria-label="Search students">
              <Icon name="search" size={18} />
            </Link>
          ) : null}

          <div className="topbar-actions">
            <button
              type="button"
              className="icon-btn"
              onClick={() => setPreference(resolved === "dark" ? "light" : "dark")}
              aria-label="Toggle dark mode"
              title="Toggle dark mode"
            >
              <Icon name={resolved === "dark" ? "sun" : "moon"} size={18} />
            </button>
            {user ? (
              // Identity only: the Profile page is reached from the sidebar,
              // so this chip stays put instead of acting as a shortcut.
              <div className="topbar-user">
                <Avatar name={user.full_name} src={user.avatar} size={36} />
                <span className="topbar-user-copy">
                  <strong>{user.full_name}</strong>
                  <small>{roleLabel(user.role)}</small>
                </span>
              </div>
            ) : null}
          </div>
        </header>

        <main className={`content ${location.pathname === "/staff" ? "content-dashboard" : ""}`}>
          <header className="page-heading">
            <h1>{meta.title}</h1>
            {meta.subtitle ? <p>{meta.subtitle}</p> : null}
          </header>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
