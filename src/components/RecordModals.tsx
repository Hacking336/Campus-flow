import { useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "../lib/api";
import { useApi } from "../lib/useApi";
import { useToast } from "../context/ToastContext";
import { DOC_TYPES, nowInputTime, todayInput } from "../lib/format";
import type { DocumentRecord, Student, StudentWithCounts, UniformOrder } from "../lib/types";
import { Avatar, EmptyState, Field, Modal, Spinner } from "./ui";
import { Icon } from "./Icon";

const DOC_STATUSES = ["requested", "processing", "ready", "claimed", "cancelled"] as const;
const UNIFORM_STATUSES = ["ordered", "ready", "claimed", "cancelled"] as const;
/* P.E. Pants and P.E. Shirt have their own size lists. */
const PE_ITEM_SIZES: Record<"Pants" | "Shirt", string[]> = {
  Pants: ["S", "M", "L", "XL", "2XL", "3XL"],
  Shirt: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
};

function sizeRangeLabel(item: "Pants" | "Shirt") {
  const sizes = PE_ITEM_SIZES[item];
  return `${sizes[0]}–${sizes[sizes.length - 1]}`;
}

function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="alert alert-error" role="alert">
      <Icon name="alert" size={17} />
      <span>{message}</span>
    </div>
  );
}

interface DocumentModalProps {
  studentNo: string;
  studentName?: string;
  /** Documents are tracked, not requested: this form only corrects an existing record. */
  record: DocumentRecord;
  onClose: () => void;
  onSaved: () => void;
}

