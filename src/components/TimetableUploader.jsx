import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, Sparkles, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { parseExcelFile } from '../utils/parseTimetable';

export function TimetableUploader() {
  const setTimetable = useStore((state) => state.setTimetable);
  const [isParsing, setIsParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const fileInputRef = useRef(null);

  const processFile = async (file) => {
    if (!file) return;
    setIsParsing(true);
    setFeedback(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 450));
      const parsedData = await parseExcelFile(file);

      if (!parsedData || parsedData.length === 0) {
        setFeedback(
          "Let's try again, babe — couldn't find any 3A classes in that file 💛"
        );
        setIsParsing(false);
        return;
      }

      setTimetable(parsedData);
    } catch {
      setFeedback(
        "Let's try again, babe — please choose your .xlsx timetable file 💛"
      );
      setIsParsing(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Offline in-memory sample .xlsx generator matching her exact raw timetable format (including `---` division separators)
  const handleLoadSampleTimetable = async () => {
    setIsParsing(true);
    setFeedback(null);
    try {
      const sampleGrid = [
        [
          'Day',
          '6:00-7:00',
          '8:00-10:00',
          '10:30-12:30',
          '1:00-3:00',
          '3:30-5:30',
          '6:30-7:30',
        ],
        [
          'MONDAY',
          '',
          'RP 3A 381\nBE METEKU\nVLE  (8:00-10:00)',
          '',
          'RP 377\nL BREW\nFIELD  (1:00-3:00)',
          'RP 3A 383\nBE METEKU\nGE 1  (3:30-4:30)\n---\nRP 3B 361\nL BREW\nLH 8  (3:30-5:30)',
          '',
        ],
        [
          'TUESDAY',
          'RP 3A 365\nDR S TETTEH\nLH 4  (6:00-7:00)',
          '',
          'RP 373\nPROF N ASANTE\nVLE  (10:30-12:30)',
          '',
          'RP 3A 389\nDR M BOADU\nFIELD  (3:30-5:30)',
          '',
        ],
        [
          'WEDNESDAY',
          '',
          'RP, CH 351\nDR E OWUSU\nVLE  (8:00-10:00)',
          '',
          'RP 377\nL BREW\nGE 1  (1:00-3:00)',
          '',
          'RP 3A 391\nBE METEKU\nVLE  (6:30-7:30)',
        ],
        [
          'THURSDAY',
          '',
          'RP 3A 381\nBE METEKU\nLH 8  (8:00-10:00)\n---\nRP 3B 385\nDR S TETTEH\nLH 3  (8:00-10:00)',
          '',
          'RP 373\nPROF N ASANTE\nFIELD  (1:00-3:00)',
          '',
          '',
        ],
        [
          'FRIDAY',
          'RP 3A 365\nDR S TETTEH\nLH 4  (7:00-8:00)',
          'RP 3A 381\nBE METEKU\nVLE  (8:00-10:00)',
          'RP 373\nPROF N ASANTE\nVLE  (10:30-12:30)',
          '',
          '',
          'RP 3A 391\nBE METEKU\nVLE  (5:30-7:30)',
        ],
      ];

      const ws = XLSX.utils.aoa_to_sheet(sampleGrid);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Timetable');
      const arrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

      await new Promise((resolve) => setTimeout(resolve, 400));
      const parsed = await parseExcelFile(arrayBuffer);
      setTimetable(parsed);
    } catch {
      setFeedback("Let's try again, babe 💛");
      setIsParsing(false);
    }
  };

  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <motion.div
        initial={{ opacity: 1, y: 0, scale: 1 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        className="glass-card relative w-full max-w-md overflow-hidden p-7 text-center"
      >
        <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-amber-500/15 blur-3xl" />

        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/40 bg-amber-500/15 text-amber-300 shadow-[0_0_24px_rgba(245,158,11,0.3)]">
          <Sparkles className="h-7 w-7" />
        </div>

        <h1 className="font-serif text-3xl font-bold tracking-tight text-white">
          Welcome home, Emefa ✨
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-300">
          Drop your semester Excel timetable below. I’ll automatically filter out the 3B classes and organize your 3A lectures, VLE links, and fieldwork days.
        </p>

        {/* Glowing Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isParsing && fileInputRef.current?.click()}
          className={`mt-6 cursor-pointer rounded-3xl border-2 border-dashed p-7 transition-all duration-300 ${
            isDragging
              ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.35)]'
              : 'border-amber-400/35 bg-white/[0.03] shadow-[0_0_24px_rgba(245,158,11,0.12)] hover:border-amber-400/60 hover:bg-amber-500/10'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />

          {isParsing ? (
            <div className="flex flex-col items-center justify-center space-y-3 py-4">
              <Loader2 className="h-9 w-9 animate-spin text-amber-400" />
              <p className="font-serif text-base font-medium text-amber-200">
                Setting up your week, babe...
              </p>
              <p className="text-xs text-gray-400">
                Splitting divisions &amp; filtering out 3B sessions
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-300">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-white">
                  Tap to choose your <span className="text-amber-300">.xlsx</span> timetable
                </p>
                <p className="text-xs text-gray-400">
                  100% offline — stays privately on your phone
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="mt-2 inline-flex items-center gap-2 rounded-2xl border border-amber-400/50 bg-gradient-to-r from-amber-500/30 to-orange-500/25 px-5 py-3 text-sm font-semibold text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition hover:from-amber-500/40 hover:to-orange-500/35"
              >
                <Upload className="h-4 w-4" />
                <span>Upload Timetable</span>
              </button>
            </div>
          )}
        </div>

        {feedback && (
          <p className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {feedback}
          </p>
        )}

        {/* Quick Sample Loader for Instant Preview */}
        {!isParsing && (
          <div className="mt-5 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={handleLoadSampleTimetable}
              className="text-xs font-medium text-gray-400 underline decoration-amber-400/40 underline-offset-4 transition hover:text-amber-300"
            >
              Don’t have the Excel file handy? Preview with sample 3A timetable ✨
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default TimetableUploader;
