import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, getHours, getMinutes } from 'date-fns';
import {
  Plus,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Trash2,
  Copy,
  Check,
  Laptop,
  Sparkles,
  Clock,
  User,
  ExternalLink,
  Link2,
  X,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { parseTimeToMinutes, getEffectiveTimetable } from './ScheduleTab';
import { triggerHaptic } from '../utils/haptics';

const KANBAN_COLUMNS = [
  { id: 'todo', title: 'To Do', badgeColor: 'bg-white/10 text-gray-200' },
  {
    id: 'in_progress',
    title: 'In the zone 🎧',
    badgeColor: 'bg-amber-500/20 text-amber-300',
  },
  {
    id: 'done',
    title: 'Crushed it! ✨',
    badgeColor: 'bg-emerald-500/20 text-emerald-300',
  },
];

export function AcademicsTab() {
  const timetable = useStore((state) => state.timetable);
  const customClasses = useStore((state) => state.customClasses);
  const scheduleOverrides = useStore((state) => state.scheduleOverrides);
  const vleLinks = useStore((state) => state.vleLinks);
  const setVleLink = useStore((state) => state.setVleLink);

  const rawTasks = useStore((state) => state.tasks);
  const tasks = Array.isArray(rawTasks) ? rawTasks : [];
  const addTask = useStore((state) => state.addTask);
  const moveTask = useStore((state) => state.moveTask);
  const deleteTask = useStore((state) => state.deleteTask);

  const [now, setNow] = useState(() => new Date());
  const [taskTitle, setTaskTitle] = useState('');
  const [courseTag, setCourseTag] = useState('');
  const [activeColumn, setActiveColumn] = useState('todo');
  const [toastMessage, setToastMessage] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Modal state for adding/editing a VLE link
  const [editingVleClass, setEditingVleClass] = useState(null);
  const [vleUrlInput, setVleUrlInput] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const currentDayName = format(now, 'EEEE');
  const currentTimeInMinutes = getHours(now) * 60 + getMinutes(now);

  const effectiveTimetable = useMemo(
    () => getEffectiveTimetable(timetable, customClasses, scheduleOverrides),
    [timetable, customClasses, scheduleOverrides]
  );

  // Smart Gap Nudges (> 60 minutes AND gap start time strictly > current time)
  const studyGaps = useMemo(() => {
    if (!Array.isArray(effectiveTimetable) || effectiveTimetable.length === 0)
      return [];

    const todaysClasses = effectiveTimetable
      .filter(
        (cls) =>
          String(cls.day || '').trim().toLowerCase() ===
          currentDayName.toLowerCase()
      )
      .map((cls) => {
        const startMins = parseTimeToMinutes(cls.startTime);
        const endMins = parseTimeToMinutes(cls.endTime, startMins);
        return { ...cls, startMins, endMins };
      })
      .sort((a, b) => a.startMins - b.startMins);

    if (todaysClasses.length < 2) return [];

    const gaps = [];
    for (let i = 0; i < todaysClasses.length - 1; i++) {
      const currentClass = todaysClasses[i];
      const nextClass = todaysClasses[i + 1];
      const gapStartMins = currentClass.endMins;
      const gapMinutes = nextClass.startMins - gapStartMins;

      if (gapMinutes > 60 && gapStartMins > currentTimeInMinutes) {
        const rawHours = gapMinutes / 60;
        const formattedHours = Number.isInteger(rawHours)
          ? String(rawHours)
          : rawHours.toFixed(1).replace(/\.0$/, '');

        gaps.push({
          id: `${currentClass.id}-${nextClass.id}`,
          gapMinutes,
          hoursLabel: formattedHours,
          fromTime: currentClass.endTime,
          toTime: nextClass.startTime,
          afterCourse: currentClass.course,
          beforeCourse: nextClass.course,
        });
      }
    }

    return gaps;
  }, [effectiveTimetable, currentDayName, currentTimeInMinutes]);

  // Filter VLE classes from effective timetable
  const vleClasses = useMemo(() => {
    if (!Array.isArray(effectiveTimetable)) return [];
    return effectiveTimetable.filter((cls) => cls.type === 'vle');
  }, [effectiveTimetable]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2600);
  };

  const handleOpenAddLinkModal = (vleClass) => {
    setEditingVleClass(vleClass);
    setVleUrlInput(vleLinks?.[vleClass.id] || '');
  };

  const handleSaveVleLink = (e) => {
    e.preventDefault();
    if (!editingVleClass) return;

    let formattedUrl = vleUrlInput.trim();
    if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    setVleLink(editingVleClass.id, formattedUrl);
    setEditingVleClass(null);
    setVleUrlInput('');
    showToast('Crushed it! VLE link saved 💻');
  };

  const handleCopyVleLink = async (e, id, href) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(href);
      }
    } catch {
      // Fallback if clipboard API is restricted
    }
    setCopiedId(id);
    showToast('Link copied! 💻');
    setTimeout(() => {
      setCopiedId(null);
    }, 2400);
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    addTask({ title: taskTitle, courseTag });
    setTaskTitle('');
    setCourseTag('');
  };

  const getNextStatus = (current) => {
    if (current === 'todo') return 'in_progress';
    if (current === 'in_progress') return 'done';
    return null;
  };

  const getPrevStatus = (current) => {
    if (current === 'done') return 'in_progress';
    if (current === 'in_progress') return 'todo';
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-widest text-amber-400/80">
          Study &amp; Focus Hub
        </p>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-white">
          Academics 📚
        </h1>
      </header>

      {/* Step 1: "My VLE Links" Section at Top of Academics Tab */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Laptop className="h-5 w-5 text-amber-400" />
            <h2 className="font-serif text-xl font-bold text-white">
              My VLE Links
            </h2>
          </div>
          <span className="text-xs text-gray-400">
            {vleClasses.length} virtual {vleClasses.length === 1 ? 'class' : 'classes'}
          </span>
        </div>

        {vleClasses.length === 0 ? (
          <div className="glass-card p-5 text-center text-sm text-gray-400">
            No VLE classes found yet. Upload your timetable in Profile to populate your virtual sessions 💻
          </div>
        ) : (
          <div className="space-y-3">
            {vleClasses.map((vle) => {
              const savedLink = vleLinks?.[vle.id] || '';
              const isCopied = copiedId === vle.id;

              return (
                <div
                  key={vle.id}
                  className="glass-card flex items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-serif text-base font-bold text-white">
                        {vle.course}
                      </span>
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                        {vle.day}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-300">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-amber-400/80" />
                        {vle.startTime} – {vle.endTime}
                      </span>
                      <span className="flex items-center gap-1 truncate">
                        <User className="h-3.5 w-3.5 text-amber-400/80" />
                        {vle.lecturer}
                      </span>
                    </div>
                  </div>

                  {/* Link Action: "Add Link" if unsaved, or "Join Class" <a> + Copy button if saved */}
                  <div className="flex flex-shrink-0 items-center gap-1.5">
                    {!savedLink ? (
                      <button
                        type="button"
                        onClick={() => handleOpenAddLinkModal(vle)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/35 bg-amber-500/20 px-3.5 py-2 text-xs font-medium text-amber-300 transition hover:bg-amber-500/30"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        <span>Add Link</span>
                      </button>
                    ) : (
                      <>
                        <a
                          href={savedLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-500/25 px-3.5 py-2 text-xs font-semibold text-amber-200 shadow-[0_0_14px_rgba(245,158,11,0.2)] transition hover:bg-amber-500/35"
                        >
                          <span>Join Class</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>

                        <button
                          type="button"
                          onClick={(e) =>
                            handleCopyVleLink(e, vle.id, savedLink)
                          }
                          title="Copy link"
                          aria-label="Copy link"
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-amber-300 transition hover:border-amber-400/40 hover:bg-amber-500/20"
                        >
                          {isCopied ? (
                            <Check className="h-4 w-4 text-emerald-300" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Smart Gap Nudges (Future Gaps Only) */}
      {studyGaps.length > 0 && (
        <section className="space-y-3">
          {studyGaps.map((gap) => (
            <motion.div
              key={gap.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card border border-amber-400/50 p-5 shadow-[0_0_25px_rgba(245,158,11,0.18)]"
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-300">
                  <Sparkles className="h-3 w-3" />
                  Smart Study Gap ({gap.fromTime} – {gap.toTime})
                </span>
              </div>
              <p className="font-serif text-lg font-semibold text-white">
                You have {gap.hoursLabel} hours free. Time to open the laptop and lock in 🧠.
              </p>
              <p className="mt-1 text-xs text-gray-300">
                Between <span className="text-amber-300">{gap.afterCourse}</span> and{' '}
                <span className="text-amber-300">{gap.beforeCourse}</span> today.
              </p>
            </motion.div>
          ))}
        </section>
      )}

      {/* Add VLE Link Modal */}
      <AnimatePresence>
        {editingVleClass && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-md"
          >
            <motion.form
              initial={{ scale: 0.94, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 12 }}
              onSubmit={handleSaveVleLink}
              className="glass-card w-full max-w-md space-y-4 border border-amber-400/30 bg-charcoal/95 p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-xl font-bold text-white">
                    Add VLE Link 💻
                  </h3>
                  <p className="text-xs text-amber-300">
                    {editingVleClass.course} ({editingVleClass.day},{' '}
                    {editingVleClass.startTime} – {editingVleClass.endTime})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingVleClass(null)}
                  className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-300">
                  Zoom / Teams / VLE Portal URL
                </label>
                <input
                  type="url"
                  required
                  value={vleUrlInput}
                  onChange={(e) => setVleUrlInput(e.target.value)}
                  placeholder="https://zoom.us/j/..."
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:border-amber-400/60 focus:outline-none"
                />
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingVleClass(null)}
                  className="flex-1 rounded-xl border border-white/15 bg-white/5 py-2.5 text-xs font-medium text-gray-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl border border-amber-400/40 bg-amber-500/25 py-2.5 text-xs font-semibold text-amber-200 shadow-[0_0_16px_rgba(245,158,11,0.25)] hover:bg-amber-500/35"
                >
                  Save Link
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Survival Tracker (Kanban Board) */}
      <section className="glass-card space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold text-white">
              Survival Tracker
            </h2>
            <p className="text-xs text-gray-400">
              One assignment at a time, babe. You’ve got this.
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-amber-300">
            {tasks.filter((t) => t.status === 'done').length}/{tasks.length} done
          </span>
        </div>

        {/* Add Task Form */}
        <form onSubmit={handleAddTask} className="space-y-2.5">
          <div className="flex gap-2">
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Add a task (e.g., Read RP 377 slides)..."
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-gray-400 focus:border-amber-400/60 focus:outline-none"
            />
            <input
              type="text"
              value={courseTag}
              onChange={(e) => setCourseTag(e.target.value)}
              placeholder="Course tag"
              className="w-28 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-gray-400 focus:border-amber-400/60 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-500/20 py-2.5 text-sm font-medium text-amber-300 transition hover:bg-amber-500/30"
          >
            <Plus className="h-4 w-4" />
            Add to Survival Tracker
          </button>
        </form>

        {/* Column Selector Tabs */}
        <div className="flex gap-1.5 rounded-xl bg-black/30 p-1">
          {KANBAN_COLUMNS.map((col) => {
            const count = tasks.filter((t) => t.status === col.id).length;
            const isSelected = activeColumn === col.id;
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => setActiveColumn(col.id)}
                className={`flex-1 rounded-lg py-2 text-xs font-medium transition ${
                  isSelected
                    ? 'border border-amber-400/30 bg-amber-500/25 text-amber-300 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {col.title} ({count})
              </button>
            );
          })}
        </div>

        {/* Kanban Column Cards */}
        <div className="space-y-3">
          {KANBAN_COLUMNS.map((column) => {
            if (column.id !== activeColumn) return null;
            const columnTasks = tasks.filter((t) => t.status === column.id);

            return (
              <div key={column.id} className="space-y-2.5">
                {columnTasks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-8 text-center text-xs text-gray-400">
                    {column.id === 'todo' &&
                      'No tasks queued yet. Add something small to start!'}
                    {column.id === 'in_progress' &&
                      'Nothing in progress right now. Move a task here when you lock in 🎧'}
                    {column.id === 'done' &&
                      'Completed tasks will stack up here as you crush them ✨'}
                  </div>
                ) : (
                  columnTasks.map((task) => {
                    const prevStatus = getPrevStatus(task.status);
                    const nextStatus = getNextStatus(task.status);

                    return (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p
                              className={`text-sm font-medium ${
                                task.status === 'done'
                                  ? 'text-gray-400 line-through'
                                  : 'text-white'
                              }`}
                            >
                              {task.title}
                            </p>
                            {task.courseTag && (
                              <span className="rounded-md border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                                {task.courseTag}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {prevStatus && (
                            <button
                              type="button"
                              onClick={() => {
                                moveTask(task.id, prevStatus);
                                setActiveColumn(prevStatus);
                              }}
                              title="Move back"
                              className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-gray-300 hover:bg-white/10 hover:text-white"
                            >
                              <ArrowLeft className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {nextStatus && (
                            <button
                              type="button"
                              onClick={() => {
                                if (nextStatus === 'done') {
                                  triggerHaptic([15, 30, 15]);
                                }
                                moveTask(task.id, nextStatus);
                                setActiveColumn(nextStatus);
                              }}
                              title="Advance task"
                              className="flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-500/20 px-2.5 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/30"
                            >
                              {nextStatus === 'done' ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>Done</span>
                                </>
                              ) : (
                                <>
                                  <span>Start</span>
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </>
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteTask(task.id)}
                            title="Delete task"
                            className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-gray-400 hover:border-rose-500/40 hover:bg-rose-500/20 hover:text-rose-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="glass-card fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-xs border-amber-400/40 bg-charcoal/90 px-4 py-3 text-center text-xs font-medium text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AcademicsTab;
