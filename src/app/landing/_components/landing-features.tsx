import {
  CalendarDays,
  ListTodo,
  ClipboardList,
  BarChart3,
  Check,
} from "lucide-react";

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Monthly habit calendar",
    body: "Track every habit on one calendar. Tick a day with a single click, tag habits with color-coded categories and goals, and watch the month fill in as your done counter climbs.",
    visual: "calendar",
  },
  {
    icon: ListTodo,
    title: "Daily planner",
    body: "Time-block each day with tasks that move through planned, in progress and done. A Saturday-start week strip keeps the whole week in view.",
    visual: "planner",
  },
  {
    icon: ClipboardList,
    title: "Milestones",
    body: "Break any habit into milestones with start and target dates, status tracking and details — so big goals always have a next step.",
    visual: "milestones",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    body: "Completion rates, daily scores, current and best streaks, time planned from tasks, and a GitHub-style yearly heatmap. Progress you can actually see.",
    visual: "analytics",
  },
];

const STEPS = [
  { n: "01", title: "Add your habits", body: "Pick small daily actions, tag them by category, set a goal." },
  { n: "02", title: "Tick the day", body: "One click on the calendar logs today. Notes stay attached to each habit." },
  { n: "03", title: "Watch it stack", body: "Streaks, scores and your yearly heatmap grow with every filled cell." },
];

const BAR_HEIGHTS = ["32%", "46%", "38%", "58%", "50%", "72%", "64%", "84%"];

function FeatureVisual({ kind }: { kind: string }) {
  if (kind === "calendar") {
    return (
      <div aria-hidden className="grid size-full grid-cols-14 gap-1.5 place-content-center">
        {Array.from({ length: 14 }, (_, i) => {
          const filled = [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1][i];
          return (
            <span
              key={i}
              className={`size-4 rounded-[4px] ${filled ? "bg-primary" : "bg-muted"}`}
            />
          );
        })}
      </div>
    );
  }
  if (kind === "planner") {
    return (
      <div aria-hidden className="flex h-full items-center justify-center px-4">
        <div className="flex w-full max-w-56 items-center justify-between rounded-md border bg-background px-2.5 py-1.5 text-xs">
          <span className="flex items-center gap-1.5 text-foreground">
            <span className="inline-block size-2 rounded-[3px] bg-blue-500" />
            Deep work
          </span>
          <span className="rounded-full bg-emerald-500 px-2 py-0.5 font-medium text-white">
            Done
          </span>
        </div>
      </div>
    );
  }
  if (kind === "milestones") {
    return (
      <div aria-hidden className="flex h-full flex-col justify-center gap-2 px-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex size-4 items-center justify-center rounded-[4px] bg-emerald-500 text-white">
            <Check className="size-3" />
          </span>
          Weekly runs
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex size-4 items-center justify-center rounded-[4px] bg-emerald-500 text-white">
            <Check className="size-3" />
          </span>
          15K week
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-[62%] rounded-full bg-primary" />
        </div>
      </div>
    );
  }
  return (
    <div
      aria-hidden
      className="flex h-full items-end justify-center gap-1.5 px-6 pb-4"
    >
      {BAR_HEIGHTS.map((h, i) => (
        <span
          key={i}
          className="w-3 rounded-t-[3px] bg-primary"
          style={{ height: h }}
        />
      ))}
    </div>
  );
}

export function LandingFeatures() {
  return (
    <section id="features" className="scroll-mt-16 py-12 sm:py-16">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Features
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Everything you need to keep the streak alive
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          One app for habits, daily planning, long-running goals and the
          numbers behind them — all scoped to you, all in one place.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="rounded-2xl border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="size-5" />
                </span>
                <h3 className="font-semibold tracking-tight">{f.title}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
              <div className="mt-4 h-20 rounded-lg bg-muted/50">
                <FeatureVisual kind={f.visual} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-12 grid gap-6 rounded-2xl border bg-muted/40 p-6 sm:grid-cols-3 sm:p-8">
        {STEPS.map((s) => (
          <div key={s.n}>
            <span className="text-sm font-semibold tabular-nums text-muted-foreground">
              {s.n}
            </span>
            <h3 className="mt-1 font-semibold tracking-tight">{s.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
