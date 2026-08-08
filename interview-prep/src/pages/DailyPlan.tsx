import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getDailyPlan } from '../data/practice';
import { sixMonthDailyPlans } from '../data/six-month-daily-plan';
import { sixMonthCourse } from '../data/six-month-course';
import { useProgress } from '../hooks/useProgress';
import './DailyPlan.css';

type PlanType = 'six-month' | 'micro1';

const TASK_ICONS: Record<string, string> = {
  learn: '📖',
  practice: '💻',
  quiz: '🧪',
  review: '🔄',
  project: '🛠️',
};

export function DailyPlan() {
  const [planType, setPlanType] = useState<PlanType>('six-month');
  const [selectedWeek, setSelectedWeek] = useState(1);
  const { recordStudySession } = useProgress();
  const [completedTasks, setCompletedTasks] = useState<Set<number>>(new Set());

  const isSixMonth = planType === 'six-month';
  const maxWeeks = isSixMonth ? 24 : 8;
  const plan = isSixMonth
    ? sixMonthDailyPlans.find((w) => w.week === selectedWeek) ?? sixMonthDailyPlans[0]
    : getDailyPlan(selectedWeek);

  function toggleTask(index: number) {
    setCompletedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else {
        next.add(index);
        recordStudySession();
      }
      return next;
    });
  }

  function switchPlan(type: PlanType) {
    setPlanType(type);
    setSelectedWeek(1);
    setCompletedTasks(new Set());
  }

  const taskProgress = plan.tasks.length > 0
    ? Math.round((completedTasks.size / plan.tasks.length) * 100)
    : 0;

  const currentMonth = isSixMonth && 'month' in plan ? plan.month : undefined;

  return (
    <div className="daily-plan">
      <h1>📅 Daily Study Plan</h1>
      <p className="plan-intro">
        {isSixMonth
          ? `${sixMonthCourse.title} — 24-week schedule with daily tasks. ~${sixMonthCourse.hoursPerWeek} recommended.`
          : '8-week Micro1 Interview Prep schedule. Select a week and complete each task.'}
      </p>

      <div className="plan-type-selector">
        <button
          className={`plan-type-btn ${isSixMonth ? 'active' : ''}`}
          onClick={() => switchPlan('six-month')}
        >
          🎓 6-Month Course (24 weeks)
        </button>
        <button
          className={`plan-type-btn ${!isSixMonth ? 'active' : ''}`}
          onClick={() => switchPlan('micro1')}
        >
          ⚡ Micro1 Prep (8 weeks)
        </button>
        {!isSixMonth && (
          <Link to="/course" className="plan-course-link">
            View full 6-month roadmap →
          </Link>
        )}
      </div>

      {isSixMonth && (
        <div className="month-labels">
          {sixMonthCourse.phases.map((phase) => (
            <button
              key={phase.month}
              className={`month-label ${currentMonth === phase.month ? 'active' : ''}`}
              onClick={() => {
                const firstWeek = phase.weeks[0]?.week ?? 1;
                setSelectedWeek(firstWeek);
                setCompletedTasks(new Set());
              }}
            >
              M{phase.month}
            </button>
          ))}
        </div>
      )}

      <div className="week-selector">
        {Array.from({ length: maxWeeks }, (_, i) => i + 1).map((week) => (
          <button
            key={week}
            className={`week-btn ${selectedWeek === week ? 'active' : ''}`}
            onClick={() => { setSelectedWeek(week); setCompletedTasks(new Set()); }}
          >
            W{week}
          </button>
        ))}
      </div>

      <div className="plan-header">
        <h2>{plan.title}</h2>
        <div className="plan-progress">
          <span>{completedTasks.size}/{plan.tasks.length} tasks</span>
          <div className="plan-progress-bar">
            <div className="plan-progress-fill" style={{ width: `${taskProgress}%` }} />
          </div>
        </div>
      </div>

      <div className="task-list">
        {plan.tasks.map((task, i) => (
          <div
            key={i}
            className={`task-item ${completedTasks.has(i) ? 'done' : ''}`}
          >
            <button
              className="task-check"
              onClick={() => toggleTask(i)}
              aria-label="Mark complete"
            >
              {completedTasks.has(i) ? '✓' : ''}
            </button>
            <div className="task-content">
              <div className="task-meta">
                <span className="task-type">{TASK_ICONS[task.type]} {task.type}</span>
                <span className="task-duration">⏱️ {task.duration}</span>
              </div>
              <Link to={task.link} className="task-label">{task.label}</Link>
            </div>
          </div>
        ))}
      </div>

      {taskProgress === 100 && (
        <div className="week-complete">
          🎉 Week {selectedWeek} complete! {selectedWeek < maxWeeks ? (
            <button onClick={() => { setSelectedWeek(selectedWeek + 1); setCompletedTasks(new Set()); }}>
              Start Week {selectedWeek + 1} →
            </button>
          ) : (
            <span>{isSixMonth ? 'You completed the full 6-month course!' : "You're ready for mock interviews!"}</span>
          )}
        </div>
      )}
    </div>
  );
}
