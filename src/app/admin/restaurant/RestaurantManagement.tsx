"use client";

import { useEffect, useState } from "react";
import { restaurantJson, restaurantTime, price, statusLabel, type Order, type Reservation } from "@/lib/restaurant-client";
import { buttonClass, fieldClass, panelClass } from "../../RestaurantShell";
import { OrderContents } from "../../account/History";

type Table = { id: number; name: string; capacity: number; active: boolean };
type Settings = {
  timezone: string; opens_at: string; closes_at: string; advance_days: number; lead_minutes: number;
  duration_minutes: number; order_cancel_minutes: number;
};
type Report = {
  settings: Settings;
  stats?: Record<string, number | string>;
  tables?: Table[];
  reservations?: Reservation[];
  orders?: Order[];
};
const endpoint = "/api/admin/restaurant";
const statuses = {
  reservations: ["pending", "confirmed", "cancelled", "completed"],
  orders: ["pending", "accepted", "preparing", "ready", "served", "completed", "cancelled"],
};
const statsLabels = [
  ["today_reservations", "Today’s reservations"],
  ["pending_reservations", "Pending reservations"],
  ["pending_orders", "Pending orders"],
  ["active_tables", "Active tables"],
  ["completed_orders", "Completed orders"],
  ["today_sales", "Today’s recorded sales"],
];

function TableEditor({ table, busy, run }: { table?: Table; busy: boolean; run: (body: object) => void }) {
  return (
    <form className={`${panelClass} grid items-end gap-3 sm:grid-cols-[2fr_1fr_auto_auto]`}
          onSubmit={(event) => {
            event.preventDefault();
            const fields = new FormData(event.currentTarget);
            run({ action: "table", id: table?.id, name: fields.get("name"), capacity: Number(fields.get("capacity")), active: fields.get("active") === "on" });
          }}>
      <label className="grid gap-1 text-sm">Table name
        <input className={fieldClass} name="name" maxLength={40} required defaultValue={table?.name} />
      </label>
      <label className="grid gap-1 text-sm">Seats
        <input className={fieldClass} name="capacity" type="number" required min={1} max={50} defaultValue={table?.capacity ?? 2} />
      </label>
      <label className="flex items-center gap-2 py-2 text-sm">
        <input name="active" type="checkbox" defaultChecked={table?.active ?? true} /> Active
      </label>
      <button className={buttonClass} type="submit" disabled={busy}>{table ? "Save table" : "Add table"}</button>
    </form>
  );
}

function BookingEditor({ settings, busy, run }: { settings: Settings; busy: boolean; run: (body: object) => void }) {
  return (
    <form className={`${panelClass} grid gap-4 sm:grid-cols-2`} onSubmit={(event) => {
      event.preventDefault();
      const fields = new FormData(event.currentTarget);
      run({ action: "settings", timezone: fields.get("timezone"), opens: fields.get("opens"), closes: fields.get("closes"),
        advance: Number(fields.get("advance")), lead: Number(fields.get("lead")),
        duration: Number(fields.get("duration")), cancel: Number(fields.get("cancel")) });
    }}>
      <h2 className="font-serif text-2xl sm:col-span-2">Booking and cancellation rules</h2>
      <label className="grid gap-1">Restaurant time zone
        <input className={fieldClass} name="timezone" defaultValue={settings.timezone} maxLength={80} required />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1">Opens <input type="time" className={fieldClass} name="opens" defaultValue={settings.opens_at.slice(0,5)} required /></label>
        <label className="grid gap-1">Closes <input type="time" className={fieldClass} name="closes" defaultValue={settings.closes_at.slice(0,5)} required /></label>
      </div>
      {[
        ["advance", "Booking horizon (days)", settings.advance_days, 1, 365],
        ["lead", "Minimum notice (minutes)", settings.lead_minutes, 0, 1440],
        ["duration", "Reservation length (minutes)", settings.duration_minutes, 30, 240],
        ["cancel", "Order cancellation window (minutes)", settings.order_cancel_minutes, 0, 120],
      ].map(([name, label, value, min, max]) => <label key={name} className="grid gap-1">
        {label}<input type="number" className={fieldClass} required name={String(name)} defaultValue={value} min={min} max={max} />
      </label>)}
      <button type="submit" className={`${buttonClass} justify-self-start`} disabled={busy}>Save rules</button>
    </form>
  );
}

function ReservationActions({ row, tables, busy, run }: {
  row: Reservation; tables: Table[]; busy: boolean; run: (body: object) => void;
}) {
  const current = row.status === "pending" || row.status === "confirmed";
  const [table, setTable] = useState(row.table_id);
  if (!current) return null;

  function setStatus(status: string) {
    run({ action: "reservation", id: row.id, status, ...(status === "assign" || status === "confirmed" ? { table } : {}) });
  }

  return (
    <div className="mt-4 grid gap-3">
      <label className="grid max-w-sm gap-1 text-sm">Assigned table
        <select className={fieldClass} value={table} onChange={(event) => setTable(Number(event.target.value))}>
          {tables.filter((t) => t.id === row.table_id || (t.active && t.capacity >= row.party_size))
            .map((t) => <option key={t.id} value={t.id}>{t.name} · {t.capacity} seats</option>)}
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonClass} disabled={busy || table === row.table_id} onClick={() => setStatus("assign")}>Reassign table</button>
        {row.status === "pending" && <button type="button" className={buttonClass} disabled={busy} onClick={() => setStatus("confirmed")}>Confirm</button>}
        {row.status === "confirmed" && <button type="button" className={buttonClass} disabled={busy} onClick={() => setStatus("completed")}>Mark completed</button>}
        <button type="button" className={buttonClass} disabled={busy} onClick={() => setStatus("cancelled")}>{row.status === "pending" ? "Reject" : "Cancel"}</button>
      </div>
    </div>
  );
}

