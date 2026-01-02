"use client";

import { useEffect, useMemo, useState } from "react";

import { addDays, format, startOfWeek } from "date-fns";

type Course = {
  id: string;
  name: string;
  examDate: string; // YYYY-MM-DD
  difficulty: number; // 1-5
  weight: number; // 1-5
};

type Availability = Record<string, number>;
type AvailabilityByWeek = Record<string, Availability>;

type PlanItem = {
  courseId: string;
  courseName: string;
  minutes: number;
};

type DayPlan = {
  date: string; // YYYY-MM-DD
  items: PlanItem[];
};

const COURSES_KEY = "asp_courses_v1";
const AVAIL_KEY = "asp_availability_by_week_v2"; // from your calendar version
const PLAN_KEY = "asp_generated_plan_v1";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function safeParse<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function weekKeyFromDate(date: Date) {
  // monday of that week as YYYY-MM-DD
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  return format(monday, "yyyy-MM-dd");
}

function daysUntil(dateStr: string) {
  const now = new Date();
  const d = new Date(dateStr + "T00:00:00");
  const diff = d.getTime() - now.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// need score: higher = more time
function needScore(course: Course) {
  const urgency = 1 / Math.min(30, daysUntil(course.examDate)); // cap so it doesn't explode
  return urgency * course.difficulty * course.weight;
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function courseSummary(course: Course) {
  const d = daysUntil(course.examDate);
  return {
    days: d,
    score: needScore(course),
    urgencyLabel:
      d <= 7 ? "very soon" : d <= 14 ? "soon" : d <= 30 ? "upcoming" : "later",
  };
}

function minutesFromHours(h: number) {
  return Math.round(h * 60);
}

// simple rounding to 5 minutes
function round5(x: number) {
  return Math.round(x / 5) * 5;
}
function toSessions(minutes: number) {
  // Convert minutes into realistic sessions.
  // 25/50 are common. We'll do mostly 50-min sessions + small leftover.
  const sessions: number[] = [];
  let remaining = minutes;

  while (remaining >= 50) {
    sessions.push(50);
    remaining -= 50;
  }

  // If leftover is meaningful, keep it
  if (remaining >= 20) sessions.push(remaining);

  return sessions;
}

export default function PlanPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [plan, setPlan] = useState<DayPlan[] | null>(() =>
    typeof window !== "undefined" ? safeParse<DayPlan[] | null>(PLAN_KEY, null) : null
  );

  const weekKey = useMemo(() => weekKeyFromDate(selectedDate), [selectedDate]);
  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);

const [mounted, setMounted] = useState(false);
const [courses, setCourses] = useState<Course[]>([]);
const [availabilityByWeek, setAvailabilityByWeek] = useState<AvailabilityByWeek>({});
const explanations = useMemo(() => {
  if (courses.length === 0) return [];
  const items = courses.map((c) => {
    const s = courseSummary(c);
    return {
      name: c.name,
      days: s.days,
      urgencyLabel: s.urgencyLabel,
      difficulty: c.difficulty,
      weight: c.weight,
      score: s.score,
    };
  });

  const maxScore = Math.max(...items.map((x) => x.score), 1);
  return items
    .map((x) => ({
      ...x,
      percent: Math.round((x.score / maxScore) * 100),
    }))
    .sort((a, b) => b.score - a.score);
}, [courses]);

useEffect(() => {
  setMounted(true);
  setCourses(safeParse<Course[]>(COURSES_KEY, []));
  setAvailabilityByWeek(safeParse<AvailabilityByWeek>(AVAIL_KEY, {}));
}, []);

const availability = availabilityByWeek[weekKey] ?? null;



  const totalWeekMinutes = useMemo(() => {
    if (!availability) return 0;
    return DAYS.reduce((sum, d) => sum + minutesFromHours(availability[d] ?? 0), 0);
  }, [availability]);
if (!mounted) return null;
  function generatePlan() {
    if (!availability || courses.length === 0) return;

    const scores = courses.map((c) => ({ c, s: needScore(c) }));
    const totalScore = scores.reduce((sum, x) => sum + x.s, 0) || 1;

    const weekPlan: DayPlan[] = DAYS.map((day, i) => {
      const date = format(addDays(weekStart, i), "yyyy-MM-dd");
      const minutesAvailable = minutesFromHours(availability[day] ?? 0);

      // allocate minutes across courses by score
      const items = scores
        .map(({ c, s }) => {
          const share = s / totalScore;
          const minutes = round5(minutesAvailable * share);
          return {
            courseId: c.id,
            courseName: c.name,
            minutes,
          };
        })
        // remove tiny items
        .filter((x) => x.minutes >= 15)
        // limit to 3 courses per day to keep it realistic
        .sort((a, b) => b.minutes - a.minutes)
        .slice(0, 3);

      // fix rounding drift (ensure total <= available)
      const used = items.reduce((sum, x) => sum + x.minutes, 0);
      if (used > minutesAvailable && items.length > 0) {
        const diff = used - minutesAvailable;
        items[0].minutes = Math.max(15, items[0].minutes - diff);
      }

      return { date, items };
    });

    setPlan(weekPlan);
    localStorage.setItem(PLAN_KEY, JSON.stringify(weekPlan));
  }

  function clearPlan() {
    setPlan(null);
    localStorage.removeItem(PLAN_KEY);
  }

  const canGenerate = courses.length > 0 && availability && totalWeekMinutes > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Plan</h1>
        <p className="text-gray-600 mt-2">
          Generate a 7-day study plan based on your courses + weekly availability.
        </p>
      </div>

      <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <label className="space-y-1">
            <span className="text-sm text-gray-600">Week starting</span>
            <input
              type="date"
              value={format(weekStart, "yyyy-MM-dd")}
              onChange={(e) => setSelectedDate(new Date(e.target.value + "T00:00:00"))}
              className="rounded-lg border px-3 py-2"
            />
          </label>

          <div className="text-sm text-gray-600">
            Courses: <span className="font-semibold">{courses.length}</span> · Weekly time:{" "}
            <span className="font-semibold">{Math.round(totalWeekMinutes / 60)}</span> hrs
          </div>
        </div>

        {!availability ? (
          <p className="text-sm text-red-600">
            No availability set for this week yet. Go to <a className="underline" href="/availability">Availability</a>.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={generatePlan}
            disabled={!canGenerate}
            className={`rounded-lg px-4 py-2 text-sm text-white ${
              canGenerate ? "bg-black hover:bg-gray-900" : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            Generate plan
          </button>

          <button
            onClick={clearPlan}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            Clear plan
          </button>
        </div>

        <p className="text-sm text-gray-500">
          The algorithm prioritizes courses that are harder, more important, and closer to the exam.
        </p>
        {courses.length > 0 && (
  <div className="mt-4 rounded-xl border bg-gray-50 p-4">
    <div className="font-semibold">Why this plan?</div>
    <p className="text-sm text-gray-600 mt-1">
      We prioritize courses with closer exams, higher difficulty, and higher importance.
    </p>

    <div className="mt-3 space-y-3">
      {explanations.slice(0, 5).map((x) => (
        <div key={x.name}>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{x.name}</span>
            <span className="text-gray-600">
              exam in {x.days} days · difficulty {x.difficulty}/5 · weight {x.weight}/5
            </span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-white border overflow-hidden">
            <div
              className="h-full bg-black"
              style={{ width: `${clamp(x.percent, 5, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  </div>
)}

      </section>

      {/* Output */}
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-lg">This week</h2>

        {!plan ? (
          <p className="text-gray-600 mt-3">
            No plan generated yet. Click “Generate plan”.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {plan.map((d) => (
              <div key={d.date} className="rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{format(new Date(d.date), "EEE, MMM d")}</div>
                  <div className="text-sm text-gray-500">
                    {d.items.reduce((s, x) => s + x.minutes, 0)} min
                  </div>
                </div>

                {d.items.length === 0 ? (
                  <p className="text-sm text-gray-500 mt-2">Rest day / no study time set.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {d.items.map((it) => (
                      <li key={it.courseId} className="text-sm">
  <div className="flex items-center justify-between">
    <span className="font-medium">{it.courseName}</span>
    <span className="text-gray-600">{it.minutes} min</span>
  </div>

  <div className="mt-1 flex flex-wrap gap-2">
    {toSessions(it.minutes).map((m, idx) => (
      <span
        key={idx}
        className="rounded-full border px-2 py-1 text-xs text-gray-700"
      >
        {m} min
      </span>
    ))}
  </div>
</li>

                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
