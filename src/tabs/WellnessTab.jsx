import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, getHours, getMinutes } from 'date-fns';
import {
  Heart,
  Sparkles,
  Utensils,
  HeartHandshake,
  Compass,
  Clock,
  Moon,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { generateSeedNotes } from '../utils/generateNotes';
import { parseTimeToMinutes, getEffectiveTimetable } from './ScheduleTab';

const typewriterContainerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
    },
  },
};

const typewriterWordVariants = {
  hidden: { opacity: 0, y: 4 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2 },
  },
};

const CATEGORY_LABELS = {
  morning: 'Morning Note ☀️',
  vle_fatigue: 'Screen-Break Care 💻',
  field_work: 'Fieldwork Recovery 🎒',
  late_night: 'Late-Night Check-In 🌙',
  comfort: 'Rough Day Sanctuary 💜',
  random_love: 'Love Note 💌',
};

/**
 * Step 1: Daily Schedule Analysis Logic
 * Scans the effective timetable for the current day of the week and computes:
 * - hasFieldWork: any class where type === 'fieldwork'
 * - hasHeavyVLE: more than 2 hours (> 120 mins) of type === 'vle'
 * - hasEarlyStart: any class starting at or before 8:00 AM (<= 480 mins)
 * - hasLateFinish: any class ending at or after 6:30 PM (>= 1110 mins)
 * - totalClassHours: total hours in class today
 */
export function analyzeDailySchedule(todaysClasses = []) {
  if (!Array.isArray(todaysClasses) || todaysClasses.length === 0) {
    return {
      hasFieldWork: false,
      hasHeavyVLE: false,
      hasEarlyStart: false,
      hasLateFinish: false,
      totalClassHours: 0,
      vleHours: 0,
    };
  }

  let totalMinutes = 0;
  let vleMinutes = 0;
  let hasFieldWork = false;
  let hasEarlyStart = false;
  let hasLateFinish = false;

  for (const cls of todaysClasses) {
    const startMins =
      typeof cls.startMins === 'number'
        ? cls.startMins
        : parseTimeToMinutes(cls.startTime);
    const endMins =
      typeof cls.endMins === 'number'
        ? cls.endMins
        : parseTimeToMinutes(cls.endTime, startMins);

    const duration = Math.max(0, endMins - startMins);
    totalMinutes += duration;

    const roomUpper = String(cls.room || '').trim().toUpperCase();
    const isField = cls.type === 'fieldwork' || roomUpper.includes('FIELD');
    const isVle = cls.type === 'vle' || roomUpper.includes('VLE');

    if (isField) {
      hasFieldWork = true;
    }
    if (isVle) {
      vleMinutes += duration;
    }
    if (startMins <= 8 * 60) {
      hasEarlyStart = true;
    }
    if (endMins >= 18 * 60 + 30) {
      hasLateFinish = true;
    }
  }

  const totalClassHours = Math.round((totalMinutes / 60) * 10) / 10;
  const vleHours = Math.round((vleMinutes / 60) * 10) / 10;
  const hasHeavyVLE = vleMinutes > 120; // strictly more than 2 hours of VLE

  return {
    hasFieldWork,
    hasHeavyVLE,
    hasEarlyStart,
    hasLateFinish,
    totalClassHours,
    vleHours,
  };
}

