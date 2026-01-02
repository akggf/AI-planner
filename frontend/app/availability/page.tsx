"use client";

import { useEffect, useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import {
  addDays,
  endOfWeek,
  format,
  startOfWeek,
} from "date-fns";

type Availability = Record<string, number>;
type AvailabilityByWeek = Record<string, Availability>;

const STORAGE_KEY = "asp_availability_by_week_v2";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const defaultAvailability: Availability = {
  Mon: 2,
  Tue: 2,
  Wed: 2,
  Thu: 2,
  Fri: 2,
  Sat: 3,
  Sun: 2,
};

function weekKeyFromDate(date: Date) {
  // key based on Monday of that week (YYYY-MM-DD)
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  return format(monday, "yyyy-MM-dd");
}

export default function AvailabilityPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [byWeek, setByWeek] = useState<AvailabilityByWeek>({});

  // Load all weeks
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as AvailabilityByWeek;
      if (parsed && typeof parsed === "object") setByWeek(parsed);
    } catch {
      // ignore
    }
  }, []);

  // Save all weeks
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(byWeek));
  }, [byWeek]);

  const monday = useMemo(
    () => startOfWeek(selectedDate, { weekStartsOn: 1 }),
    [selectedDate]
  );
  const sunday = useMemo(
    () => endOfWeek(selectedDate, { weekStartsOn: 1 }),
    [selectedDate]
  );
  const weekKey = useMemo(() => weekKeyFromDate(selectedDate), [selectedDate]);

  const availability = useMemo(() => {
    return byWeek[weekKey] ?? defaultAvailability;
  }, [byWeek, weekKey]);

  const totalHours = DAYS.reduce((sum, d) => sum + (availability[d] ?? 0), 0);

  function setHours(day: string, hours: number) {
    const safe = Number.isFinite(hours) ? Math.min(10, Math.max(0, hours)) : 0;
    setByWeek((prev) => ({
      ...prev,
      [weekKey]: {
        ...(prev[weekKey] ?? defaultAvailability),
        [day]: safe,
      },
    }));
  }

  function resetWeek() {
    setByWeek((prev) => ({
      ...prev,
      [weekKey]: { ...defaultAvailability },
    }));
  }

  function copyFromPreviousWeek() {
    const keys = Object.keys(byWeek).sort();
    const idx = keys.indexOf(weekKey);
    const prevKey = idx > 0 ? keys[idx - 1] : keys.at(-2); // fallback
    if (!prevKey) return;

    setByWeek((prev) => ({
      ...prev,
      [weekKey]: { ...(prev[prevKey] ?? defaultAvailability) },
    }));
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Availability</h1>
        <p className="text-gray-600 mt-2">
          Pick any date on the calendar — we’ll set availability for that whole week.
        </p>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        {/* Calendar card */}
        <div className="rounded-xl border p-6">
          <h2 className="font-semibold text-lg">Choose a week</h2>
          <p className="text-sm text-gray-600 mt-1">
            Selected week:{" "}
            <span className="font-medium">
              {format(monday, "MMM d")} – {format(sunday, "MMM d, yyyy")}
            </span>
          </p>

          <div className="mt-4">
            <DayPicker
  mode="single"
  selected={selectedDate}
  onSelect={(d) => d && setSelectedDate(d)}
  weekStartsOn={1}
  showOutsideDays
  modifiers={{
    week: { from: monday, to: sunday },
  }}
  modifiersClassNames={{
    week: "bg-gray-100",
  }}
  classNames={{
    months: "flex flex-col",
    month: "space-y-4",
    caption: "flex items-center justify-between",
    caption_label: "text-sm font-semibold",
    nav: "flex items-center gap-2",
    nav_button:
      "h-8 w-8 rounded-md border bg-white hover:bg-gray-50 flex items-center justify-center",
    table: "w-full border-collapse",
    head_row: "flex",
    head_cell:
      "w-10 text-[11px] font-medium text-gray-500 text-center uppercase",
    row: "flex w-full mt-1",
    cell: "w-10 h-10 text-center p-0 relative",
    day: "w-10 h-10 rounded-md hover:bg-gray-100 font-medium",
    day_selected: "bg-black text-white hover:bg-black",
    day_today: "border border-gray-300",
    day_outside: "text-gray-300",
  }}
/>

          </div>
        </div>

        {/* Availability controls */}
        <div className="rounded-xl border p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Hours for this week</h2>
            <div className="text-sm text-gray-600">
              Total: <span className="font-semibold">{totalHours}</span> hrs/week
            </div>
          </div>

          <div className="grid gap-3">
            {DAYS.map((day, i) => {
              const dateLabel = format(addDays(monday, i), "MMM d");
              return (
                <div key={day} className="flex items-center justify-between gap-4">
                  <div className="w-28">
                    <div className="font-medium">{day}</div>
                    <div className="text-xs text-gray-500">{dateLabel}</div>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={availability[day] ?? 0}
                    onChange={(e) => setHours(day, Number(e.target.value))}
                    className="w-full"
                  />

                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={availability[day] ?? 0}
                    onChange={(e) => setHours(day, Number(e.target.value))}
                    className="w-20 rounded-lg border px-3 py-2"
                  />
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button onClick={resetWeek} className="rounded-lg border px-4 py-2 text-sm">
              Reset this week
            </button>
            <button
              onClick={copyFromPreviousWeek}
              className="rounded-lg border px-4 py-2 text-sm"
            >
              Copy from previous week
            </button>
          </div>

          <p className="text-sm text-gray-500">
            Tip: Click different weeks on the calendar to set different schedules (travel, exams, holidays).
          </p>
        </div>
      </section>
    </div>
  );
}
