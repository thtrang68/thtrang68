import { useState, useEffect, useRef } from 'react';
import { Plus, Bell, CalendarDays, Clock, AlertCircle, Download, Search, Moon, Sun, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import TimeDisplay from './components/TimeDisplay';
import ScheduleList from './components/ScheduleList';
import AddScheduleModal from './components/AddScheduleModal';
import { Schedule, Priority } from './types';
import { isPast, differenceInMinutes, isBefore, addDays, addWeeks } from 'date-fns';
import { cn } from './lib/utils';
import { format } from 'date-fns';
import { GoogleGenAI, Type } from "@google/genai";

export default function App() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState<string[]>([]);
  const [urgentTask, setUrgentTask] = useState<Schedule | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  const [backendStatus, setBackendStatus] = useState<{ status: string, supabase: boolean } | null>(null);
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Apply dark mode class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // PWA Install Prompt logic
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(setNotificationPermission);
      }
    }
  }, []);

  // Native notification helper
  const sendNativeNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: 'https://cdn-icons-png.flaticon.com/512/3652/3652191.png',
      });
    }
  };

  // Louder and Rhythmic Alarm Sound
  const startAlarmSound = () => {
    if (!isSoundEnabled || audioIntervalRef.current) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const audioContext = audioContextRef.current;
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    const playBeep = () => {
      if (!isSoundEnabled) return;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'square'; // Sharper sound
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05); // Louder
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);
    };

    // Play a beep every 0.8 seconds
    audioIntervalRef.current = setInterval(playBeep, 800);
    playBeep();
  };

  const toggleSound = () => {
    if (!isSoundEnabled) {
      // Initialize audio context on user interaction
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      audioContextRef.current.resume();
    } else {
      stopAlarmSound();
    }
    setIsSoundEnabled(!isSoundEnabled);
  };

  const stopAlarmSound = () => {
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
  };

  // Load data from backend and localStorage on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        console.log("Backend health check:", data);
        setBackendStatus(data);
      } catch (e) {
        console.error("Backend health check failed:", e);
        setBackendStatus({ status: 'error', supabase: false });
      }
    };
    checkHealth();

    const fetchSchedules = async () => {
      let backendSchedules: Schedule[] = [];
      try {
        const response = await fetch('/api/schedules');
        if (response.ok) {
          const data = await response.json();
          backendSchedules = data.map((s: any) => ({
            id: s.id,
            title: s.title,
            startTime: new Date(s.start_time),
            completed: s.completed,
            createdAt: new Date(s.created_at),
            priority: s.priority || 'medium',
            recurring: s.recurring || 'none'
          }));
        }
      } catch (e) {
        console.error("Failed to fetch schedules from backend", e);
      }

      // Load from localStorage
      const localData = localStorage.getItem('local_schedules');
      const localSchedules: Schedule[] = localData ? JSON.parse(localData).map((s: any) => ({
        ...s,
        startTime: new Date(s.startTime),
        createdAt: new Date(s.createdAt)
      })) : [];

      // Merge and remove duplicates by ID
      const allSchedules = [...backendSchedules];
      localSchedules.forEach(ls => {
        if (!allSchedules.find(as => as.id === ls.id)) {
          allSchedules.push(ls);
        }
      });

      setSchedules(allSchedules.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    };
    fetchSchedules();
  }, []);

  // Save local schedules to localStorage whenever they change
  useEffect(() => {
    const localOnly = schedules.filter(s => s.id.startsWith('local_'));
    localStorage.setItem('local_schedules', JSON.stringify(localOnly));
  }, [schedules]);

  // Notification and Urgent Task logic
  useEffect(() => {
    const checkReminders = () => {
      const newNotifications: string[] = [];
      const now = new Date();
      let mostUrgent: Schedule | null = null;
      let shouldPlayAlarm = false;

      schedules.forEach(schedule => {
        if (schedule.completed) return;

        const minutesUntil = differenceInMinutes(schedule.startTime, now);
        const secondsUntil = Math.floor((schedule.startTime.getTime() - now.getTime()) / 1000);
        
        // Find most urgent
        if (isPast(schedule.startTime) || (minutesUntil <= 60 && minutesUntil > 0)) {
          if (!mostUrgent || 
              (isPast(mostUrgent.startTime) && isPast(schedule.startTime) && isBefore(schedule.startTime, mostUrgent.startTime)) ||
              (!isPast(mostUrgent.startTime) && minutesUntil < differenceInMinutes(mostUrgent.startTime, now))) {
            mostUrgent = schedule;
          }
        }

        // 1 hour reminder (only once)
        if (minutesUntil === 60 && secondsUntil === 3600) {
          newNotifications.push(`Sắp đến giờ: ${schedule.title} (còn 1 tiếng)`);
          sendNativeNotification('Sắp đến giờ!', schedule.title);
        }

        // Exact time or Overdue logic
        if (isPast(schedule.startTime)) {
          const secondsPast = Math.floor((now.getTime() - schedule.startTime.getTime()) / 1000);
          
          // Logic: 1 minute ON, 5 minutes OFF (Cycle = 6 minutes = 360 seconds)
          const cycleSeconds = secondsPast % 360;
          if (cycleSeconds < 60) {
            shouldPlayAlarm = true;
          }

          // Initial notification exactly at start time (within first 2 seconds to be safe)
          if (secondsPast >= 0 && secondsPast < 2) {
            newNotifications.push(`ĐẾN GIỜ: ${schedule.title}!`);
            sendNativeNotification('ĐẾN GIỜ RỒI!', schedule.title);
          }
        }
      });

      setUrgentTask(mostUrgent);

      if (shouldPlayAlarm) {
        startAlarmSound();
      } else {
        stopAlarmSound();
      }

      if (newNotifications.length > 0) {
        setNotifications(prev => [...prev, ...newNotifications]);
        setTimeout(() => {
          setNotifications(prev => prev.slice(newNotifications.length));
        }, 10000);
      }
    };

    // Check every second for precision
    const interval = setInterval(checkReminders, 1000);
    checkReminders();
    return () => {
      clearInterval(interval);
      stopAlarmSound();
    };
  }, [schedules]);

  const handleAddSchedule = async (title: string, startTime: Date, priority: Priority = 'medium', recurring: 'daily' | 'weekly' | 'none' = 'none') => {
    const tempId = `local_${Date.now()}`;
    const newLocalSchedule: Schedule = {
      id: tempId,
      title,
      startTime,
      completed: false,
      createdAt: new Date(),
      priority,
      recurring,
    };

    // Optimistically add to UI
    setSchedules(prev => [newLocalSchedule, ...prev]);

    try {
      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, startTime, priority, recurring })
      });
      
      if (response.ok) {
        const s = await response.json();
        const syncedSchedule: Schedule = {
          id: s.id,
          title: s.title,
          startTime: new Date(s.start_time),
          completed: s.completed,
          createdAt: new Date(s.created_at),
          priority: s.priority,
          recurring: s.recurring,
        };
        // Replace temp local schedule with synced one from DB
        setSchedules(prev => prev.map(item => item.id === tempId ? syncedSchedule : item));
      } else {
        console.warn("Backend save failed, keeping in local storage.");
      }
    } catch (e) {
      console.error("Failed to sync with backend, kept in local storage.", e);
    }
  };

  const handleToggleSchedule = async (id: string) => {
    const schedule = schedules.find(s => s.id === id);
    if (!schedule) return;

    const isCompleting = !schedule.completed;

    // Update UI immediately
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, completed: isCompleting } : s));

    // Handle recurring logic immediately
    if (isCompleting && schedule.recurring && schedule.recurring !== 'none') {
      const nextStartTime = schedule.recurring === 'daily' 
        ? addDays(schedule.startTime, 1) 
        : addWeeks(schedule.startTime, 1);
      
      setTimeout(() => {
        handleAddSchedule(schedule.title, nextStartTime, schedule.priority, schedule.recurring);
      }, 500);
    }

    if (id.startsWith('local_')) return;

    try {
      const response = await fetch(`/api/schedules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: isCompleting })
      });
      if (!response.ok) throw new Error('Failed to update');
    } catch (e) {
      console.error("Failed to update schedule on server", e);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    // Update UI immediately
    setSchedules(prev => prev.filter(s => s.id !== id));

    if (id.startsWith('local_')) return;

    try {
      const response = await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
    } catch (e) {
      console.error("Failed to delete schedule on server", e);
    }
  };

  const filteredSchedules = schedules.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8F9FC] dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans selection:bg-indigo-100 selection:text-indigo-900 transition-colors duration-300">
      {/* Background patterns */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-100/50 dark:bg-indigo-900/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-24 w-64 h-64 bg-pink-100/30 dark:bg-pink-900/10 rounded-full blur-3xl" />
      </div>

      <main className="relative max-w-2xl mx-auto px-6 py-12">
        {/* Header Section */}
        <header className="mb-12 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
                <CalendarDays className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">Lịch Trình</h1>
                <p className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">Thông Minh</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {backendStatus && (
                <div className={cn(
                  "hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider border transition-all",
                  backendStatus.supabase 
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30" 
                    : "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/30"
                )}>
                  <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", backendStatus.supabase ? "bg-emerald-500" : "bg-amber-500")} />
                  {backendStatus.supabase ? "Supabase Connected" : "Supabase Missing"}
                </div>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleSound}
                className={cn(
                  "p-3 rounded-2xl border shadow-sm hover:shadow-md transition-all",
                  isSoundEnabled 
                    ? "bg-indigo-50 border-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:border-indigo-900/30 dark:text-indigo-400" 
                    : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400"
                )}
                title={isSoundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}
              >
                {isSoundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all text-gray-400"
                title={isDarkMode ? "Chế độ sáng" : "Chế độ tối"}
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </motion.button>

              {deferredPrompt && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleInstallApp}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl text-[10px] font-black text-indigo-600 dark:text-indigo-400 shadow-sm hover:shadow-md transition-all uppercase tracking-widest"
                >
                  <Download size={14} />
                  Tải App
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative p-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all"
              >
                <Bell className="text-gray-400" size={20} />
                {notifications.length > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />
                )}
              </motion.button>
            </div>
          </div>

          <TimeDisplay />
        </header>

        {/* Urgent Task Banner */}
        <AnimatePresence>
          {urgentTask && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <div className={cn(
                "p-6 rounded-3xl border-2 flex items-center gap-4 shadow-xl",
                isPast(urgentTask.startTime) 
                  ? "bg-red-600 border-red-500 text-white" 
                  : "bg-amber-500 border-amber-400 text-white"
              )}>
                <div className="p-3 bg-white/20 rounded-2xl">
                  {isPast(urgentTask.startTime) ? <AlertCircle size={24} /> : <Clock size={24} />}
                </div>
                <div className="flex-grow">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
                    {isPast(urgentTask.startTime) ? "Đang quá hạn!" : "Sắp diễn ra"}
                  </p>
                  <h2 className="text-xl font-black truncate">{urgentTask.title}</h2>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black tabular-nums">
                    {format(urgentTask.startTime, 'HH:mm')}
                  </p>
                  <p className="text-[10px] font-bold opacity-80">
                    {isPast(urgentTask.startTime) ? "Bắt đầu lúc" : "Bắt đầu sau " + differenceInMinutes(urgentTask.startTime, new Date()) + "p"}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notifications Toast */}
        <div className="fixed top-6 right-6 z-[100] space-y-3 pointer-events-none">
          <AnimatePresence>
            {notifications.map((note, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.9 }}
                className="pointer-events-auto flex items-center gap-3 px-5 py-4 bg-gray-900 text-white rounded-2xl shadow-2xl min-w-[300px]"
              >
                <div className="p-2 bg-white/10 rounded-xl">
                  <AlertCircle size={18} className="text-amber-400" />
                </div>
                <p className="text-sm font-medium">{note}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Schedule Section */}
        <section className="space-y-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">
                Danh sách lịch trình
              </h2>
              <div className="h-[1px] flex-grow mx-4 bg-gray-100" />
            </div>

            {/* Search Bar */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Tìm kiếm lịch trình..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm hover:shadow-md dark:text-white"
              />
            </div>
          </div>

          <ScheduleList
            schedules={filteredSchedules}
            totalSchedules={schedules.length}
            onToggle={handleToggleSchedule}
            onDelete={handleDeleteSchedule}
          />
        </section>

        {/* Floating Action Button */}
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-10 right-10 w-16 h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-300 transition-all z-40"
        >
          <Plus size={32} />
        </motion.button>

        <AddScheduleModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAdd={handleAddSchedule}
        />
      </main>
    </div>
  );
}
