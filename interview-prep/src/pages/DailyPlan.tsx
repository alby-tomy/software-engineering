import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllDailyWeeks, getDailyPlan } from '../data/practice';
import { useProgress } from '../hooks/useProgress';
import './DailyPlan.css';

const TASK_ICONS: Record<string, string> = {
  learn: '📖',
  practice: '💻',
  quiz: '🧪',
  review: '🔄',
};

export function DailyPlan() {
  const [selectedWeek, setSelectedWeek] = useState(1);
  const { recordStudySession } = useProgress();
  const [completedTasks, setCompletedTasks] = useState<Set<number>>(new Set());
  const plan = getDailyPlan(selectedWeek);
  const allWeeks = getAllDailyWeeks();

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

  const taskProgress = plan.tasks.length > 0
    ? Math.round((completedTasks.size / plan.tasks.length) * 100)
    : 0;

  return (
    <div className="daily-plan">
      <h1>📅 Daily Study Plan</h1>
      <p className="plan-intro">
        8-week Micro1 Interview Prep schedule. Select a week and complete each task.
      </p>

      <div className="week-selector">
        {allWeeks.map((_, i) => (
          <button
            key={i}
            className={`week-btn ${selectedWeek === i + 1 ? 'active' : ''}`}
            onClick={() => { setSelectedWeek(i + 1); setCompletedTasks(new Set()); }}
          >
            Week {i + 1}
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
          🎉 Week {selectedWeek} complete! {selectedWeek < 8 ? (
            <button onClick={() => { setSelectedWeek(selectedWeek + 1); setCompletedTasks(new Set()); }}>
              Start Week {selectedWeek + 1} →
            </button>
          ) : (
            <span>You're ready for mock interviews!</span>
          )}
        </div>
      )}
    </div>
  );
}
