import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, getHours, getMinutes } from 'date-fns';
import { Clock, MapPin, User, Calendar, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';
import { downloadICS, resolveClassDateTime } from '../utils/calendarExport';
import { triggerHaptic } from '../utils/haptics';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const containerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 1, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 20,
    },
  },
};

/**
 * Converts a time string (e.g. "8:00", "2:30", "14:00", "6:30") into minutes since midnight.
 * Handles 12-hour university timetable conventions (6:00 AM to 7:30 PM).
 */
export function parseTimeToMinutes(timeStr, referenceStartMinutes = null) {
  if (!timeStr) return 0;
  const cleaned = String(timeStr).trim().toUpperCase();
  const isPM = cleaned.includes('PM');
  const isAM = cleaned.includes('AM');

  const match = cleaned.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 0;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  } else if (!isAM && !isPM) {
    if (hours >= 1 && hours <= 5) {
      hours += 12;
    } else if (hours === 6 && minutes === 30) {
      hours += 12;
    } else if (
      hours === 7 &&
      minutes === 30 &&
      referenceStartMinutes !== null &&
      referenceStartMinutes >= 18 * 60
    ) {
      hours += 12;
    }
  }

  let totalMinutes = hours * 60 + minutes;

  if (
    referenceStartMinutes !== null &&
    totalMinutes <= referenceStartMinutes &&
    hours < 12
  ) {
    totalMinutes += 12 * 60;
  }

  return totalMinutes;
}

/**
 * Combines parsed `timetable` + `customClasses`, filters out classes where
 * `scheduleOverrides[cls.id]?.enabled === false`, and attaches `customNote`.
 */
export function getEffectiveTimetable(
  timetable = [],
  customClasses = [],
  scheduleOverrides = {}
) {
  const combined = [
    ...(Array.isArray(timetable) ? timetable : []),
    ...(Array.isArray(customClasses) ? customClasses : []),
  ];

  return combined
    .filter((cls) => {
      const override = scheduleOverrides?.[cls.id];
      return override?.enabled !== false;
    })
    .map((cls) => {
      const override = scheduleOverrides?.[cls.id];
      return {
        ...cls,
        customNote: override?.customNote ? String(override.customNote).trim() : '',
      };
    });
}

/**
 * Triggers client-side .ics download for ANY class object.
 */
function handleAddClassToCalendar(cls) {
  triggerHaptic([15, 30, 15]);
  const startMins =
    typeof cls.startMins === 'number'
      ? cls.startMins
      : parseTimeToMinutes(cls.startTime);
  const endMins =
    typeof cls.endMins === 'number'
      ? cls.endMins
      : parseTimeToMinutes(cls.endTime, startMins);

  const startDate = resolveClassDateTime(cls.day, startMins);
  const endDate = resolveClassDateTime(cls.day, endMins);

  const noteByType =
    cls.type === 'fieldwork'
      ? 'Grab your gear, comfortable shoes, and water bottle 🎒'
      : cls.type === 'vle'
      ? 'Virtual lecture on VLE 💻'
      : 'University lecture ✨';

  const extraNote = cls.customNote ? ` | Note: ${cls.customNote}` : '';

  downloadICS({
    title: `${cls.course} (${cls.room})`,
    start: startDate,
    end: endDate,
    location: cls.room || 'Campus',
    description: `Lecturer: ${cls.lecturer || 'TBA'} | ${noteByType}${extraNote}`,
  });
}

/**
 * Circular SVG progress ring with Framer Motion dashoffset + breathing pulse animation.
 */
