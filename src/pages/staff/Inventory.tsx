import { useEffect, useState } from "react";
import { useApi } from "../../lib/useApi";
import { useToast } from "../../context/ToastContext";
import { api, ApiError } from "../../lib/api";
import type { InventoryGroup, InventoryItem, PeItem, SettingsMap } from "../../lib/types";
import { PageError, Spinner, Toggle, Field, Modal } from "../../components/ui";
import { Icon } from "../../components/Icon";

interface InventoryResponse {
  groups: InventoryGroup[];
  total: number;
  low_stock: InventoryItem[];
  settings: SettingsMap;
}

const ITEM_TITLES: Record<PeItem, string> = { Pants: "P.E. Pants", Shirt: "P.E. Shirt" };
const LOW_STOCK_LEVEL = 3;

export function StaffInventory() {
  const { notify } = useToast();
  const { data, error, loading, reload } = useApi<InventoryResponse>("/inventory");
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState("0");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [tailoringOpen, setTailoringOpen] = useState(false);
  const [tailoringBusy, setTailoringBusy] = useState(false);

  useEffect(() => {
    if (data) setTailoringOpen(data.settings.tailoring_open === "1");
  }, [data]);

  if (loading && !data) return <Spinner label="Loading PE inventory" />;
  if (error) return <PageError message={error} onRetry={reload} />;
  if (!data) return null;

  const groups = data.groups;
  const trackedSizes = groups.reduce((sum, group) => sum + group.sizes.length, 0);
  const lowCount = data.low_stock.length;

  async function adjust(item: PeItem, size: string, delta: number) {
    const key = `${item}-${size}`;
    setBusyKey(key);
    try {
      await api(`/inventory/${item}/${encodeURIComponent(size)}`, {
        method: "PATCH",
        body: JSON.stringify({ delta }),
      });
      reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Could not update stock.", "error");
    } finally {
      setBusyKey(null);
    }
  }

  async function saveQuantity(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setErrorMessage(null);
    setBusyKey(`${editing.item}-${editing.size}`);
    try {
      await api(`/inventory/${editing.item}/${encodeURIComponent(editing.size)}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity: Number(quantity) }),
      });
      notify(`${ITEM_TITLES[editing.item]} size ${editing.size} set to ${quantity} pcs.`);
      setEditing(null);
      reload();
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not update this size.");
    } finally {
      setBusyKey(null);
    }
  }

  async function toggleTailoring(open: boolean) {
    setTailoringBusy(true);
    try {
      await api("/settings/tailoring", { method: "PATCH", body: JSON.stringify({ open }) });
      setTailoringOpen(open);
      notify(open ? "Tailoring is now open." : "Tailoring is now closed.");
      reload();
    } catch {
      notify("Could not update tailoring availability.", "error");
    } finally {
      setTailoringBusy(false);
    }
  }

  return (
    <div className="page-stack">
      <div className="inventory-top">
        <section className="card card-tinted inventory-summary">
          <div className="card-head">
            <div>
              <h2>PE stock on hand</h2>
              <p>Pants and shirts are counted separately. Claiming a piece deducts it automatically.</p>
            </div>
            <span className="mini-icon">
              <Icon name="box" size={16} />
            </span>
          </div>
          <div className="inventory-numbers">
            <div>
              <strong>{data.total}</strong>
              <span>pieces total</span>
            </div>
            <div>
              <strong>{trackedSizes}</strong>
              <span>sizes tracked</span>
            </div>
            <div className={lowCount > 0 ? "is-low" : ""}>
              <strong>{lowCount}</strong>
              <span>low-stock sizes</span>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h2>Tailoring availability</h2>
              <p>General and Nursing uniform orders.</p>
            </div>
            <span className={`live-dot ${tailoringOpen ? "is-on" : ""}`} />
          </div>
          <Toggle
            label={tailoringOpen ? "Accepting tailoring orders" : "Tailoring is closed"}
            description={
              tailoringOpen
                ? "New general and nursing orders can be recorded."
                : "Existing orders can still be updated; pause new ones until the shop reopens."
            }
            checked={tailoringOpen}
            onChange={toggleTailoring}
            disabled={tailoringBusy}
          />
          <p className="muted small">
            The Property Office can pause new orders without affecting orders already in queue or being sewn.
          </p>
        </section>
      </div>

      {groups.map((group) => {
        const low = group.sizes.filter((entry) => entry.quantity <= LOW_STOCK_LEVEL).length;
        return (
          <section className="card" key={group.item}>
            <div className="card-head">
              <div>
                <h2>{ITEM_TITLES[group.item]}</h2>
                <p>
                  Sizes {group.size_range} · {group.total} pcs on hand
                  {low > 0 ? ` · ${low} size${low === 1 ? "" : "s"} low` : ""}
                </p>
              </div>
              <span className={`stock-flag ${low > 0 ? "is-low" : ""}`}>
                {low > 0 ? "Needs restocking" : "Well stocked"}
              </span>
            </div>

            <div className="size-grid">
              {group.sizes.map((entry) => {
                const isLow = entry.quantity <= LOW_STOCK_LEVEL;
                const key = `${entry.item}-${entry.size}`;
                return (
                  <article key={key} className={`size-card ${isLow ? "is-low" : ""}`}>
                    <div className="size-card-head">
                      <span className="size-label">
                        {group.item === "Pants" ? "Pants" : "Shirt"} · {entry.size}
                      </span>
                      <span className={`stock-flag ${isLow ? "is-low" : ""}`}>{isLow ? "Low" : "OK"}</span>
                    </div>
                    <div className="qty-row">
                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() => adjust(group.item, entry.size, -1)}
                        disabled={busyKey === key || entry.quantity === 0}
                        aria-label={`Remove one ${group.item} size ${entry.size}`}
                      >
                        −
                      </button>
                      <span className="qty-value">
                        <strong>{entry.quantity}</strong>
                        <small>pcs</small>
                      </span>
                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() => adjust(group.item, entry.size, 1)}
                        disabled={busyKey === key}
                        aria-label={`Add one ${group.item} size ${entry.size}`}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className="link-btn size-edit"
                      onClick={() => {
                        setEditing(entry);
                        setQuantity(String(entry.quantity));
                        setErrorMessage(null);
                      }}
                    >
                      Set exact quantity
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="info-banner">
        <Icon name="info" size={18} />
        <div>
          <strong>How inventory moves</strong>
          <p>
            Marking a P.E. Shirt or P.E. Pants order as <em>claimed</em> removes one piece from that size in the same
            panel. Changing it back to ordered or ready returns the piece to stock. General and Nursing uniforms are
            tracked by tailoring status instead of size.
          </p>
        </div>
      </div>

      {editing ? (
        <Modal
          title={`Set stock for ${ITEM_TITLES[editing.item]} · ${editing.size}`}
          subtitle={`Currently ${editing.quantity} pcs on hand.`}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" form="quantity-form" className="btn btn-primary" disabled={busyKey !== null}>
                {busyKey ? "Saving…" : "Save quantity"}
              </button>
            </>
          }
        >
          <form id="quantity-form" className="form-stack" onSubmit={saveQuantity}>
            <Field label="Pieces on hand" htmlFor="quantity">
              <input
                id="quantity"
                type="number"
                min={0}
                max={9999}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                required
              />
            </Field>
            {errorMessage ? (
              <div className="alert alert-error" role="alert">
                <Icon name="alert" size={17} />
                <span>{errorMessage}</span>
              </div>
            ) : null}
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