export function DocumentModal({ studentNo, studentName, record, onClose, onSaved }: DocumentModalProps) {
  const { notify } = useToast();
  const [docType, setDocType] = useState(record.doc_type);
  const [status, setStatus] = useState(record.status);
  const [dateRequested, setDateRequested] = useState(record.date_requested ?? todayInput());
  const [dateReady, setDateReady] = useState(record.date_ready ?? "");
  const [remarks, setRemarks] = useState(record.remarks ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const body = {
        doc_type: docType,
        status,
        date_requested: dateRequested || null,
        date_ready: dateReady || null,
        remarks,
      };
      await api(`/documents/${record.id}`, { method: "PATCH", body: JSON.stringify(body) });
      notify(`${docType} updated.`);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this document.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Update document record"
      subtitle={[studentName, studentNo].filter(Boolean).join(" · ")}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="document-form" className="btn btn-primary" disabled={saving}>
            <Icon name="check" size={16} />
            {saving ? "Saving…" : "Save changes"}
          </button>
        </>
      }
    >
      <form id="document-form" className="form-stack" onSubmit={submit}>
        <div className="form-row">
          <Field label="Document type" htmlFor="doc-type">
            <select id="doc-type" value={docType} onChange={(event) => setDocType(event.target.value)}>
              {DOC_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status" htmlFor="doc-status">
            <select
              id="doc-status"
              value={status}
              onChange={(event) => {
                const next = event.target.value as (typeof DOC_STATUSES)[number];
                setStatus(next);
                if (["ready", "claimed"].includes(next) && !dateReady) setDateReady(todayInput());
              }}
            >
              {DOC_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value === "ready" ? "Ready for pick-up" : value[0].toUpperCase() + value.slice(1)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="status-shortcuts">
          <span>Quick set:</span>
          {(["requested", "processing", "ready", "claimed"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={`chip ${status === value ? "is-active" : ""}`}
              onClick={() => {
                setStatus(value);
                if (["ready", "claimed"].includes(value) && !dateReady) setDateReady(todayInput());
              }}
            >
              {value === "ready" ? "Ready" : value[0].toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>

        <div className="form-row">
          <Field label="Date requested" htmlFor="doc-requested">
            <input
              id="doc-requested"
              type="date"
              value={dateRequested}
              onChange={(event) => setDateRequested(event.target.value)}
            />
          </Field>
          <Field label="Date ready" htmlFor="doc-ready" hint="Filled automatically when marked ready.">
            <input id="doc-ready" type="date" value={dateReady} onChange={(event) => setDateReady(event.target.value)} />
          </Field>
        </div>

        <Field label="Remarks" htmlFor="doc-remarks" hint="Example: “Bring ID” or “Pick-up until Oct 30”.">
          <textarea
            id="doc-remarks"
            rows={3}
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            placeholder="Notes the student should see before visiting the office"
            maxLength={500}
          />
        </Field>

        <ErrorNote message={error} />
        {record ? (
          <p className="modal-meta">
            Encoded by <strong>{record.encoded_by}</strong>
            {record.updated_by ? (
              <>
                {" "}
                · last updated by <strong>{record.updated_by}</strong>
              </>
            ) : null}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}

interface UniformModalProps {
  studentNo: string;
  studentName?: string;
  /** Uniforms are tracked, not ordered: this form only corrects an existing record. */
  record: UniformOrder;
  onClose: () => void;
  onSaved: () => void;
}

export function UniformModal({ studentNo, studentName, record, onClose, onSaved }: UniformModalProps) {
  const { notify } = useToast();
  const [category, setCategory] = useState<"PE" | "General" | "Nursing">(record.category);
  const [item, setItem] = useState<"Pants" | "Shirt">((record.item as "Pants" | "Shirt") ?? "Shirt");
  const [size, setSize] = useState(record.size ?? "M");
  const [status, setStatus] = useState(record.status);
  const [tailoring, setTailoring] = useState(record.tailoring_status ?? "queued");
  const [dateOrdered, setDateOrdered] = useState(record.date_ordered ?? todayInput());
  const [timeOrdered, setTimeOrdered] = useState(record.time_ordered ?? nowInputTime());
  const [remarks, setRemarks] = useState(record.remarks ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isPE = category === "PE";
  const sizeOptions = isPE ? PE_ITEM_SIZES[item] : [];

  function pickItem(next: "Pants" | "Shirt") {
    setItem(next);
    if (!PE_ITEM_SIZES[next].includes(size)) {
      setSize(PE_ITEM_SIZES[next].includes("M") ? "M" : PE_ITEM_SIZES[next][0]);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const body = {
        category,
        item: isPE ? item : null,
        size: isPE ? size : null,
        status,
        tailoring_status: isPE ? null : tailoring,
        date_ordered: dateOrdered,
        time_ordered: timeOrdered,
        remarks,
      };
      await api(`/uniforms/${record.id}`, { method: "PATCH", body: JSON.stringify(body) });
      notify("Uniform order updated.");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this uniform order.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Update uniform order"
      subtitle={[studentName, studentNo].filter(Boolean).join(" · ")}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="uniform-form" className="btn btn-primary" disabled={saving}>
            <Icon name="check" size={16} />
            {saving ? "Saving…" : "Save changes"}
          </button>
        </>
      }
    >
      <form id="uniform-form" className="form-stack" onSubmit={submit}>
        <div className="field">
          <span className="field-label">Uniform type</span>
          <div className="segmented-control" role="group" aria-label="Uniform type">
            {(["PE", "General", "Nursing"] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={category === value ? "is-active" : ""}
                onClick={() => setCategory(value)}
              >
                {value === "PE" ? "P.E." : value}
              </button>
            ))}
          </div>
          <span className="field-hint">
            {isPE
              ? "PE uniforms are tracked per piece and per size."
              : "General and Nursing uniforms have no size; track them through tailoring."}
          </span>
        </div>

        {isPE ? (
          <>
            <div className="field">
              <span className="field-label">P.E. item</span>
              <div className="segmented-control" role="group" aria-label="P.E. item">
                {(["Shirt", "Pants"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={item === value ? "is-active" : ""}
                    onClick={() => pickItem(value)}
                  >
                    {value === "Shirt" ? "P.E. Shirt" : "P.E. Pants"}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <span className="field-label">Size ({sizeRangeLabel(item)})</span>
              <div className="chip-row" role="group" aria-label="Size">
                {sizeOptions.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`chip ${size === value ? "is-active" : ""}`}
                    onClick={() => setSize(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <span className="field-hint">
                {item === "Pants"
                  ? "P.E. Pants come in S to 3XL."
                  : "P.E. Shirt comes in XS to 3XL."}
              </span>
            </div>
          </>
        ) : (
          <Field label="Tailoring status" htmlFor="uniform-tailoring">
            <select
              id="uniform-tailoring"
              value={tailoring}
              onChange={(event) => setTailoring(event.target.value as typeof tailoring)}
            >
              <option value="queued">In queue</option>
              <option value="sewing">Being sewn</option>
              <option value="finished">Sewing finished</option>
            </select>
          </Field>
        )}

        <div className="form-row form-row-3">
          <Field label="Order status" htmlFor="uniform-status">
            <select
              id="uniform-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as typeof status)}
            >
              {UNIFORM_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value === "ready" ? "Ready for pick-up" : value[0].toUpperCase() + value.slice(1)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date ordered" htmlFor="uniform-date">
            <input
              id="uniform-date"
              type="date"
              value={dateOrdered}
              onChange={(event) => setDateOrdered(event.target.value)}
              required
            />
          </Field>
          <Field label="Time" htmlFor="uniform-time">
            <input
              id="uniform-time"
              type="time"
              value={timeOrdered}
              onChange={(event) => setTimeOrdered(event.target.value)}
            />
          </Field>
        </div>

        <div className="status-shortcuts">
          <span>Quick set:</span>
          {(["ordered", "ready", "claimed"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={`chip ${status === value ? "is-active" : ""}`}
              onClick={() => setStatus(value)}
            >
              {value === "ready" ? "Ready" : value[0].toUpperCase() + value.slice(1)}
            </button>
          ))}
          {!isPE
            ? (["queued", "sewing", "finished"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`chip chip-soft ${tailoring === value ? "is-active" : ""}`}
                  onClick={() => setTailoring(value)}
                >
                  {value === "queued" ? "Queue" : value === "sewing" ? "Sewing" : "Finished"}
                </button>
              ))
            : null}
        </div>

        <Field label="Remarks" htmlFor="uniform-remarks" hint="Example: “For PE class Friday” or “Name printed at the back”.">
          <textarea
            id="uniform-remarks"
            rows={3}
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            placeholder="Notes the student should see before claiming"
            maxLength={500}
          />
        </Field>

        <ErrorNote message={error} />
        {record ? (
          <p className="modal-meta">
            Encoded by <strong>{record.encoded_by}</strong>
            {record.updated_by ? (
              <>
                {" "}
                · last updated by <strong>{record.updated_by}</strong>
              </>
            ) : null}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}

interface UniformOrderModalProps {
  onClose: () => void;
  onSaved: () => void;
}

/** Takes an order at the Property Office counter for a student already on the list. */
export function UniformOrderModal({ onClose, onSaved }: UniformOrderModalProps) {
  const { notify } = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentWithCounts[]>([]);
  const [searching, setSearching] = useState(false);
  const [student, setStudent] = useState<StudentWithCounts | null>(null);
  const [category, setCategory] = useState<"PE" | "General" | "Nursing">("PE");
  const [item, setItem] = useState<"Pants" | "Shirt">("Shirt");
  const [size, setSize] = useState("M");
  const [tailoring, setTailoring] = useState("queued");
  const [dateOrdered, setDateOrdered] = useState(todayInput());
  const [timeOrdered, setTimeOrdered] = useState(nowInputTime());
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isPE = category === "PE";
  const sizeOptions = isPE ? PE_ITEM_SIZES[item] : [];

  useEffect(() => {
    if (student) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const data = await api<{ students: StudentWithCounts[] }>(`/students?q=${encodeURIComponent(q)}`);
        setResults(data.students.slice(0, 6));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, student]);

  function pickItem(next: "Pants" | "Shirt") {
    setItem(next);
    if (!PE_ITEM_SIZES[next].includes(size)) {
      setSize(PE_ITEM_SIZES[next].includes("M") ? "M" : PE_ITEM_SIZES[next][0]);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!student) {
      setError("Choose the student ordering the uniform.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await api("/uniforms", {
        method: "POST",
        body: JSON.stringify({
          student_no: student.student_no,
          category,
          item: isPE ? item : null,
          size: isPE ? size : null,
          tailoring_status: isPE ? null : tailoring,
          status: "ordered",
          date_ordered: dateOrdered,
          time_ordered: timeOrdered,
          remarks,
        }),
      });
      notify(
        isPE
          ? `P.E. ${item} size ${size} ordered for ${student.full_name}.`
          : `${category} uniform order recorded for ${student.full_name}.`
      );
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not record this uniform order.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="New uniform order"
      subtitle="Record the uniform a student is requesting at the Property Office."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="uniform-order-form" className="btn btn-primary" disabled={saving || !student}>
            <Icon name="check" size={16} />
            {saving ? "Saving…" : "Record order"}
          </button>
        </>
      }
    >
      <form id="uniform-order-form" className="form-stack" onSubmit={submit}>
        <div className="field">
          <span className="field-label">Student</span>
          {student ? (
            <div className="student-cell">
              <Avatar name={student.full_name} src={student.avatar} size={38} />
              <div className="cell-primary">
                <strong>{student.full_name}</strong>
                <small>{student.student_no}</small>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setStudent(null);
                  setQuery("");
                }}
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <div className="search-field search-field-flat">
                <Icon name="search" size={18} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search student number or name"
                  aria-label="Search the student ordering a uniform"
                  autoFocus
                />
              </div>
              {searching ? <span className="field-hint">Searching…</span> : null}
              {!searching && query.trim() && results.length === 0 ? (
                <span className="field-hint">No student matched. Add the student first, then record the order.</span>
              ) : null}
              {results.length > 0 ? (
                <div className="picker-list" role="listbox" aria-label="Matching students">
                  {results.map((row) => (
                    <button
                      key={row.student_no}
                      type="button"
                      role="option"
                      aria-selected={false}
                      className="picker-item"
                      onClick={() => setStudent(row)}
                    >
                      <Avatar name={row.full_name} src={row.avatar} size={34} />
                      <span className="picker-copy">
                        <strong>{row.full_name}</strong>
                        <small>
                          {row.student_no}
                          {row.program ? ` · ${row.program}` : ""}
                        </small>
                      </span>
                      <Icon name="chevronRight" size={17} />
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="field">
          <span className="field-label">Uniform type</span>
          <div className="segmented-control" role="group" aria-label="Uniform type">
            {(["PE", "General", "Nursing"] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={category === value ? "is-active" : ""}
                onClick={() => setCategory(value)}
              >
                {value === "PE" ? "P.E." : value}
              </button>
            ))}
          </div>
          <span className="field-hint">
            {isPE
              ? "P.E. uniforms are counted per piece and per size."
              : "General and Nursing uniforms are tracked through tailoring."}
          </span>
        </div>

        {isPE ? (
          <>
            <div className="field">
              <span className="field-label">P.E. item</span>
              <div className="segmented-control" role="group" aria-label="P.E. item">
                {(["Shirt", "Pants"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={item === value ? "is-active" : ""}
                    onClick={() => pickItem(value)}
                  >
                    {value === "Shirt" ? "P.E. Shirt" : "P.E. Pants"}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <span className="field-label">Size ({sizeRangeLabel(item)})</span>
              <div className="chip-row" role="group" aria-label="Size">
                {sizeOptions.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`chip ${size === value ? "is-active" : ""}`}
                    onClick={() => setSize(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <Field label="Tailoring status" htmlFor="new-uniform-tailoring">
            <select
              id="new-uniform-tailoring"
              value={tailoring}
              onChange={(event) => setTailoring(event.target.value)}
            >
              <option value="queued">In queue</option>
              <option value="sewing">Being sewn</option>
              <option value="finished">Sewing finished</option>
            </select>
          </Field>
        )}

        <div className="form-row">
          <Field label="Date ordered" htmlFor="new-uniform-date">
            <input
              id="new-uniform-date"
              type="date"
              value={dateOrdered}
              onChange={(event) => setDateOrdered(event.target.value)}
              required
            />
          </Field>
          <Field label="Time" htmlFor="new-uniform-time">
            <input
              id="new-uniform-time"
              type="time"
              value={timeOrdered}
              onChange={(event) => setTimeOrdered(event.target.value)}
            />
          </Field>
        </div>

        <Field label="Remarks" htmlFor="new-uniform-remarks" hint="Example: “For PE class Friday” or “Name printed at the back”.">
          <textarea
            id="new-uniform-remarks"
            rows={3}
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            placeholder="Notes the student should see before claiming"
            maxLength={500}
          />
        </Field>

        <ErrorNote message={error} />
      </form>
    </Modal>
  );
}

interface StudentModalProps {
  student?: Student;
  /** Logins are created by the registrar; the Property Office adds the roster entry only. */
  allowAccount?: boolean;
  /** The Property Office takes the uniform order in the same step as the roster entry. */
  allowUniformOrder?: boolean;
  onClose: () => void;
  onSaved: (student: Student) => void;
}

export function StudentModal({
  student,
  allowAccount = true,
  allowUniformOrder = false,
  onClose,
  onSaved,
}: StudentModalProps) {
  const { notify } = useToast();
  const [studentNo, setStudentNo] = useState(student?.student_no ?? "");
  const [fullName, setFullName] = useState(student?.full_name ?? "");
  const [program, setProgram] = useState(student?.program ?? "");
  const [yearLevel, setYearLevel] = useState(student?.year_level ?? "");
  const [section, setSection] = useState(student?.section ?? "");
  const [email, setEmail] = useState(student?.email ?? "");
  const [createAccount, setCreateAccount] = useState(!student);
  const [password, setPassword] = useState("");
  const [withOrder, setWithOrder] = useState(true);
  const [orderCategory, setOrderCategory] = useState<"PE" | "General" | "Nursing">("PE");
  const [orderItem, setOrderItem] = useState<"Pants" | "Shirt">("Shirt");
  const [orderSize, setOrderSize] = useState("M");
  const [orderTailoring, setOrderTailoring] = useState("queued");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const takingOrder = !student && allowUniformOrder && withOrder;
  const isPEOrder = orderCategory === "PE";
  const orderSizes = isPEOrder ? PE_ITEM_SIZES[orderItem] : [];

  function pickOrderItem(next: "Pants" | "Shirt") {
    setOrderItem(next);
    if (!PE_ITEM_SIZES[next].includes(orderSize)) {
      setOrderSize(PE_ITEM_SIZES[next].includes("M") ? "M" : PE_ITEM_SIZES[next][0]);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const body = {
        student_no: studentNo.trim(),
        full_name: fullName,
        program,
        year_level: yearLevel,
        section,
        email,
        create_account: allowAccount && createAccount,
        password: allowAccount && createAccount ? password || undefined : undefined,
      };
      const payload = student
        ? await api<{ student: Student }>(`/students/${encodeURIComponent(student.student_no)}`, {
            method: "PATCH",
            body: JSON.stringify(body),
          })
        : await api<{ student: Student }>("/students", { method: "POST", body: JSON.stringify(body) });

      if (takingOrder) {
        try {
          await api("/uniforms", {
            method: "POST",
            body: JSON.stringify({
              student_no: payload.student.student_no,
              category: orderCategory,
              item: isPEOrder ? orderItem : null,
              size: isPEOrder ? orderSize : null,
              tailoring_status: isPEOrder ? null : orderTailoring,
              status: "ordered",
            }),
          });
          notify(
            isPEOrder
              ? `Student added · P.E. ${orderItem} size ${orderSize} ordered.`
              : `Student added · ${orderCategory} uniform order recorded.`
          );
        } catch (err) {
          // The student is already on the roster; the order can still be filed
          // from Uniform orders, so the dialog closes with the reason shown.
          notify(
            `Student added, but the uniform order failed: ${
              err instanceof ApiError ? err.message : "unknown error"
            }`,
            "error"
          );
        }
      } else {
        notify(student ? "Student information updated." : `Student ${payload.student.student_no} added.`);
      }
      onSaved(payload.student);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this student.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={student ? "Edit student" : "Add student"}
      subtitle={
        student
          ? student.student_no
          : allowUniformOrder
            ? "Add the student and record the uniform they are ordering."
            : allowAccount
              ? "Add one student to the roster and optionally create their login."
              : "Add one student to the roster; the registrar creates their login."
      }
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="student-form" className="btn btn-primary" disabled={saving}>
            <Icon name="check" size={16} />
            {saving ? "Saving…" : student ? "Save changes" : "Add student"}
          </button>
        </>
      }
    >
      <form id="student-form" className="form-stack" onSubmit={submit}>
        <div className="form-row">
          <Field
            label="Student number"
            htmlFor="student-no"
            hint={
              student
                ? "Correcting this also renames the student's login and moves their documents and uniform orders."
                : undefined
            }
          >
            <input
              id="student-no"
              value={studentNo}
              onChange={(event) => setStudentNo(event.target.value)}
              placeholder="e.g. 2024-00101"
              autoComplete="off"
              required
            />
          </Field>
          <Field label="Full name" htmlFor="student-name">
            <input
              id="student-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="First name Middle name Last name"
              required
            />
          </Field>
        </div>

        <Field label="Program" htmlFor="student-program">
          <input
            id="student-program"
            value={program}
            onChange={(event) => setProgram(event.target.value)}
            placeholder="BS Information Technology"
          />
        </Field>

        <div className="form-row form-row-3">
          <Field label="Year level" htmlFor="student-year">
            <select id="student-year" value={yearLevel} onChange={(event) => setYearLevel(event.target.value)}>
              <option value="">Not set</option>
              {["1st Year", "2nd Year", "3rd Year", "4th Year"].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Section" htmlFor="student-section">
            <input
              id="student-section"
              value={section}
              onChange={(event) => setSection(event.target.value)}
              placeholder="A"
            />
          </Field>
          <Field label="Email" htmlFor="student-email">
            <input
              id="student-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="student@campus.edu.ph"
            />
          </Field>
        </div>

        {!student && allowAccount ? (
          <div className="check-row">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={createAccount}
                onChange={(event) => setCreateAccount(event.target.checked)}
              />
              <span>
                Create a student login
                <small>Uses the default student password from Settings unless you set one below.</small>
              </span>
            </label>
          </div>
        ) : null}

        {!student && allowAccount && createAccount ? (
          <Field label="Password (optional)" htmlFor="student-password" hint="Leave blank to use the default student password.">
            <input
              id="student-password"
              type="text"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Default password"
              minLength={6}
            />
          </Field>
        ) : null}

        {!student && allowUniformOrder ? (
          <div className="order-block">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={withOrder}
                onChange={(event) => setWithOrder(event.target.checked)}
              />
              <span>
                Record a uniform order now
                <small>Choose the uniform type and, for PE, the piece and size the student is requesting.</small>
              </span>
            </label>

            {takingOrder ? (
              <div className="order-fields">
                <div className="field">
                  <span className="field-label">Uniform type</span>
                  <div className="segmented-control" role="group" aria-label="Uniform type">
                    {(["PE", "General", "Nursing"] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={orderCategory === value ? "is-active" : ""}
                        onClick={() => setOrderCategory(value)}
                      >
                        {value === "PE" ? "P.E." : value}
                      </button>
                    ))}
                  </div>
                </div>

                {isPEOrder ? (
                  <>
                    <div className="field">
                      <span className="field-label">P.E. item</span>
                      <div className="segmented-control" role="group" aria-label="P.E. item">
                        {(["Shirt", "Pants"] as const).map((value) => (
                          <button
                            key={value}
                            type="button"
                            className={orderItem === value ? "is-active" : ""}
                            onClick={() => pickOrderItem(value)}
                          >
                            {value === "Shirt" ? "P.E. Shirt" : "P.E. Pants"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="field">
                      <span className="field-label">Size ({sizeRangeLabel(orderItem)})</span>
                      <div className="chip-row" role="group" aria-label="Size">
                        {orderSizes.map((value) => (
                          <button
                            key={value}
                            type="button"
                            className={`chip ${orderSize === value ? "is-active" : ""}`}
                            onClick={() => setOrderSize(value)}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <Field label="Tailoring status" htmlFor="student-order-tailoring">
                    <select
                      id="student-order-tailoring"
                      value={orderTailoring}
                      onChange={(event) => setOrderTailoring(event.target.value)}
                    >
                      <option value="queued">In queue</option>
                      <option value="sewing">Being sewn</option>
                      <option value="finished">Sewing finished</option>
                    </select>
                  </Field>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        <ErrorNote message={error} />
      </form>
    </Modal>
  );
}

interface CancelRecordModalProps {
  title: string;
  subtitle?: string;
  message: string;
  endpoint: string;
  onClose: () => void;
  onCancelled: () => void;
}

/** Withdraws a document request or uniform order without deleting it. */
export function CancelRecordModal({ title, subtitle, message, endpoint, onClose, onCancelled }: CancelRecordModalProps) {
  const { notify } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setError(null);
    setBusy(true);
    try {
      await api(endpoint, { method: "POST" });
      notify("Record cancelled.");
      onCancelled();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not cancel this record.");
      setBusy(false);
    }
  }

  return (
    <Modal
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Keep it
          </button>
          <button type="button" className="btn btn-danger" onClick={confirm} disabled={busy}>
            <Icon name="close" size={16} />
            {busy ? "Cancelling…" : "Cancel record"}
          </button>
        </>
      }
    >
      <div className="form-stack">
        <p>{message}</p>
        <p className="modal-meta">
          The record stays on file as cancelled, so it stops counting as pending or ready. You can reopen it later by
          setting a new status.
        </p>
        <ErrorNote message={error} />
      </div>
    </Modal>
  );
}

interface DeleteStudentModalProps {
  studentNo: string;
  fullName: string;
  summary?: string[];
  onClose: () => void;
  onDeleted: () => void;
}

/** Removes a student and, through the server cascade, their records and login. */
export function DeleteStudentModal({ studentNo, fullName, summary, onClose, onDeleted }: DeleteStudentModalProps) {
  const { notify } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setError(null);
    setBusy(true);
    try {
      await api(`/students/${encodeURIComponent(studentNo)}`, { method: "DELETE" });
      notify(`${fullName} was deleted.`);
      onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete this student.");
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Delete this student?"
      subtitle={`${fullName} · ${studentNo}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Keep it
          </button>
          <button type="button" className="btn btn-danger" onClick={confirm} disabled={busy}>
            <Icon name="trash" size={16} />
            {busy ? "Deleting…" : "Delete student"}
          </button>
        </>
      }
    >
      <div className="form-stack">
        <p>
          This removes <strong>{fullName}</strong> from the roster for good. Their student login is revoked and
          everything filed under <strong>{studentNo}</strong> is deleted with them.
        </p>
        {summary && summary.length > 0 ? (
          <ul className="delete-summary">
            {summary.map((line) => (
              <li key={line}>
                <Icon name="alert" size={15} />
                {line}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="modal-meta">
          This cannot be undone. If the student is only leaving for a term, keep the record and cancel their items
          instead.
        </p>
        <ErrorNote message={error} />
      </div>
    </Modal>
  );
}

interface StudentPickerProps {
  title: string;
  onClose: () => void;
  onPick: (student: Student) => void;
}

export function StudentPickerModal({ title, onClose, onPick }: StudentPickerProps) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 220);
    return () => window.clearTimeout(timer);
  }, [query]);

  const { data, loading, error } = useApi<{ students: StudentWithCounts[] }>(
    `/students?q=${encodeURIComponent(debounced)}`
  );
  const students = data?.students ?? [];

  return (
    <Modal title={title} subtitle="Search by student number or name first." onClose={onClose}>
      <div className="search-field search-field-flat">
        <Icon name="search" size={18} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Student number or name"
          aria-label="Search student"
          autoFocus
        />
      </div>
      <div className="picker-list">
        {loading && !data ? <Spinner label="Searching" /> : null}
        {error ? <p className="field-error">{error}</p> : null}
        {!loading && students.length === 0 ? (
          <EmptyState icon="users" title="No student found" message="Check the student number, or add the student first." />
        ) : null}
        {students.map((student) => (
          <button
            key={student.student_no}
            type="button"
            className="picker-item"
            onClick={() => onPick(student)}
          >
            <Avatar name={student.full_name} src={student.avatar} size={36} />
            <span className="picker-copy">
              <strong>{student.full_name}</strong>
              <small>
                {student.student_no}
                {student.program ? ` · ${student.program}` : ""}
              </small>
            </span>
            <Icon name="chevronRight" size={17} />
          </button>
        ))}
      </div>
    </Modal>
  );
}

interface ImportResult {
  created: number;
  updated: number;
  accounts_created: number;
  default_password: string | null;
  errors: string[];
}

interface ImportModalProps {
  onClose: () => void;
  onImported: () => void;
}

const SAMPLE_CSV = `student_no,full_name,program,year_level,section,email
2026-00001,Maria Clara Lopez,BS Information Technology,1st Year,A,maria.lopez@campus.edu.ph
2026-00002,Paolo Miguel Cruz,BS Nursing,1st Year,B,paolo.cruz@campus.edu.ph`;

export function ImportModal({ onClose, onImported }: ImportModalProps) {
  const { notify } = useToast();
  const [csv, setCsv] = useState("");
  const [createAccounts, setCreateAccounts] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const lineCount = useMemo(() => csv.split(/\r?\n/).filter((line) => line.trim()).length, [csv]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = await api<ImportResult>("/students/import", {
        method: "POST",
        body: JSON.stringify({ csv, create_accounts: createAccounts, default_password: password || undefined }),
      });
      setResult(payload);
      notify(`${payload.created} added · ${payload.updated} updated.`);
      onImported();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not import the student list.");
    } finally {
      setSaving(false);
    }
  }

  async function handleFile(file?: File) {
    if (!file) return;
    try {
      setCsv(await file.text());
      setError(null);
    } catch {
      setError("That file could not be read.");
    }
  }

  return (
    <Modal
      title="Import students"
      subtitle="Bulk-add or update the roster. Existing records are kept."
      onClose={onClose}
      wide
      footer={
        result ? (
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" form="import-form" className="btn btn-primary" disabled={saving || !csv.trim()}>
              <Icon name="upload" size={16} />
              {saving ? "Importing…" : "Import list"}
            </button>
          </>
        )
      }
    >
      {result ? (
        <div className="page-stack">
          <div className="import-summary">
            <div>
              <strong>{result.created}</strong>
              <span>new students</span>
            </div>
            <div>
              <strong>{result.updated}</strong>
              <span>updated</span>
            </div>
            <div>
              <strong>{result.accounts_created}</strong>
              <span>logins created</span>
            </div>
          </div>
          {result.default_password ? (
            <div className="info-banner">
              <Icon name="lock" size={18} />
              <div>
                <strong>Default password used</strong>
                <p>
                  New student logins can sign in with <code>{result.default_password}</code>. Ask them to change it
                  from their Profile after their first sign-in.
                </p>
              </div>
            </div>
          ) : null}
          {result.errors.length > 0 ? (
            <div className="alert alert-warning">
              <Icon name="alert" size={17} />
              <div>
                <strong>{result.errors.length} row(s) skipped</strong>
                <ul className="plain-list">
                  {result.errors.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <form id="import-form" className="form-stack" onSubmit={submit}>
          <div className="form-row form-row-between">
            <span className="muted small">
              CSV columns: <code>student_no, full_name, program, year_level, section, email</code>
            </span>
            <div className="button-row">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCsv(SAMPLE_CSV)}>
                Use sample
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
                <Icon name="upload" size={15} />
                Choose CSV
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              hidden
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
          </div>

          <Field label="Student list" htmlFor="import-csv" hint={`${Math.max(0, lineCount - 1)} data row(s) detected.`}>
            <textarea
              id="import-csv"
              rows={9}
              value={csv}
              onChange={(event) => setCsv(event.target.value)}
              placeholder={SAMPLE_CSV}
              className="mono-input"
              spellCheck={false}
            />
          </Field>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={createAccounts}
              onChange={(event) => setCreateAccounts(event.target.checked)}
            />
            <span>
              Create logins for students without an account
              <small>Students who already have a login keep their current password.</small>
            </span>
          </label>

          {createAccounts ? (
            <Field
              label="Default password (optional)"
              htmlFor="import-password"
              hint="Leave blank to use the default from Settings."
            >
              <input
                id="import-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Default student password"
              />
            </Field>
          ) : null}

          <ErrorNote message={error} />
        </form>
      )}
    </Modal>
  );
}
