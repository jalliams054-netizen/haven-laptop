import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy,
  Check,
  Laptop,
  Clock,
  User,
  ExternalLink,
  Link2,
  Upload,
  X,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { getEffectiveTimetable } from './ScheduleTab';
import { parseExcelFile } from '../utils/parseTimetable';

export function AcademicsTab() {
  const timetable = useStore((state) => state.timetable);
  const setTimetable = useStore((state) => state.setTimetable);
  const customClasses = useStore((state) => state.customClasses);
  const scheduleOverrides = useStore((state) => state.scheduleOverrides);
  const vleLinks = useStore((state) => state.vleLinks);
  const setVleLink = useStore((state) => state.setVleLink);

  const [toastMessage, setToastMessage] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Modal state for adding/editing a VLE link
  const [editingVleClass, setEditingVleClass] = useState(null);
  const [vleUrlInput, setVleUrlInput] = useState('');
  const fileInputRef = useRef(null);

  const effectiveTimetable = useMemo(
    () => getEffectiveTimetable(timetable, customClasses, scheduleOverrides),
    [timetable, customClasses, scheduleOverrides]
  );

  // Filter VLE classes from effective timetable
  const vleClasses = useMemo(() => {
    if (!Array.isArray(effectiveTimetable)) return [];
    return effectiveTimetable.filter(
      (cls) =>
        cls.type === 'vle' ||
        String(cls.room || '').trim().toUpperCase().includes('VLE')
    );
  }, [effectiveTimetable]);

  // Check if any VLE class has a saved link yet
  const hasAnySavedVleLinks = useMemo(() => {
    return vleClasses.some((vle) => Boolean(vleLinks?.[vle.id]?.trim()));
  }, [vleClasses, vleLinks]);

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

  const handleCopyVleLink = async (e, id, savedLink) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(savedLink);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = savedLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedId(id);
    showToast('Copied!');
    setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 2200);
  };

  const handleUpdateTimetable = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseExcelFile(file);
      if (parsed && parsed.length > 0) {
        setTimetable(parsed);
        showToast(`Updated timetable (${parsed.length} classes) ✨`);
      }
    } catch {
      showToast("Couldn't read that .xlsx file 💛");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Laptop Dashboard Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-widest text-amber-400/80">
            Haven • Laptop Sanctuary
          </p>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-400/35 bg-amber-500/15 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <Laptop className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-serif text-3xl font-bold tracking-tight text-white">
                My VLE Links 💻
              </h1>
              <p className="text-xs text-gray-400">
                {vleClasses.length} virtual{' '}
                {vleClasses.length === 1 ? 'session' : 'sessions'} on your 3A
                schedule
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleUpdateTimetable}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-medium text-gray-200 transition-colors hover:border-amber-400/40 hover:bg-amber-500/15 hover:text-amber-300"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Update .xlsx Timetable</span>
          </button>
        </div>
      </header>

      {/* Empty State / Instructions when no VLE links have been added yet */}
      {!hasAnySavedVleLinks && (
        <div className="glass-card border border-amber-400/25 bg-white/[0.03] px-5 py-4 text-sm leading-relaxed text-gray-200">
          Add your Zoom or Teams links here to join your online classes directly from your laptop.
        </div>
      )}

      {/* VLE Classes Grid for Laptop */}
      <section>
        {vleClasses.length === 0 ? (
          <div className="glass-card p-8 text-center text-sm text-gray-400">
            No VLE classes found yet. Click &ldquo;Update .xlsx Timetable&rdquo; above to load your virtual sessions 💻
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {vleClasses.map((vle) => {
              const savedLink = vleLinks?.[vle.id] || '';
              const isCopied = copiedId === vle.id;

              return (
                <div
                  key={vle.id}
                  className="glass-card flex items-center justify-between gap-4 p-5 transition-all hover:border-amber-400/30"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-serif text-lg font-bold text-white">
                        {vle.course}
                      </span>
                      <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-300">
                        {vle.day}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-300">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-amber-400/80" />
                        {vle.startTime} – {vle.endTime}
                      </span>
                      <span className="flex items-center gap-1.5 truncate">
                        <User className="h-3.5 w-3.5 text-amber-400/80" />
                        {vle.lecturer}
                      </span>
                    </div>
                  </div>

                  {/* Flawless Link Opening (<a target="_blank" rel="noopener noreferrer">) + One-Click Copy Button */}
                  <div className="flex flex-shrink-0 items-center gap-2">
                    {!savedLink ? (
                      <button
                        type="button"
                        onClick={() => handleOpenAddLinkModal(vle)}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-amber-400/35 bg-amber-500/20 px-4 py-2.5 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/30"
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
                          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-500/20 px-4 py-2.5 text-xs font-semibold text-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.2)] transition-colors hover:bg-amber-500/30"
                        >
                          <span>Join Class</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>

                        <button
                          type="button"
                          onClick={(e) =>
                            handleCopyVleLink(e, vle.id, savedLink)
                          }
                          title="Copy link to clipboard"
                          aria-label="Copy link to clipboard"
                          className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-medium text-amber-300 transition-colors hover:border-amber-400/40 hover:bg-amber-500/20"
                        >
                          {isCopied ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-300" />
                              <span className="text-[11px] text-emerald-300">
                                Copied!
                              </span>
                            </>
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenAddLinkModal(vle)}
                          title="Edit link"
                          aria-label="Edit link"
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400 transition-colors hover:border-white/25 hover:text-white"
                        >
                          <Link2 className="h-3.5 w-3.5" />
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

      {/* Laptop-Friendly Link Input Modal (max-w-md / w-96) */}
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
              className="glass-card w-full max-w-md space-y-4 border border-amber-400/30 bg-charcoal/95 p-6 shadow-2xl sm:w-96"
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
                  Class Meeting Link
                </label>
                <input
                  type="url"
                  required
                  autoFocus
                  value={vleUrlInput}
                  onChange={(e) => setVleUrlInput(e.target.value)}
                  placeholder="Paste your Zoom, Teams, or VLE URL here..."
                  className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-amber-400/60 focus:outline-none"
                />
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingVleClass(null)}
                  className="flex-1 rounded-xl border border-white/15 bg-white/5 py-2.5 text-xs font-medium text-gray-300 transition-colors hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl border border-amber-400/40 bg-amber-500/25 py-2.5 text-xs font-semibold text-amber-200 shadow-[0_0_16px_rgba(245,158,11,0.25)] transition-colors hover:bg-amber-500/35"
                >
                  Save Link
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="glass-card fixed bottom-8 left-4 right-4 z-50 mx-auto max-w-xs border-amber-400/40 bg-charcoal/90 px-4 py-3 text-center text-xs font-medium text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AcademicsTab;
