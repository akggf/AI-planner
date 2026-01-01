"use client";

import { useEffect, useMemo, useState } from "react";

type Course = {
  id: string;
  name: string;
  examDate: string; // YYYY-MM-DD
  difficulty: number; // 1-5
  weight: number; // 1-5
};

const STORAGE_KEY = "asp_courses_v1";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function SetupPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [name, setName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [difficulty, setDifficulty] = useState<number>(3);
  const [weight, setWeight] = useState<number>(3);
  const [error, setError] = useState<string>("");

  // Load from localStorage once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Course[];
      if (Array.isArray(parsed)) setCourses(parsed);
    } catch {
      // ignore bad storage
    }
  }, []);

  // Save to localStorage whenever courses change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
  }, [courses]);

  const sortedCourses = useMemo(() => {
    return [...courses].sort((a, b) => a.examDate.localeCompare(b.examDate));
  }, [courses]);

  function addCourse() {
    setError("");

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a course name.");
      return;
    }
    if (!examDate) {
      setError("Please select an exam date.");
      return;
    }

    const newCourse: Course = {
      id: uid(),
      name: trimmed,
      examDate,
      difficulty,
      weight,
    };

    setCourses((prev) => [newCourse, ...prev]);
    setName("");
    setExamDate("");
    setDifficulty(3);
    setWeight(3);
  }

  function removeCourse(id: string) {
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }

  function addSampleData() {
    const today = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);

    const sample: Course[] = [
      {
        id: uid(),
        name: "Discrete Math",
        examDate: iso(new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000)),
        difficulty: 4,
        weight: 4,
      },
      {
        id: uid(),
        name: "Algorithms",
        examDate: iso(new Date(today.getTime() + 18 * 24 * 60 * 60 * 1000)),
        difficulty: 5,
        weight: 5,
      },
      {
        id: uid(),
        name: "Databases",
        examDate: iso(new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)),
        difficulty: 3,
        weight: 3,
      },
    ];

    setCourses(sample);
  }

  function clearAll() {
    setCourses([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Setup</h1>
        <p className="text-gray-600 mt-2">
          Add your courses and exam dates. We’ll use this to generate a study plan.
        </p>
      </div>

      {/* Form */}
      <section className="rounded-xl border p-6 space-y-4">
        <h2 className="font-semibold text-lg">Add a course</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm text-gray-600">Course name</span>
            <input
              className="w-full rounded-lg border px-3 py-2"
              placeholder="e.g., Linear Algebra"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm text-gray-600">Exam date</span>
            <input
              type="date"
              className="w-full rounded-lg border px-3 py-2"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm text-gray-600">Difficulty (1–5)</span>
            <input
              type="number"
              min={1}
              max={5}
              className="w-full rounded-lg border px-3 py-2"
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm text-gray-600">Importance / Weight (1–5)</span>
            <input
              type="number"
              min={1}
              max={5}
              className="w-full rounded-lg border px-3 py-2"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
            />
          </label>
        </div>

        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <p className="text-sm text-gray-500">
            Tip: Difficulty = how hard it feels, Weight = how important the exam is.
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={addCourse}
            className="rounded-lg bg-black text-white px-4 py-2 text-sm hover:bg-green-700"
          >
            Add course
          </button>

          <button
            onClick={addSampleData}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            Add sample data
          </button>

          <button
            onClick={clearAll}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            Clear all
          </button>
        </div>
      </section>

      {/* List */}
      <section className="rounded-xl border p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Your courses</h2>
          <span className="text-sm text-gray-500">{courses.length} total</span>
        </div>

        {sortedCourses.length === 0 ? (
          <p className="text-gray-600 mt-4">
            No courses yet. Add one above or click “Add sample data”.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-600">
                <tr className="border-b">
                  <th className="py-2">Course</th>
                  <th className="py-2">Exam</th>
                  <th className="py-2">Difficulty</th>
                  <th className="py-2">Weight</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {sortedCourses.map((c) => (
                  <tr key={c.id} className="border-b">
                    <td className="py-3 font-medium">{c.name}</td>
                    <td className="py-3">{c.examDate}</td>
                    <td className="py-3">{c.difficulty}</td>
                    <td className="py-3">{c.weight}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => removeCourse(c.id)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
