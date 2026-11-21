import { useEffect, useState } from "react";
import { useApi } from "../../lib/useApi";
import { useToast } from "../../context/ToastContext";
import { api, ApiError } from "../../lib/api";
import type { SettingsMap } from "../../lib/types";
import { Field, PageError, Spinner, Toggle } from "../../components/ui";
import { Icon } from "../../components/Icon";

interface SettingsResponse {
  settings: SettingsMap;
}

export function StaffSettings() {
  const { notify } = useToast();
  const { data, error, loading, reload } = useApi<SettingsResponse>("/settings");
  const [schoolYear, setSchoolYear] = useState("");
  const [semester, setSemester] = useState("");
  const [officeHours, setOfficeHours] = useState("");
  const [pickupNote, setPickupNote] = useState("");
  const [defaultPassword, setDefaultPassword] = useState("");
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [tailoringOpen, setTailoringOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setSchoolYear(data.settings.school_year ?? "");
    setSemester(data.settings.semester ?? "");
    setOfficeHours(data.settings.office_hours ?? "");
    setPickupNote(data.settings.pickup_note ?? "");
    setDefaultPassword(data.settings.default_student_password ?? "");
    setRegistrationOpen(data.settings.allow_student_registration === "1");
    setTailoringOpen(data.settings.tailoring_open === "1");
  }, [data]);

  if (loading && !data) return <Spinner label="Loading settings" />;
  if (error) return <PageError message={error} onRetry={reload} />;
  if (!data) return null;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaveError(null);
    setSaving(true);
    try {
      await api("/settings", {
        method: "PATCH",
        body: JSON.stringify({
          school_year: schoolYear,
          semester,
          office_hours: officeHours,
          pickup_note: pickupNote,
          default_student_password: defaultPassword,
          allow_student_registration: registrationOpen,
          tailoring_open: tailoringOpen,
        }),
      });
      notify("Settings saved.");
      reload();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="page-stack" onSubmit={save}>
      <section className="card">
        <div className="card-head">
          <div>
            <h2>School information</h2>
            <p>Shown on the sign-in screen and student pages.</p>
          </div>
          <span className="mini-icon">
            <Icon name="graduation" size={16} />
          </span>
        </div>
        <div className="form-row form-row-3">
          <Field label="School year" htmlFor="school-year">
            <input id="school-year" value={schoolYear} onChange={(event) => setSchoolYear(event.target.value)} />
          </Field>
          <Field label="Semester" htmlFor="semester">
            <input id="semester" value={semester} onChange={(event) => setSemester(event.target.value)} />
          </Field>
          <Field label="Office hours" htmlFor="office-hours">
            <input id="office-hours" value={officeHours} onChange={(event) => setOfficeHours(event.target.value)} />
          </Field>
        </div>
        <Field
          label="Pick-up reminder"
          htmlFor="pickup-note"
          hint="Students see this on their home page before visiting the campus."
        >
          <textarea
            id="pickup-note"
            rows={2}
            value={pickupNote}
            onChange={(event) => setPickupNote(event.target.value)}
            maxLength={240}
          />
        </Field>
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Student accounts</h2>
            <p>How students receive a login for CampusFlow.</p>
          </div>
          <span className="mini-icon">
            <Icon name="users" size={16} />
          </span>
        </div>

        <Toggle
          label="Allow student self-registration"
          description="Students can create an account with a student number that is already on the roster."
          checked={registrationOpen}
          onChange={setRegistrationOpen}
        />

        <div className="settings-split">
          <Field
            label="Default student password"
            htmlFor="default-password"
            hint="Used when importing students with logins, or when creating one from a student record."
          >
            <input
              id="default-password"
              value={defaultPassword}
              onChange={(event) => setDefaultPassword(event.target.value)}
              minLength={6}
              required
            />
          </Field>
          <div className="info-banner compact">
            <Icon name="info" size={18} />
            <div>
              <strong>Recommended onboarding</strong>
              <p>
                Import the registrar's list from Students → Import list with “Create logins” ticked. Records always
                stay linked to the student number, and students can change their password after signing in.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Tailoring availability</h2>
            <p>Whether the Property Office accepts new general and nursing uniform orders.</p>
          </div>
          <span className={`live-dot ${tailoringOpen ? "is-on" : ""}`} />
        </div>
        <Toggle
          label={tailoringOpen ? "Accepting new tailoring orders" : "Tailoring is closed"}
          description="Existing orders in queue, being sewn, or finished are not affected."
          checked={tailoringOpen}
          onChange={setTailoringOpen}
        />
      </section>

      {saveError ? (
        <div className="alert alert-error" role="alert">
          <Icon name="alert" size={17} />
          <span>{saveError}</span>
        </div>
      ) : null}

      <div className="settings-save">
        <span className="muted small">Changes apply immediately to student and staff views.</span>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          <Icon name="check" size={16} />
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