function orderActions(order: Order) {
  const choices: [string, string][] = [];
  const next: Record<string, [string, string]> = {
    pending: ["accepted", "Accept"],
    accepted: ["preparing", "Start preparing"],
    preparing: ["ready", "Mark ready"],
  };
  const state = next[order.status];
  if (state) choices.push(state);
  if (order.status === "ready" && order.order_type === "dine-in") choices.push(["served", "Mark served"]);
  if (order.payment_status === "paid" && ((order.order_type === "takeaway" && order.status === "ready") || order.status === "served")) {
    choices.push(["completed", "Mark completed"]);
  }
  if (order.payment_status === "unpaid" && ["accepted", "preparing", "ready", "served"].includes(order.status)) {
    choices.push(["paid", "Record payment"]);
  }
  if (order.payment_status === "unpaid" && ["pending", "accepted", "preparing", "ready"].includes(order.status)) {
    choices.push(["cancelled", "Cancel order"]);
  }
  return choices;
}

export default function RestaurantManagement({ section }: { section: "overview" | "tables" | "reservations" | "orders" }) {
  const [filters, setFilters] = useState({ date: "", status: "" });
  const [result, setResult] = useState<{ url: string; value: Report }>();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const url = `${endpoint}?${new URLSearchParams({ section, ...filters })}`;
  const data = result?.url === url ? result.value : undefined;

  useEffect(() => {
    let active = true;
    void restaurantJson<Report>(url)
      .then((value) => { if (active) setResult({ url, value }); })
      .catch((err: Error) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [url]);

  async function run(body: object) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await restaurantJson(endpoint, body);
      setResult({ url, value: await restaurantJson<Report>(url) });
      setMessage("Changes saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save changes.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5">
      {(section === "reservations" || section === "orders") && (
        <form className={`${panelClass} grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]`} onSubmit={(event) => {
          event.preventDefault();
          const fields = new FormData(event.currentTarget);
          setError("");
          setFilters({ date: String(fields.get("date")), status: String(fields.get("status")) });
        }}>
          <label className="grid gap-1">Date <input type="date" name="date" className={fieldClass} /></label>
          <label className="grid gap-1">Status <select name="status" className={fieldClass}>
            <option value="">All statuses</option>
            {statuses[section].map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
          </select></label>
          <button className={buttonClass} type="submit" disabled={busy}>Filter</button>
        </form>
      )}
      {!data && !error && <p role="status">Loading…</p>}
      {error && <p role="alert" className="rounded bg-red-50 p-3 text-red-700">{error}</p>}
      {message && <p role="status" className="rounded bg-[#EAEFE7] p-3">{message}</p>}
      {data?.stats && <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statsLabels.map(([key, label]) => <div className={panelClass} key={key}>
          <dt className="text-sm">{label}</dt><dd className="mt-2 font-serif text-3xl">{key === "today_sales" ? price(data.stats![key]) : data.stats![key]}</dd>
        </div>)}
      </dl>}
      {data && section === "tables" && <>
        <h2 className="font-serif text-2xl">Add a table</h2>
        <TableEditor busy={busy} run={run} />
        <h2 className="font-serif text-2xl">Existing tables</h2>
        {!data.tables?.length && <p>No tables have been added.</p>}
        {data.tables?.map((table) => <TableEditor key={table.id} table={table} busy={busy} run={run} />)}
        <BookingEditor settings={data.settings} busy={busy} run={run} />
      </>}
      {data?.reservations?.length === 0 && <p className={panelClass}>No matching reservations.</p>}
      {data?.reservations?.map((row) => <article className={panelClass} key={row.id}>
        <h2 className="font-serif text-2xl">{row.customer} · {statusLabel(row.status)}</h2>
        <p className="wrap-break-word">{row.email}</p>
        <p className="mt-2">{restaurantTime(row.starts_at, data.settings.timezone)} · {row.table_name} · {row.party_size} guests</p>
        {row.requests && <p className="mt-2 whitespace-pre-wrap wrap-break-word">Requests · {row.requests}</p>}
        <ReservationActions key={`${row.id}/${row.table_id}`} row={row} tables={data.tables ?? []} busy={busy} run={run} />
      </article>)}
      {data?.orders?.length === 0 && <p className={panelClass}>No matching orders.</p>}
      {data?.orders?.map((order) => <article className={panelClass} key={order.id}>
        <h2 className="font-serif text-2xl">{order.customer} · {statusLabel(order.status)}</h2>
        <p className="wrap-break-word">{order.email}</p>
        <p className="mt-2">{restaurantTime(order.created_at, data.settings.timezone)}</p>
        <OrderContents order={order} />
        <div className="mt-4 flex flex-wrap gap-2">
          {orderActions(order).map(([status, label]) => <button key={status} type="button" className={buttonClass} disabled={busy}
            onClick={() => { if (status !== "paid" || window.confirm("Record payment as collected?")) void run({ action: "order", id: order.id, status }); }}>
            {label}
          </button>)}
        </div>
      </article>)}
    </div>
  );
}
