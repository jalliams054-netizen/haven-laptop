import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BackgroundOrbs } from './components/BackgroundOrbs';
import { BottomNav } from './components/BottomNav';
import { TimetableUploader } from './components/TimetableUploader';
import { ScheduleTab } from './tabs/ScheduleTab';
import { AcademicsTab } from './tabs/AcademicsTab';
import { WellnessTab } from './tabs/WellnessTab';
import { ProfileTab } from './tabs/ProfileTab';
import { useStore } from './store/useStore';
import { generateSeedNotes } from './utils/generateNotes';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  handleReset = () => {
    try {
      localStorage.removeItem('emefa-companion-data');
    } catch {
      // ignore storage errors
    }
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-charcoal px-6 text-center text-white">
          <div className="glass-card max-w-sm space-y-4 p-6">
            <h2 className="font-serif text-2xl font-bold text-white">
              Refreshing your sanctuary ✨
            </h2>
            <p className="text-sm text-gray-300">
              Tap below to refresh your local cache and jump right back in.
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="w-full rounded-xl border border-amber-400/40 bg-amber-500/20 py-2.5 text-sm font-semibold text-amber-300"
            >
              Restore View
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function AppContent() {
  const [activeTab, setActiveTab] = useState('Schedule');
  const timetable = useStore((state) => state.timetable);
  const notes = useStore((state) => state.notes);
  const isRoughDay = useStore((state) => state.isRoughDay);

  useEffect(() => {
    const safeNotes = Array.isArray(notes) ? notes : [];
    const seededCount = safeNotes.filter(
      (n) => n && n.category !== 'random_love'
    ).length;
    if (seededCount < 500) {
      generateSeedNotes();
    }
  }, [notes]);

  const hasTimetable = Array.isArray(timetable) && timetable.length > 0;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Schedule':
        return <ScheduleTab />;
      case 'Academics':
        return <AcademicsTab />;
      case 'Wellness':
        return <WellnessTab />;
      case 'Profile':
        return <ProfileTab />;
      default:
        return <ScheduleTab />;
    }
  };

  return (
    <div
      className={`relative min-h-screen overflow-x-hidden text-white transition-colors duration-1000 ${
        isRoughDay ? 'bg-[#0d0718]' : 'bg-charcoal'
      }`}
    >
      {/* Ambient Animated Background Orbs */}
      <BackgroundOrbs isRoughDay={isRoughDay} />

      {!hasTimetable ? (
        <div key="uploader-gate" className="relative z-10">
          <TimetableUploader />
        </div>
      ) : (
        <div key="main-app-shell" className="relative z-10">
          {/* Main Content Shell */}
          <main className="relative z-10 mx-auto max-w-md px-4 pt-6 pb-24">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeTab}
                initial={{ opacity: 0.85, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {renderTabContent()}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Fixed Glassmorphic Bottom Navigation */}
          <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      )}
    </div>
  );
}

export function App() {
  return (
    <AppErrorBoundary>
      <AppContent />
    </AppErrorBoundary>
  );
}

export default App;
