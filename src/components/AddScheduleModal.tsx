import React, { useState } from 'react';
import { X, Plus, CalendarDays, Clock, Sparkles, Loader2, Flag, Repeat } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { Priority } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

interface AddScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (title: string, startTime: Date, priority: Priority, recurring: 'daily' | 'weekly' | 'none') => void;
}

export default function AddScheduleModal({ isOpen, onClose, onAdd }: AddScheduleModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));
  const [priority, setPriority] = useState<Priority>('medium');
  const [recurring, setRecurring] = useState<'daily' | 'weekly' | 'none'>('none');
  const [aiInput, setAiInput] = useState('');
  const [isAiParsing, setIsAiParsing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const startTime = new Date(`${date}T${time}`);
    onAdd(title, startTime, priority, recurring);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setTitle('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setTime(format(new Date(), 'HH:mm'));
    setPriority('medium');
    setRecurring('none');
    setAiInput('');
  };

  const handleAIParse = async () => {
    if (!aiInput.trim()) return;
    setIsAiParsing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Phân tích câu sau thành thông tin lịch trình: "${aiInput}". 
        Hôm nay là ${format(new Date(), 'yyyy-MM-dd HH:mm')}.
        Trả về JSON với các trường: title (string), date (YYYY-MM-DD), time (HH:mm), priority (low, medium, high), recurring (daily, weekly, none).`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              date: { type: Type.STRING },
              time: { type: Type.STRING },
              priority: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
              recurring: { type: Type.STRING, enum: ['daily', 'weekly', 'none'] }
            },
            required: ['title', 'date', 'time', 'priority', 'recurring']
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      if (data.title) setTitle(data.title);
      if (data.date) setDate(data.date);
      if (data.time) setTime(data.time);
      if (data.priority) setPriority(data.priority as Priority);
      if (data.recurring) setRecurring(data.recurring as any);
    } catch (error) {
      console.error("AI Parse Error:", error);
    } finally {
      setIsAiParsing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl z-50 overflow-hidden border border-gray-100 dark:border-gray-800"
          >
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Thêm lịch trình thông minh</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* AI Input Section */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles size={12} />
                  Nhập nhanh bằng AI
                </label>
                <div className="relative">
                  <textarea
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="Ví dụ: Sáng mai 9h nhắc tôi đi họp quan trọng..."
                    className="w-full px-4 py-3 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm resize-none h-20 dark:text-white"
                  />
                  <button
                    onClick={handleAIParse}
                    disabled={isAiParsing || !aiInput.trim()}
                    className="absolute bottom-3 right-3 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                  >
                    {isAiParsing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  </button>
                </div>
              </div>

              <div className="h-[1px] bg-gray-100 dark:bg-gray-800" />

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Tên lịch trình
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ví dụ: Đi họp, Tập gym..."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Ngày
                    </label>
                    <div className="relative">
                      <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Giờ
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Mức độ ưu tiên
                    </label>
                    <div className="flex bg-gray-50 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                      {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPriority(p)}
                          className={cn(
                            "flex-grow py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                            priority === p 
                              ? p === 'high' ? "bg-red-500 text-white shadow-md" : 
                                p === 'medium' ? "bg-amber-500 text-white shadow-md" : 
                                "bg-emerald-500 text-white shadow-md"
                              : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                          )}
                        >
                          {p === 'low' ? 'Thấp' : p === 'medium' ? 'Vừa' : 'Gấp'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Lặp lại
                    </label>
                    <select
                      value={recurring}
                      onChange={(e) => setRecurring(e.target.value as any)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-xs font-bold dark:text-white"
                    >
                      <option value="none">Không lặp</option>
                      <option value="daily">Hàng ngày</option>
                      <option value="weekly">Hàng tuần</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-200 dark:shadow-none uppercase tracking-widest text-xs"
                >
                  <Plus size={20} />
                  Thêm lịch trình
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