export function WellnessTab() {
  const notes = useStore((state) => state.notes);
  const timetable = useStore((state) => state.timetable);
  const customClasses = useStore((state) => state.customClasses);
  const scheduleOverrides = useStore((state) => state.scheduleOverrides);
  const isRoughDay = useStore((state) => state.isRoughDay);
  const setIsRoughDay = useStore((state) => state.setIsRoughDay);

  const [now, setNow] = useState(() => new Date());

  // Ensure 500+ seed notes are available
  useEffect(() => {
    const safeNotes = Array.isArray(notes) ? notes : [];
    const seededCount = safeNotes.filter(
      (n) => n && n.category !== 'random_love'
    ).length;
    if (seededCount < 500) {
      generateSeedNotes();
    }
  }, [notes]);

  // Keep time updated every 30s for biological nudges and contextual category detection
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const currentDayName = format(now, 'EEEE');
  const currentHour = getHours(now);
  const currentMinute = getMinutes(now);
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  // Build effective timetable for today (respecting enabled overrides + custom classes)
  const todaysClasses = useMemo(() => {
    const effective = getEffectiveTimetable(
      timetable,
      customClasses,
      scheduleOverrides
    );
    return effective
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
  }, [timetable, customClasses, scheduleOverrides, currentDayName]);

  // Step 1: Perform Daily Schedule Analysis for Today
  const dailyFlags = useMemo(
    () => analyzeDailySchedule(todaysClasses),
    [todaysClasses]
  );

  // Step 3: Compute 'Today's Outlook' Mini-Card copy based on Daily Flags
  const todaysOutlook = useMemo(() => {
    const {
      hasFieldWork,
      hasHeavyVLE,
      hasEarlyStart,
      hasLateFinish,
      totalClassHours,
    } = dailyFlags;

    if (hasFieldWork) {
      return {
        vibeText: "Today's Vibe: Out in the field 🎒. Stay hydrated.",
        subText:
          totalClassHours > 0
            ? `${totalClassHours} hrs on schedule today${
                hasLateFinish ? ' • Late finish (6:30 PM+)' : ''
              }`
            : 'Fieldwork session on deck today',
      };
    }

    if (hasHeavyVLE) {
      return {
        vibeText: "Today's Vibe: Screen marathon 💻. Remember to blink.",
        subText: `${dailyFlags.vleHours} hrs of VLE (${totalClassHours} hrs total)${
          hasEarlyStart ? ' • Early start' : ''
        }${hasLateFinish ? ' • Late finish' : ''}`,
      };
    }

    if (hasEarlyStart) {
      return {
        vibeText: "Today's Vibe: Early rise ☀️. You've got this.",
        subText: `${totalClassHours} hrs on schedule today${
          hasLateFinish ? ' • Wraps up after 6:30 PM' : ''
        }`,
      };
    }

    return {
      vibeText: "Today's Vibe: Light load ✨. Enjoy the breather.",
      subText:
        totalClassHours > 0
          ? `${totalClassHours} ${
              totalClassHours === 1 ? 'hr' : 'hrs'
            } of class today — pace yourself gently`
          : `No classes scheduled for ${currentDayName}`,
    };
  }, [dailyFlags, currentDayName]);

  // Step 2: Contextual Note Engine Upgrade (Prioritizes Daily Flags over current minute)
  const { activeCategory, preferEarlyStartMorning } = useMemo(() => {
    if (isRoughDay) {
      return { activeCategory: 'comfort', preferEarlyStartMorning: false };
    }

    // 1. Prioritize Daily Flags first
    if (dailyFlags.hasFieldWork) {
      return { activeCategory: 'field_work', preferEarlyStartMorning: false };
    }

    if (dailyFlags.hasHeavyVLE) {
      return { activeCategory: 'vle_fatigue', preferEarlyStartMorning: false };
    }

    if (dailyFlags.hasEarlyStart && currentHour < 9) {
      return { activeCategory: 'morning', preferEarlyStartMorning: true };
    }

    // 2. Fall back to time-based logic (morning / afternoon / evening)
    if (currentHour >= 21 || currentHour < 5) {
      return { activeCategory: 'late_night', preferEarlyStartMorning: false };
    }

    if (currentHour >= 5 && currentHour < 12) {
      return { activeCategory: 'morning', preferEarlyStartMorning: false };
    }

    if ((notes || []).some((n) => n && n.category === 'random_love')) {
      return { activeCategory: 'random_love', preferEarlyStartMorning: false };
    }

    return { activeCategory: 'comfort', preferEarlyStartMorning: false };
  }, [isRoughDay, dailyFlags, currentHour, notes]);

  // Select note from the prioritized category (filtering for early-start notes when applicable)
  const selectedNote = useMemo(() => {
    if (!Array.isArray(notes) || notes.length === 0) {
      return {
        id: 'fallback-note',
        category: activeCategory,
        text: 'Take a slow breath for me, Emefa. Unclench your shoulders and remember how deeply you are loved.',
      };
    }

    let pool = notes.filter((n) => n && n.category === activeCategory);

    // When hasEarlyStart is true and before 9:00 AM, specifically filter for early-start morning notes
    if (preferEarlyStartMorning && pool.length > 0) {
      const earlyStartPool = pool.filter((n) =>
        /8\s*AM|early morning|first lecture|rush out|Rise and shine/i.test(
          String(n.text || '')
        )
      );
      if (earlyStartPool.length > 0) {
        pool = earlyStartPool;
      }
    }

    if (pool.length === 0) {
      pool = notes;
    }

    const dayOfYearSeed =
      now.getFullYear() * 366 + (now.getMonth() + 1) * 31 + now.getDate();
    const timeBlockSeed = dayOfYearSeed * 24 + currentHour;
    const categorySeed = activeCategory
      .split('')
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

    const index = Math.abs(timeBlockSeed * 13 + categorySeed) % pool.length;
    return pool[index];
  }, [notes, activeCategory, preferEarlyStartMorning, now, currentHour]);

  const words = useMemo(() => {
    return String(selectedNote?.text || '').split(' ');
  }, [selectedNote]);

  // Step 4: Biological Nudges
  // 1) Existing 30-min lunch break nudge (Mon-Wed 12:30 PM - 1:00 PM)
  const showLunchNudge = useMemo(() => {
    const isTargetDay = ['monday', 'tuesday', 'wednesday'].includes(
      currentDayName.toLowerCase()
    );
    const isLunchWindow =
      currentTimeInMinutes >= 12 * 60 + 30 &&
      currentTimeInMinutes <= 13 * 60;
    return isTargetDay && isLunchWindow;
  }, [currentDayName, currentTimeInMinutes]);

  // 2) Late Finish Nudge: If hasLateFinish is true, at 6:00 PM (18:00) show gentle toast
  const showLateFinishNudge = useMemo(() => {
    return dailyFlags.hasLateFinish && currentHour === 18;
  }, [dailyFlags.hasLateFinish, currentHour]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-1">
        <p
          className={`text-xs font-medium uppercase tracking-widest transition-colors duration-700 ${
            isRoughDay ? 'text-purple-300/90' : 'text-amber-400/80'
          }`}
        >
          {isRoughDay ? 'Quiet Sanctuary Mode' : 'Your Quiet Corner'}
        </p>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-white">
          Wellness {isRoughDay ? '💜' : '✨'}
        </h1>
      </header>

      {/* Step 3: "Today's Outlook" Mini-Card (Above the Love Note) */}
      <section
        className={`glass-card flex items-center justify-between gap-3.5 px-5 py-4 transition-all duration-700 ${
          isRoughDay
            ? 'border-purple-400/30 bg-purple-950/20'
            : 'border-amber-400/25 bg-white/[0.04]'
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border ${
              isRoughDay
                ? 'border-purple-400/30 bg-purple-500/20 text-purple-200'
                : 'border-amber-400/30 bg-amber-500/15 text-amber-300'
            }`}
          >
            <Compass className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="font-serif text-sm font-semibold text-white">
              {todaysOutlook.vibeText}
            </p>
            <p className="truncate text-xs text-gray-400">
              {todaysOutlook.subText}
            </p>
          </div>
        </div>

        {dailyFlags.totalClassHours > 0 && (
          <span
            className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              isRoughDay
                ? 'border-purple-400/30 bg-purple-500/15 text-purple-200'
                : 'border-amber-400/30 bg-amber-500/15 text-amber-300'
            }`}
          >
            <Clock className="h-3 w-3" />
            <span>{dailyFlags.totalClassHours}h</span>
          </span>
        )}
      </section>

      {/* Step 2: Contextual Love Drop Engine (Prioritized by Daily Flags) */}
      <section
        className={`glass-card relative overflow-hidden p-6 transition-all duration-700 ${
          isRoughDay
            ? 'border-purple-400/30 bg-purple-950/20 shadow-[0_8px_36px_rgba(88,28,135,0.4)]'
            : ''
        }`}
      >
        <div
          className={`pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-3xl transition-colors duration-700 ${
            isRoughDay ? 'bg-purple-500/20' : 'bg-amber-500/15'
          }`}
        />

        <div className="mb-4 flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-500 ${
              isRoughDay
                ? 'border-purple-400/30 bg-purple-500/20 text-purple-200'
                : 'border-amber-400/30 bg-amber-500/15 text-amber-300'
            }`}
          >
            <Heart className="h-3.5 w-3.5 fill-current" />
            <span>{CATEGORY_LABELS[activeCategory] || 'From Him 💌'}</span>
          </span>
        </div>

        {/* Typewriter Word-by-Word Stagger Reveal */}
        <motion.p
          key={`${selectedNote?.id}-${activeCategory}`}
          variants={typewriterContainerVariants}
          initial="hidden"
          animate="visible"
          className="font-serif text-xl leading-relaxed text-white/95"
        >
          {words.map((word, idx) => (
            <motion.span
              key={`${idx}-${word}`}
              variants={typewriterWordVariants}
              className="mr-1.5 inline-block"
            >
              {word}
            </motion.span>
          ))}
        </motion.p>

        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-gray-400">
          <span>Always in your corner, babe.</span>
          <Sparkles
            className={`h-4 w-4 ${
              isRoughDay ? 'text-purple-300' : 'text-amber-400'
            }`}
          />
        </div>
      </section>

      {/* The 'Rough Day' Button & Theme Transition */}
      <section className="space-y-3 pt-2">
        {!isRoughDay ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsRoughDay(true)}
            className="glass-card flex w-full items-center justify-center gap-2.5 border border-rose-400/30 bg-gradient-to-r from-rose-500/15 via-purple-500/15 to-indigo-500/15 px-6 py-4 text-base font-semibold text-rose-200 shadow-[0_0_25px_rgba(244,63,94,0.18)] transition hover:border-rose-400/50 hover:from-rose-500/25 hover:to-indigo-500/25"
          >
            <span>Having a rough day? 💔</span>
          </motion.button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card space-y-3 border border-purple-400/30 bg-purple-950/25 p-5 text-center"
          >
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20 text-purple-300">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <p className="text-sm text-purple-100">
              Sanctuary mode is active. Take all the time you need to breathe and rest your eyes, my love.
            </p>
            <button
              type="button"
              onClick={() => setIsRoughDay(false)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium text-white transition hover:bg-white/20"
            >
              <span>I&apos;m feeling better</span>
            </button>
          </motion.div>
        )}
      </section>

      {/* Step 4: Biological Nudges (Lunch Break & 6:00 PM Late-Finish Toast) */}
      <AnimatePresence>
        {showLunchNudge && (
          <motion.div
            key="lunch-nudge"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="glass-card flex items-center gap-3 border border-amber-400/40 bg-amber-500/15 px-5 py-4 shadow-[0_0_24px_rgba(245,158,11,0.25)]"
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/25 text-amber-300">
              <Utensils className="h-4 w-4" />
            </div>
            <p className="text-sm font-medium text-amber-100">
              30-min break! Close the laptop, just eat. 🍜
            </p>
          </motion.div>
        )}

        {showLateFinishNudge && (
          <motion.div
            key="late-finish-nudge"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="glass-card flex items-center gap-3 border border-amber-400/40 bg-amber-500/15 px-5 py-4 shadow-[0_0_24px_rgba(245,158,11,0.25)]"
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/25 text-amber-300">
              <Moon className="h-4 w-4" />
            </div>
            <p className="text-sm font-medium text-amber-100">
              Long day, babe. You&apos;re almost at the finish line. Keep going. 💛
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default WellnessTab;
