"use client";

import { useEffect, useState } from "react";

type Availability = Record<string, number>;

const STORAGE_KEY = "asp_availability_v1";

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

export default function AvailabilityPage() {
  const [availability, setAvailability] = useState<Availability>(defaultAvailability);

  // Load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Availability;
      if (parsed && typeof parsed === "object") setAvailability({ ...defaultAvailability, ...parsed });
    } catch {
      // ignore
    }
  }, []);

  // Save
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(availability));
  }, [availability]);

  const totalHours = DAYS.reduce((sum, d) => sum + (availability[d] ?? 0), 0);

  function setHours(day: string, hours: number) {
    const safe = Number.isFinite(hours) ? Math.min(10, Math.max(0, hours)) : 0;
    setAvailability((prev) => ({ ...prev, [day]: safe }));
  }

  function reset() {
    setAvailability(defaultAvailability);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Availability</h1>
        <p className="text-gray-600 mt-2">
          Set how many hours you can study each day (0–10). This will shape your plan.
        </p>
      </div>

      <section className="rounded-xl border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Weekly hours</h2>
          <div className="text-sm text-gray-600">
            Total: <span className="font-semibold">{totalHours}</span> hrs/week
          </div>
        </div>

        <div className="grid gap-3">
          {DAYS.map((day) => (
            <div key={day} className="flex items-center justify-between gap-4">
              <div className="w-16 font-medium">{day}</div>

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
          ))}
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={reset}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            Reset to default
          </button>
        </div>

        <p className="text-sm text-gray-500">
          Tip: Be honest. A realistic plan beats an “ambitious” one you won’t follow.
        </p>
      </section>
    </div>
  );
}
