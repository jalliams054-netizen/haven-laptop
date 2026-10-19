import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Bell,
  BookHeart,
  Upload,
  Calendar,
  Plus,
  X,
  Trash2,
  Clock,
  MapPin,
  Check,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { parseExcelFile } from '../utils/parseTimetable';
import { triggerHaptic } from '../utils/haptics';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export function ProfileTab() {
  const settings = useStore((state) => state.settings);
  const toggleSetting = useStore((state) => state.toggleSetting);
  const personalNotes = useStore((state) => state.personalNotes);
  const setPersonalNotes = useStore((state) => state.setPersonalNotes);

  const timetable = useStore((state) => state.timetable);
  const setTimetable = useStore((state) => state.setTimetable);
  const scheduleOverrides = useStore((state) => state.scheduleOverrides);
  const updateClassOverride = useStore((state) => state.updateClassOverride);
  const customClasses = useStore((state) => state.customClasses);
  const addCustomClass = useStore((state) => state.addCustomClass);
  const removeCustomClass = useStore((state) => state.removeCustomClass);

  // Step 2: Dropdown state for selecting a single class to customize
  const [selectedClassId, setSelectedClassId] = useState('');
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [newClassForm, setNewClassForm] = useState({
    day: 'Monday',
    startTime: '8:00',
    endTime: '10:00',
    course: '',
    lecturer: '',
    room: '',
  });

  // Step 3: Debounced 1000ms Auto-Save state for "My Notes"
  const [notesDraft, setNotesDraft] = useState(personalNotes || '');
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const debounceTimerRef = useRef(null);
  const fadeTimerRef = useRef(null);

  const [feedbackBanner, setFeedbackBanner] = useState(null);
  const fileInputRef = useRef(null);

  // Keep draft synced if external store initializes
  useEffect(() => {
    setNotesDraft(personalNotes || '');
  }, [personalNotes]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  const handleNotesChange = (e) => {
    const nextText = e.target.value;
    setNotesDraft(nextText);
    setShowSavedIndicator(false);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setPersonalNotes(nextText);
      setShowSavedIndicator(true);

      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
      }
      fadeTimerRef.current = setTimeout(() => {
        setShowSavedIndicator(false);
      }, 2200);
    }, 1000);
  };

  const showFeedback = (message) => {
    setFeedbackBanner(message);
    setTimeout(() => {
      setFeedbackBanner(null);
    }, 3200);
  };

  const allManagedClasses = useMemo(() => {
    const base = Array.isArray(timetable) ? timetable : [];
    const custom = Array.isArray(customClasses) ? customClasses : [];
    return [...base, ...custom];
  }, [timetable, customClasses]);

  const selectedClass = useMemo(() => {
    if (!selectedClassId) return null;
    return allManagedClasses.find((cls) => cls.id === selectedClassId) || null;
  }, [allManagedClasses, selectedClassId]);

  const handleAddCustomClassSubmit = (e) => {
    e.preventDefault();
    if (
      !newClassForm.course.trim() ||
      !newClassForm.startTime.trim() ||
      !newClassForm.endTime.trim()
    ) {
      showFeedback("Let's try again — fill in the course and times first 💛");
      return;
    }

    const newId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `custom-${Date.now()}`;
    addCustomClass({
      id: newId,
      day: newClassForm.day,
      startTime: newClassForm.startTime.trim(),
      endTime: newClassForm.endTime.trim(),
      course: newClassForm.course.trim(),
      lecturer: newClassForm.lecturer.trim() || 'TBA',
      room: newClassForm.room.trim() || 'Campus',
    });

    setSelectedClassId(newId);
    setNewClassForm({
      day: 'Monday',
      startTime: '8:00',
      endTime: '10:00',
      course: '',
      lecturer: '',
      room: '',
    });
    setIsCustomModalOpen(false);
    showFeedback('Crushed it! Custom class added to your schedule ✨');
  };

  const handleReplaceTimetable = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseExcelFile(file);
      if (parsed && parsed.length > 0) {
        setTimetable(parsed);
        setSelectedClassId('');
        showFeedback(`Crushed it! Updated with ${parsed.length} classes ✨`);
      } else {
        showFeedback(
          "Let's try again — couldn't find any 3A classes in that sheet 💛"
        );
      }
    } catch {
      showFeedback(
        "Let's try again — make sure it's a valid .xlsx timetable file 💛"
      );
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-widest text-amber-400/80">
            Personal Sanctuary &amp; Preferences
          </p>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-white">
            Your Space
          </h1>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-500/15 text-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.2)]">
          <User className="h-5 w-5" />
        </div>
      </header>

      {/* Step 2: Schedule Settings Section (Dropdown Selector + Selected Class Card + Add Custom Class Button) */}
      <section className="glass-card space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-amber-400" />
          <div>
            <h2 className="font-serif text-lg font-semibold text-white">
              Schedule Settings
            </h2>
            <p className="text-xs text-gray-400">
              Customize individual classes or add new sessions
            </p>
          </div>
        </div>

        {/* Dropdown/Select Menu */}
        <div className="space-y-1.5">
          <label
            htmlFor="class-customize-select"
            className="block text-xs font-medium text-gray-300"
          >
            Select a class to customize
          </label>
          <select
            id="class-customize-select"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2.5 text-sm text-white focus:border-amber-400/60 focus:outline-none"
          >
            <option value="" className="bg-charcoal text-gray-400">
              Select a class to customize...
            </option>
            {allManagedClasses.map((cls) => {
              const isEnabled =
                scheduleOverrides?.[cls.id]?.enabled !== false;
              return (
                <option
                  key={cls.id}
                  value={cls.id}
                  className="bg-charcoal text-white"
                >
                  {cls.day} • {cls.course} ({cls.startTime}–{cls.endTime} ·{' '}
                  {cls.room}){!isEnabled ? ' [Hidden]' : ''}
                </option>
              );
            })}
          </select>
        </div>

        {/* Revealed Customization Card for Selected Class */}
        <AnimatePresence mode="wait">
          {selectedClass && (
            <motion.div
              key={selectedClass.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3 rounded-2xl border border-amber-400/30 bg-white/[0.04] p-4"
            >
              {(() => {
                const override = scheduleOverrides?.[selectedClass.id] || {
                  enabled: true,
                  customNote: '',
                };
                const isEnabled = override.enabled !== false;

                return (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-serif text-base font-bold text-white">
                            {selectedClass.course}
                          </span>
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                            {selectedClass.day}
                          </span>
                          {selectedClass.isCustom && (
                            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                              Custom
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-300">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-amber-400/80" />
                            {selectedClass.startTime} – {selectedClass.endTime}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-amber-400/80" />
                            {selectedClass.room}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {selectedClass.isCustom && (
                          <button
                            type="button"
                            onClick={() => {
                              removeCustomClass(selectedClass.id);
                              setSelectedClassId('');
                            }}
                            title="Delete custom class"
                            className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-gray-400 transition hover:border-rose-500/40 hover:bg-rose-500/20 hover:text-rose-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          role="switch"
                          aria-checked={isEnabled}
                          onClick={() => {
                            triggerHaptic(10);
                            updateClassOverride(selectedClass.id, {
                              enabled: !isEnabled,
                            });
                          }}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-300 focus:outline-none ${
                            isEnabled
                              ? 'border-amber-400/60 bg-amber-500/80 shadow-[0_0_10px_rgba(245,158,11,0.45)]'
                              : 'border-white/15 bg-white/10'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-300 ${
                              isEnabled ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={override.customNote || ''}
                      onChange={(e) =>
                        updateClassOverride(selectedClass.id, {
                          customNote: e.target.value,
                        })
                      }
                      placeholder="Add a note... (e.g., Room changed to LH 8)"
                      className="w-full rounded-xl border border-white/10 bg-black/35 px-3.5 py-2.5 text-xs text-amber-200 placeholder-gray-500 focus:border-amber-400/50 focus:outline-none"
                    />
                  </>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Prominent "Add Custom Class" Button at Bottom of Schedule Settings */}
        <button
          type="button"
          onClick={() => setIsCustomModalOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/20 py-2.5 text-xs font-semibold text-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.18)] transition hover:bg-amber-500/30"
        >
          <Plus className="h-4 w-4" />
          <span>Add Custom Class</span>
        </button>
      </section>

      {/* Add Custom Class Modal */}
      <AnimatePresence>
        {isCustomModalOpen && (
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
              onSubmit={handleAddCustomClassSubmit}
              className="glass-card w-full max-w-md space-y-4 border border-amber-400/30 bg-charcoal/95 p-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-xl font-bold text-white">
                  Add Custom Class ✨
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-300">
                    Day
                  </label>
                  <select
                    value={newClassForm.day}
                    onChange={(e) =>
                      setNewClassForm((prev) => ({
                        ...prev,
                        day: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white focus:border-amber-400/60 focus:outline-none"
                  >
                    {WEEKDAYS.map((day) => (
                      <option key={day} value={day} className="bg-charcoal">
                        {day}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-300">
                      Start Time
                    </label>
                    <input
                      type="text"
                      value={newClassForm.startTime}
                      onChange={(e) =>
                        setNewClassForm((prev) => ({
                          ...prev,
                          startTime: e.target.value,
                        }))
                      }
                      placeholder="e.g., 8:00 or 3:30"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:border-amber-400/60 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-300">
                      End Time
                    </label>
                    <input
                      type="text"
                      value={newClassForm.endTime}
                      onChange={(e) =>
                        setNewClassForm((prev) => ({
                          ...prev,
                          endTime: e.target.value,
                        }))
                      }
                      placeholder="e.g., 10:00 or 5:30"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:border-amber-400/60 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-300">
                    Course Name
                  </label>
                  <input
                    type="text"
                    value={newClassForm.course}
                    onChange={(e) =>
                      setNewClassForm((prev) => ({
                        ...prev,
                        course: e.target.value,
                      }))
                    }
                    placeholder="e.g., RP 3A 383"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:border-amber-400/60 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-300">
                      Lecturer
                    </label>
                    <input
                      type="text"
                      value={newClassForm.lecturer}
                      onChange={(e) =>
                        setNewClassForm((prev) => ({
                          ...prev,
                          lecturer: e.target.value,
                        }))
                      }
                      placeholder="e.g., BE METEKU"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:border-amber-400/60 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-300">
                      Room
                    </label>
                    <input
                      type="text"
                      value={newClassForm.room}
                      onChange={(e) =>
                        setNewClassForm((prev) => ({
                          ...prev,
                          room: e.target.value,
                        }))
                      }
                      placeholder="e.g., GE 1, VLE, FIELD"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:border-amber-400/60 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="flex-1 rounded-xl border border-white/15 bg-white/5 py-2.5 text-xs font-medium text-gray-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl border border-amber-400/40 bg-amber-500/25 py-2.5 text-xs font-semibold text-amber-200 shadow-[0_0_16px_rgba(245,158,11,0.25)] hover:bg-amber-500/35"
                >
                  Save Class
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Toggles */}
      <section className="glass-card space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-amber-400" />
          <h2 className="font-serif text-lg font-semibold text-white">
            Gentle Reminders
          </h2>
        </div>

        <div className="space-y-3">
          {/* Morning Nudges Toggle */}
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5">
            <div className="pr-3">
              <p className="text-sm font-medium text-white">Morning Nudges</p>
              <p className="text-xs text-gray-400">
                Warm check-ins before your early lectures start
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(settings?.morningNudges)}
              onClick={() => {
                triggerHaptic(10);
                toggleSetting('morningNudges');
              }}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-300 focus:outline-none ${
                settings?.morningNudges
                  ? 'border-amber-400/60 bg-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                  : 'border-white/15 bg-white/10'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                  settings?.morningNudges ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Class Alerts Toggle */}
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5">
            <div className="pr-3">
              <p className="text-sm font-medium text-white">Class Alerts</p>
              <p className="text-xs text-gray-400">
                Heads-up nudges for VLE links and fieldwork gear
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(settings?.classAlerts)}
              onClick={() => {
                triggerHaptic(10);
                toggleSetting('classAlerts');
              }}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-300 focus:outline-none ${
                settings?.classAlerts
                  ? 'border-amber-400/60 bg-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                  : 'border-white/15 bg-white/10'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                  settings?.classAlerts ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Step 3: "My Notes" (For Her) with 1000ms Debounced Auto-Save */}
      <section className="glass-card space-y-3 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookHeart className="h-4 w-4 text-amber-400" />
            <h2 className="font-serif text-lg font-semibold text-white">
              My Notes
            </h2>
          </div>

          <div className="h-5">
            <AnimatePresence>
              {showSavedIndicator && (
                <motion.span
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-300"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Saved</span>
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        <textarea
          rows={6}
          value={notesDraft}
          onChange={handleNotesChange}
          placeholder="Your private thoughts, lecture reminders, or grocery lists..."
          className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 p-4 text-sm leading-relaxed text-white placeholder-gray-500 focus:border-amber-400/50 focus:outline-none"
        />

        <div className="flex justify-end h-4">
          <AnimatePresence>
            {showSavedIndicator && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="inline-flex items-center gap-1 text-[11px] text-emerald-300/90"
              >
                <Check className="h-3 w-3" />
                <span>Saved</span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Subtle Timetable Update Card */}
      <section className="glass-card flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-sm font-medium text-white">Semester Timetable</p>
          <p className="text-xs text-gray-400">
            {timetable?.length || 0} parsed + {customClasses?.length || 0} custom classes
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleReplaceTimetable}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-gray-200 transition hover:border-amber-400/40 hover:bg-amber-500/15 hover:text-amber-300"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Update .xlsx</span>
          </button>
        </div>
      </section>

      {/* Feedback Toast */}
      <AnimatePresence>
        {feedbackBanner && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="glass-card border-amber-400/40 bg-charcoal/95 px-4 py-3 text-center text-xs font-medium text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
          >
            {feedbackBanner}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exact Footer Text */}
      <footer className="mt-8 text-center text-xs text-gray-500">
        Built with love, just for you.
      </footer>
    </div>
  );
}

export default ProfileTab;
