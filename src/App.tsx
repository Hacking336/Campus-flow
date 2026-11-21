import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import { AppShell } from "./components/AppShell";
import { Login } from "./pages/Login";
import { StudentHome } from "./pages/StudentHome";
import { StudentRecords } from "./pages/StudentRecords";
import { Profile } from "./pages/Profile";
import { StaffOverview } from "./pages/staff/Overview";
import { StaffStudents } from "./pages/staff/Students";
import { StudentDetail } from "./pages/staff/StudentDetail";
import { StaffDocuments } from "./pages/staff/Documents";
import { StaffUniforms } from "./pages/staff/Uniforms";
import { StaffInventory } from "./pages/staff/Inventory";
import { StaffAccounts } from "./pages/staff/Accounts";
import { StaffSettings } from "./pages/staff/Settings";
import { Icon } from "./components/Icon";

function Splash() {
  return (
    <div className="splash">
      <span className="brand-mark brand-mark-lg">
        <span className="brand-bar" />
        <span className="brand-bar" />
        <span className="brand-bar" />
      </span>
      <span className="splash-spinner" />
      <p>Loading CampusFlow…</p>
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireStudent({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user && user.role !== "student") return <Navigate to="/staff" replace />;
  return <>{children}</>;
}

function RequireStaff({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "student") return <Navigate to="/" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/staff" replace />;
  return <>{children}</>;
}

function NotFound() {
  const { user } = useAuth();
  return (
    <div className="not-found">
      <span className="not-found-icon">
        <Icon name="search" size={26} />
      </span>
      <h2>Page not found</h2>
      <p>The page you are looking for does not exist or was moved.</p>
      <a className="btn btn-primary" href={user?.role === "student" || !user ? "/" : "/staff"}>
        Go back home
      </a>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                element={
                  <RequireAuth>
                    <AppShell />
                  </RequireAuth>
                }
              >
                <Route
                  index
                  element={
                    <RequireStudent>
                      <StudentHome />
                    </RequireStudent>
                  }
                />
                <Route
                  path="records"
                  element={
                    <RequireStudent>
                      <StudentRecords />
                    </RequireStudent>
                  }
                />
                <Route path="profile" element={<Profile />} />

                <Route
                  path="staff"
                  element={
                    <RequireStaff>
                      <StaffOverview />
                    </RequireStaff>
                  }
                />
                <Route
                  path="staff/students"
                  element={
                    <RequireStaff>
                      <StaffStudents />
                    </RequireStaff>
                  }
                />
                <Route
                  path="staff/students/:studentNo"
                  element={
                    <RequireStaff>
                      <StudentDetail />
                    </RequireStaff>
                  }
                />
                <Route
                  path="staff/documents"
                  element={
                    <RequireStaff roles={["registrar", "admin"]}>
                      <StaffDocuments />
                    </RequireStaff>
                  }
                />
                <Route
                  path="staff/uniforms"
                  element={
                    <RequireStaff roles={["custodian", "admin"]}>
                      <StaffUniforms />
                    </RequireStaff>
                  }
                />
                <Route
                  path="staff/inventory"
                  element={
                    <RequireStaff roles={["custodian", "admin"]}>
                      <StaffInventory />
                    </RequireStaff>
                  }
                />
                <Route
                  path="staff/accounts"
                  element={
                    <RequireStaff roles={["admin"]}>
                      <StaffAccounts />
                    </RequireStaff>
                  }
                />
                <Route
                  path="staff/settings"
                  element={
                    <RequireStaff roles={["admin"]}>
                      <StaffSettings />
                    </RequireStaff>
                  }
                />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
