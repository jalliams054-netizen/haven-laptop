import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

function generateId() {
  try {
    if (
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
    ) {
      return crypto.randomUUID();
    }
  } catch {
    // Fallback if crypto.randomUUID is unavailable
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function inferClassTypeFromRoom(room = '') {
  const upperRoom = String(room || '').trim().toUpperCase();
  if (upperRoom === 'VLE' || upperRoom.includes('VLE')) {
    return 'vle';
  }
  if (upperRoom.includes('FIELD')) {
    return 'fieldwork';
  }
  return 'lecture';
}

function normalizeStatus(rawStatus) {
  const s = String(rawStatus || 'todo').trim().toLowerCase();
  if (s === 'in-progress' || s === 'in_progress') return 'in_progress';
  if (s === 'done') return 'done';
  return 'todo';
}

function normalizeColumn(rawStatus) {
  const status = normalizeStatus(rawStatus);
  return status === 'in_progress' ? 'in-progress' : status;
}

function normalizeTask(task) {
  if (!task || typeof task !== 'object') return null;
  const status = normalizeStatus(task.status || task.column);
  const column = normalizeColumn(status);
  return {
    id: task.id || generateId(),
    title: String(task.title || '').trim(),
    courseTag: String(task.courseTag || '').trim(),
    status,
    column,
    createdAt: task.createdAt || new Date().toISOString(),
  };
}

const defaultSettings = {
  morningNudges: true,
  classAlerts: true,
};

const defaultNotifications = {
  vle: true,
  fieldwork: true,
  lunch: true,
  morningNote: true,
  eveningCheckin: true,
};

const defaultTasks = [
  {
    id: 'task-1',
    title: 'Review Fieldwork notes',
    courseTag: 'RP 377',
    status: 'todo',
    column: 'todo',
    createdAt: '2026-10-19T08:00:00.000Z',
  },
  {
    id: 'task-2',
    title: 'Download VLE slides',
    courseTag: 'RP 3A 381',
    status: 'in_progress',
    column: 'in-progress',
    createdAt: '2026-10-19T08:05:00.000Z',
  },
];

export const useStore = create(
  persist(
    (set, get) => ({
      // Core State
      timetable: [],
      scheduleOverrides: {},
      customClasses: [],
      vleLinks: {},
      notes: [],
      tasks: defaultTasks,
      settings: defaultSettings,
      notifications: defaultNotifications,
      personalNotes: '',
      isRoughDay: false,

      // Timetable Actions
      setTimetable: (timetable) =>
        set({
          timetable: Array.isArray(timetable) ? timetable : [],
        }),
      clearTimetable: () => set({ timetable: [] }),

      // VLE Links Actions (keyed by class ID)
      setVleLink: (classId, url) =>
        set((state) => {
          if (!classId) return state;
          const trimmed = String(url || '').trim();
          const nextLinks = { ...(state.vleLinks || {}) };
          if (!trimmed) {
            delete nextLinks[classId];
          } else {
            nextLinks[classId] = trimmed;
          }
          return {
            vleLinks: nextLinks,
          };
        }),

      // Schedule Customization Actions (Overrides & Custom Classes)
      updateClassOverride: (classId, updates) =>
        set((state) => {
          if (!classId) return state;
          const currentOverrides = state.scheduleOverrides || {};
          const existing = currentOverrides[classId] || {
            enabled: true,
            customNote: '',
          };
          return {
            scheduleOverrides: {
              ...currentOverrides,
              [classId]: {
                ...existing,
                ...updates,
              },
            },
          };
        }),

      addCustomClass: (classObj) =>
        set((state) => {
          if (!classObj || !classObj.course) return state;
          const newClass = {
            id: classObj.id || generateId(),
            day: classObj.day || 'Monday',
            startTime: String(classObj.startTime || '8:00').trim(),
            endTime: String(classObj.endTime || '10:00').trim(),
            course: String(classObj.course || '').trim(),
            lecturer: String(classObj.lecturer || 'TBA').trim(),
            room: String(classObj.room || 'Campus').trim(),
            type: classObj.type || inferClassTypeFromRoom(classObj.room),
            isCustom: true,
          };
          return {
            customClasses: [...(state.customClasses || []), newClass],
          };
        }),

      removeCustomClass: (classId) =>
        set((state) => {
          const nextOverrides = { ...(state.scheduleOverrides || {}) };
          delete nextOverrides[classId];
          const nextVleLinks = { ...(state.vleLinks || {}) };
          delete nextVleLinks[classId];
          return {
            customClasses: (state.customClasses || []).filter(
              (c) => c.id !== classId
            ),
            scheduleOverrides: nextOverrides,
            vleLinks: nextVleLinks,
          };
        }),

      // Tasks (Survival Tracker Kanban) Actions
      setTasks: (tasks) =>
        set({
          tasks: Array.isArray(tasks)
            ? tasks.map(normalizeTask).filter(Boolean)
            : [],
        }),

      addTask: (payload) =>
        set((state) => {
          const isString = typeof payload === 'string';
          const title = isString
            ? payload.trim()
            : String(payload?.title || '').trim();
          const courseTag = isString
            ? ''
            : String(payload?.courseTag || '').trim();

          if (!title) return state;

          const newTask = {
            id: generateId(),
            title,
            courseTag,
            status: 'todo',
            column: 'todo',
            createdAt: new Date().toISOString(),
          };

          return {
            tasks: [...(state.tasks || []), newTask],
          };
        }),

      moveTask: (id, nextState) =>
        set((state) => {
          const status = normalizeStatus(nextState);
          const column = normalizeColumn(status);
          return {
            tasks: (state.tasks || []).map((task) =>
              task.id === id ? { ...task, status, column } : task
            ),
          };
        }),

      deleteTask: (id) =>
        set((state) => ({
          tasks: (state.tasks || []).filter((task) => task.id !== id),
        })),

      // Notes Actions
      setNotes: (notes) =>
        set({
          notes: Array.isArray(notes) ? notes : [],
        }),

      addNote: (note) =>
        set((state) => ({
          notes: [
            ...(state.notes || []),
            {
              id: note?.id || generateId(),
              category: note?.category || 'random_love',
              text: String(note?.text || ''),
            },
          ],
        })),

      appendNotes: (newNotes) =>
        set((state) => ({
          notes: [
            ...(state.notes || []),
            ...(Array.isArray(newNotes) ? newNotes : []),
          ],
        })),

      removeNote: (id) =>
        set((state) => ({
          notes: (state.notes || []).filter((n) => n.id !== id),
        })),

      addCustomNotes: (rawText) => {
        const lines = String(rawText || '')
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);

        if (lines.length === 0) return 0;

        const newNoteEntries = lines.map((text) => ({
          id: generateId(),
          category: 'random_love',
          text,
        }));

        set((state) => ({
          notes: [...(state.notes || []), ...newNoteEntries],
        }));

        return newNoteEntries.length;
      },

      seedInitialNotes: (seedNotes) => {
        const currentNotes = get().notes;
        const existingSeedCount = Array.isArray(currentNotes)
          ? currentNotes.filter((n) => n.category !== 'random_love').length
          : 0;

        if (!Array.isArray(currentNotes) || existingSeedCount < 500) {
          const customNotes = Array.isArray(currentNotes)
            ? currentNotes.filter((n) => n.category === 'random_love')
            : [];
          set({
            notes: [
              ...(Array.isArray(seedNotes) ? seedNotes : []),
              ...customNotes,
            ],
          });
        }
      },

      // Settings & Notification Actions
      updateSettings: (partialSettings) =>
        set((state) => ({
          settings: {
            ...(state.settings || defaultSettings),
            ...partialSettings,
          },
        })),

      toggleSetting: (key) =>
        set((state) => {
          const current = state.settings || defaultSettings;
          return {
            settings: {
              ...current,
              [key]: !current[key],
            },
          };
        }),

      toggleNotification: (key) =>
        set((state) => {
          const current = state.notifications || defaultNotifications;
          return {
            notifications: {
              ...current,
              [key]: !current[key],
            },
          };
        }),

      // Personal Notes Actions
      setPersonalNotes: (personalNotes) =>
        set({
          personalNotes: String(personalNotes ?? ''),
        }),

      // Rough Day Wellness Theme Actions
      setIsRoughDay: (val) =>
        set((state) => ({
          isRoughDay: typeof val === 'boolean' ? val : !state.isRoughDay,
        })),
      toggleRoughDay: () =>
        set((state) => ({ isRoughDay: !state.isRoughDay })),
    }),
    {
      name: 'emefa-companion-data',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return currentState;
        }
        return {
          ...currentState,
          ...persistedState,
          timetable: Array.isArray(persistedState.timetable)
            ? persistedState.timetable
            : currentState.timetable,
          scheduleOverrides:
            persistedState.scheduleOverrides &&
            typeof persistedState.scheduleOverrides === 'object'
              ? persistedState.scheduleOverrides
              : currentState.scheduleOverrides,
          customClasses: Array.isArray(persistedState.customClasses)
            ? persistedState.customClasses
            : currentState.customClasses,
          vleLinks:
            persistedState.vleLinks &&
            typeof persistedState.vleLinks === 'object'
              ? persistedState.vleLinks
              : currentState.vleLinks,
          notes: Array.isArray(persistedState.notes)
            ? persistedState.notes
            : currentState.notes,
          tasks: Array.isArray(persistedState.tasks)
            ? persistedState.tasks.map(normalizeTask).filter(Boolean)
            : currentState.tasks,
          settings: {
            ...defaultSettings,
            ...(persistedState.settings &&
            typeof persistedState.settings === 'object'
              ? persistedState.settings
              : {}),
          },
          notifications: {
            ...defaultNotifications,
            ...(persistedState.notifications &&
            typeof persistedState.notifications === 'object'
              ? persistedState.notifications
              : {}),
          },
          personalNotes:
            typeof persistedState.personalNotes === 'string'
              ? persistedState.personalNotes
              : '',
          isRoughDay: Boolean(persistedState.isRoughDay),
        };
      },
    }
  )
);

export default useStore;
