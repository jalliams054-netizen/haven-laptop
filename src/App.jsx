import React from 'react';
import { BackgroundOrbs } from './components/BackgroundOrbs';
import { TimetableUploader } from './components/TimetableUploader';
import { AcademicsTab } from './tabs/AcademicsTab';
import { useStore } from './store/useStore';

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
              Click below to refresh your local cache and jump right back in.
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
  const timetable = useStore((state) => state.timetable);
  const isRoughDay = useStore((state) => state.isRoughDay);

  const hasTimetable = Array.isArray(timetable) && timetable.length > 0;

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
        <main className="relative z-10 mx-auto w-full max-w-4xl p-8">
          <AcademicsTab />
        </main>
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