function ActiveClassProgressRing({ percentageLeft }) {
  const size = 104;
  const center = size / 2;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.max(0, Math.min(100, percentageLeft));
  const targetDashoffset =
    circumference - (clampedPercent / 100) * circumference;

  return (
    <div className="relative flex flex-shrink-0 items-center justify-center">
      <motion.svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90 transform"
        animate={{
          filter: [
            'drop-shadow(0 0 6px rgba(245, 158, 11, 0.45))',
            'drop-shadow(0 0 14px rgba(245, 158, 11, 0.9))',
          ],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatType: 'reverse',
          ease: 'easeInOut',
        }}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={6}
        />

        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="#f59e0b"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference, strokeWidth: 6 }}
          animate={{
            strokeDashoffset: targetDashoffset,
            strokeWidth: [6, 8],
          }}
          transition={{
            strokeDashoffset: {
              duration: 1.1,
              ease: 'easeOut',
            },
            strokeWidth: {
              duration: 3,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'easeInOut',
            },
          }}
        />
      </motion.svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-sans text-lg font-semibold text-amber-400">
          {Math.round(clampedPercent)}%
        </span>
        <span className="text-[10px] uppercase tracking-wider text-gray-400">
          left
        </span>
      </div>
    </div>
  );
}

export function ScheduleTab() {
  const timetable = useStore((state) => state.timetable);
  const customClasses = useStore((state) => state.customClasses);
  const scheduleOverrides = useStore((state) => state.scheduleOverrides);

  const [now, setNow] = useState(() => new Date());

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

  const [selectedBrowseDay, setSelectedBrowseDay] = useState(() =>
    WEEKDAYS.includes(format(new Date(), 'EEEE'))
      ? format(new Date(), 'EEEE')
      : 'Monday'
  );

  // Greeting Logic (>= 17 -> Good evening, Emefa 🌙)
  const greeting = useMemo(() => {
    if (currentHour >= 17) {
      return 'Good evening, Emefa 🌙';
    }
    if (currentHour < 12) {
      return 'Good morning, Emefa ✨';
    }
    return 'Good afternoon, Emefa ☀️';
  }, [currentHour]);

  // Combine parsed timetable (filtered by scheduleOverrides) + customClasses
  const effectiveTimetable = useMemo(
    () => getEffectiveTimetable(timetable, customClasses, scheduleOverrides),
    [timetable, customClasses, scheduleOverrides]
  );

  // Filter & enrich today's classes with numeric start/end minutes
  const todaysClasses = useMemo(() => {
    return effectiveTimetable
      .filter(
        (cls) =>
          String(cls.day || '').trim().toLowerCase() ===
          currentDayName.toLowerCase()
      )
      .map((cls) => {
        const startMins = parseTimeToMinutes(cls.startTime);
        const endMins = parseTimeToMinutes(cls.endTime, startMins);
        return {
          ...cls,
          startMins,
          endMins,
        };
      })
      .sort((a, b) => a.startMins - b.startMins);
  }, [effectiveTimetable, currentDayName]);

  // Determine Current Status (Active Class, Break, or Free Time) and Next 3 Classes
  const { status, activeClass, percentageLeft, nextThreeClasses } = useMemo(() => {
    const upcoming = todaysClasses
      .filter((cls) => cls.startMins > currentTimeInMinutes)
      .slice(0, 3);

    if (todaysClasses.length === 0) {
      return {
        status: 'free',
        activeClass: null,
        percentageLeft: 0,
        nextThreeClasses: [],
      };
    }

    const currentActive = todaysClasses.find(
      (cls) =>
        currentTimeInMinutes >= cls.startMins &&
        currentTimeInMinutes < cls.endMins
    );

    if (currentActive) {
      const duration = Math.max(
        1,
        currentActive.endMins - currentActive.startMins
      );
      const remaining = Math.max(
        0,
        currentActive.endMins - currentTimeInMinutes
      );
      const pctLeft = (remaining / duration) * 100;

      return {
        status: 'active',
        activeClass: currentActive,
        percentageLeft: pctLeft,
        nextThreeClasses: upcoming,
      };
    }

    const firstClassStart = todaysClasses[0].startMins;
    const lastClassEnd = todaysClasses[todaysClasses.length - 1].endMins;

    if (
      currentTimeInMinutes >= firstClassStart &&
      currentTimeInMinutes < lastClassEnd
    ) {
      return {
        status: 'break',
        activeClass: null,
        percentageLeft: 0,
        nextThreeClasses: upcoming,
      };
    }

    return {
      status: 'free',
      activeClass: null,
      percentageLeft: 0,
      nextThreeClasses: upcoming,
    };
  }, [todaysClasses, currentTimeInMinutes]);

  const browsedDayClasses = useMemo(() => {
    return effectiveTimetable
      .filter(
        (cls) =>
          String(cls.day || '').trim().toLowerCase() ===
          selectedBrowseDay.toLowerCase()
      )
      .map((cls) => {
        const startMins = parseTimeToMinutes(cls.startTime);
        const endMins = parseTimeToMinutes(cls.endTime, startMins);
        return { ...cls, startMins, endMins };
      })
      .sort((a, b) => a.startMins - b.startMins);
  }, [effectiveTimetable, selectedBrowseDay]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Dynamic Header */}
      <motion.header variants={itemVariants} className="space-y-1">
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-widest text-amber-400/80">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {format(now, 'EEEE, MMM d')}
          </span>
          <span>{format(now, 'h:mm a')}</span>
        </div>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-white">
          {greeting}
        </h1>
      </motion.header>

      {/* The Hero Card (Current Status) */}
      <motion.section
        variants={itemVariants}
        className="glass-card relative overflow-hidden p-6"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl" />

        {status === 'active' && activeClass && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-2.5">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-300">
                  <Sparkles className="h-3 w-3" />
                  <span>
                    {activeClass.type === 'fieldwork'
                      ? 'Grab your gear 🎒'
                      : activeClass.type === 'vle'
                      ? 'Virtual vibes 💻'
                      : 'Happening Now ✨'}
                  </span>
                </div>

                <h2 className="font-serif text-2xl font-bold text-white">
                  {activeClass.course}
                </h2>

                <div className="space-y-1 text-sm text-gray-300">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-amber-400/80" />
                    <span className="truncate">{activeClass.lecturer}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-amber-400/80" />
                    <span>{activeClass.room}</span>
                  </div>
                  {activeClass.customNote && (
                    <p className="text-xs italic text-amber-300">
                      {activeClass.customNote}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock className="h-3.5 w-3.5 text-amber-400/70" />
                    <span>
                      {activeClass.startTime} – {activeClass.endTime}
                    </span>
                  </div>
                </div>
              </div>

              <ActiveClassProgressRing percentageLeft={percentageLeft} />
            </div>

            {/* Step 4: Add to Calendar on ALL Classes (Hero Card) */}
            <div className="flex justify-end border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={() => handleAddClassToCalendar(activeClass)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/35 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-300 transition hover:bg-amber-500/25"
              >
                <span>Add to Calendar 📅</span>
              </button>
            </div>
          </div>
        )}

        {status === 'break' && (
          <div className="space-y-2 py-2">
            <span className="inline-block rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-300">
              Recharge time ⚡
            </span>
            <h2 className="font-serif text-2xl font-bold text-white">
              Go eat something! 🍜
            </h2>
            <p className="text-sm text-gray-300">
              You’re between classes right now. Drink some water and rest your mind before the next session starts.
            </p>
          </div>
        )}

        {status === 'free' && (
          <div className="space-y-2 py-2">
            <span className="inline-block rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-amber-300">
              Free Time
            </span>
            <h2 className="font-serif text-2xl font-bold text-white">
              Clear schedule! Enjoy your day off, babe. ✨
            </h2>
            <p className="text-sm text-gray-300">
              {todaysClasses.length === 0
                ? `No classes scheduled for ${currentDayName}.`
                : 'Today’s lectures are wrapped up—take a deep breath and relax.'}
            </p>
          </div>
        )}
      </motion.section>

      {/* The 'Up Next' Stack */}
      <motion.section variants={itemVariants} className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-serif text-lg font-semibold text-white/90">
            Up Next
          </h3>
          <span className="text-xs text-gray-400">
            {nextThreeClasses.length > 0
              ? `Next ${nextThreeClasses.length} ${
                  nextThreeClasses.length === 1 ? 'class' : 'classes'
                }`
              : 'Nothing else queued today'}
          </span>
        </div>

        {nextThreeClasses.length > 0 ? (
          <div className="space-y-3">
            {nextThreeClasses.map((cls) => (
              <motion.div
                key={cls.id}
                variants={itemVariants}
                className="glass-card space-y-3 px-5 py-4 opacity-70 transition-opacity hover:opacity-95"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-serif text-base font-semibold text-white">
                        {cls.course}
                      </span>
                      {cls.type === 'vle' && (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                          VLE 💻
                        </span>
                      )}
                      {cls.type === 'fieldwork' && (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                          Field 🎒
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-300">
                      <Clock className="h-3.5 w-3.5 text-amber-400/80" />
                      <span>
                        {cls.startTime} – {cls.endTime}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-200">
                      <MapPin className="h-3.5 w-3.5 text-amber-400" />
                      <span>{cls.room}</span>
                    </div>
                    {cls.customNote && (
                      <p className="text-right text-xs italic text-amber-300">
                        {cls.customNote}
                      </p>
                    )}
                  </div>
                </div>

                {/* Step 4: Add to Calendar on ALL Classes (Up Next Stack) */}
                <div className="flex justify-end border-t border-white/10 pt-2.5">
                  <button
                    type="button"
                    onClick={() => handleAddClassToCalendar(cls)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/35 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-300 transition hover:bg-amber-500/25"
                  >
                    <span>Add to Calendar 📅</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            variants={itemVariants}
            className="glass-card px-5 py-4 text-center text-sm text-gray-400 opacity-70"
          >
            No more upcoming classes for today, Emefa. Rest up! 💛
          </motion.div>
        )}
      </motion.section>

      {/* Weekly Timetable Peek (Mon - Fri) with Add to Calendar on ALL Classes */}
      <motion.section variants={itemVariants} className="space-y-3 pt-1">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-serif text-base font-semibold text-white/85">
            Weekly Lineup
          </h3>
          <span className="text-xs text-gray-400">{selectedBrowseDay}</span>
        </div>

        <div className="flex gap-1.5 rounded-2xl bg-white/[0.04] p-1">
          {WEEKDAYS.map((day) => {
            const isSelected = selectedBrowseDay === day;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedBrowseDay(day)}
                className={`flex-1 rounded-xl py-2 text-xs font-medium transition ${
                  isSelected
                    ? 'border border-amber-400/35 bg-amber-500/20 text-amber-300'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {day.slice(0, 3)}
              </button>
            );
          })}
        </div>

        <div className="space-y-2.5">
          {browsedDayClasses.map((cls) => (
            <div
              key={cls.id}
              className="glass-card space-y-2.5 px-4 py-3.5 opacity-85"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-serif text-sm font-semibold text-white">
                      {cls.course}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      ({cls.startTime} – {cls.endTime})
                    </span>
                  </div>
                  <p className="truncate text-xs text-gray-400">{cls.lecturer}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-amber-300">
                    {cls.room}
                  </span>
                  {cls.customNote && (
                    <p className="text-right text-xs italic text-amber-300">
                      {cls.customNote}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end border-t border-white/10 pt-2">
                <button
                  type="button"
                  onClick={() => handleAddClassToCalendar(cls)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/35 bg-amber-500/15 px-3 py-1 text-[11px] font-medium text-amber-300 transition hover:bg-amber-500/25"
                >
                  <span>Add to Calendar 📅</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.section>
    </motion.div>
  );
}

export default ScheduleTab;
