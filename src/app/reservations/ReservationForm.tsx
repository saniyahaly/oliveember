"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { restaurantJson, restaurantTime } from "@/lib/restaurant-client";
import { buttonClass, fieldClass, panelClass } from "../RestaurantShell";

type Settings = { today: string; last_day: string; timezone: string; duration_minutes: number };
type Slot = { table_id: number; table_name: string; starts_at: string; ends_at: string };

export default function ReservationForm() {
  const [settings, setSettings] = useState<Settings>();
  const [day, setDay] = useState("");
  const [party, setParty] = useState(2);
  const [slots, setSlots] = useState<Slot[]>();
  const [selected, setSelected] = useState("");
  const [requests, setRequests] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let current = true;
    void restaurantJson<{ settings: Settings }>("/api/reservations")
      .then(({ settings }) => { if (current) setSettings(settings); })
      .catch((err: Error) => { if (current) setError(err.message); });
    return () => { current = false; };
  }, []);

  const date = day || settings?.today || "";
  async function search(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSlots(undefined);
    setSuccess(false);
    setSelected("");
    try {
      const result = await restaurantJson<{ slots: Slot[] }>(`/api/reservations?date=${encodeURIComponent(date)}&party=${party}`);
      setSlots(result.slots);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to find tables.");
    } finally {
      setBusy(false);
    }
  }

  async function book(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const slot = slots?.find((item) => `${item.table_id}/${item.starts_at}` === selected);
    if (!slot || busy) return;
    setBusy(true);
    setError("");
    try {
      await restaurantJson("/api/reservations", { action: "reserve", date, party, slot: slot.starts_at, table: slot.table_id, requests });
      setSuccess(true);
      setSlots(undefined);
      setSelected("");
      setRequests("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reserve this table.");
      setSlots(undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${panelClass} grid gap-5`}>
      <Link href="/account/reservations" className="justify-self-start text-sm font-semibold underline">My reservations</Link>
      {!settings && !error && <p role="status">Loading booking hours…</p>}
      {settings && <>
        <p className="text-sm text-[#536157]">Times are shown in {settings.timezone}. Each reservation lasts {settings.duration_minutes} minutes.</p>
        <form onSubmit={search} className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]">
          <label className="grid gap-2">Date
            <input className={fieldClass} type="date" required disabled={busy} min={settings.today} max={settings.last_day} value={date}
              onChange={(event) => { setDay(event.target.value); setSlots(undefined); setSuccess(false); }} />
          </label>
          <label className="grid gap-2">Party size
            <input className={fieldClass} type="number" required disabled={busy} min={1} max={50} value={party}
              onChange={(event) => { setParty(Number(event.target.value)); setSlots(undefined); setSuccess(false); }} />
          </label>
          <button className={buttonClass} disabled={busy} type="submit">Find tables</button>
        </form>
      </>}
      {busy && <p role="status">Checking your reservation…</p>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {success && <p role="status" className="rounded bg-[#EAEFE7] p-3">Reservation requested. Your table is held while the restaurant reviews it.</p>}
      {slots?.length === 0 && <p>No tables are available for this date and party size.</p>}
      {settings && !!slots?.length && (
        <form onSubmit={book} className="grid gap-4 border-t border-[#E7E4DC] pt-5">
          <label className="grid gap-2">Available table and time
            <select className={fieldClass} required disabled={busy} value={selected} onChange={(event) => setSelected(event.target.value)}>
              <option value="">Choose a slot</option>
              {slots.map((slot) => {
                const key = `${slot.table_id}/${slot.starts_at}`;
                return <option key={key} value={key}>{restaurantTime(slot.starts_at, settings.timezone)} · {slot.table_name}</option>;
              })}
            </select>
          </label>
          <label className="grid gap-2">Special requests (optional)
            <textarea className={fieldClass} rows={3} maxLength={500} value={requests} onChange={(event) => setRequests(event.target.value)} />
          </label>
          <button className={`${buttonClass} justify-self-start`} disabled={busy || !selected} type="submit">Request reservation</button>
        </form>
      )}
    </div>
  );
}
