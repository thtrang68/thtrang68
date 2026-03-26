import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Clock, CalendarDays } from 'lucide-react';
import { motion } from 'motion/react';

export default function TimeDisplay() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center p-8 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md rounded-3xl border border-white/20 dark:border-gray-800 shadow-xl"
    >
      <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 mb-2">
        <CalendarDays size={18} />
        <span className="text-sm font-medium uppercase tracking-widest">
          {format(now, 'EEEE, d MMMM yyyy', { locale: vi })}
        </span>
      </div>
      
      <div className="flex items-center gap-4">
        <Clock className="text-indigo-500" size={32} />
        <h1 className="text-6xl font-bold tracking-tighter text-gray-900 dark:text-white tabular-nums">
          {format(now, 'HH:mm:ss')}
        </h1>
      </div>
    </motion.div>
  );
}
