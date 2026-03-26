import { format, isPast, differenceInMinutes, isBefore, addHours } from 'date-fns';
import { vi } from 'date-fns/locale';
import { CheckCircle2, Circle, Clock, AlertCircle, Trash2, Flag, Repeat } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Schedule } from '../types';

interface ScheduleItemProps {
  schedule: Schedule;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function ScheduleItem({ schedule, onToggle, onDelete }: ScheduleItemProps) {
  const isOverdue = isPast(schedule.startTime) && !schedule.completed;
  const isUpcoming = !schedule.completed && !isOverdue;
  const minutesUntil = differenceInMinutes(schedule.startTime, new Date());
  const isSoon = isUpcoming && minutesUntil <= 60 && minutesUntil > 0;

  const priorityColors = {
    high: "text-red-500 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30",
    medium: "text-amber-500 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30",
    low: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30"
  };

  const priorityLabels = {
    high: "Gấp",
    medium: "Vừa",
    low: "Thấp"
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        "group relative flex items-center gap-4 p-5 rounded-3xl border transition-all duration-300",
        schedule.completed 
          ? "bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 opacity-60" 
          : isOverdue 
            ? "bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 shadow-sm" 
            : isSoon 
              ? "bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30 shadow-md animate-pulse" 
              : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-900 hover:shadow-lg"
      )}
    >
      <button
        onClick={() => onToggle(schedule.id)}
        className={cn(
          "flex-shrink-0 transition-transform active:scale-90",
          schedule.completed ? "text-green-500" : "text-gray-300 dark:text-gray-700 hover:text-indigo-400"
        )}
      >
        {schedule.completed ? <CheckCircle2 size={28} /> : <Circle size={28} />}
      </button>

      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className={cn(
            "text-lg font-bold truncate transition-all",
            schedule.completed ? "line-through text-gray-400" : "text-gray-900 dark:text-white"
          )}>
            {schedule.title}
          </h3>
          
          {!schedule.completed && (
            <span className={cn(
              "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border",
              priorityColors[schedule.priority]
            )}>
              {priorityLabels[schedule.priority]}
            </span>
          )}

          {schedule.recurring && schedule.recurring !== 'none' && (
            <div className="p-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-md" title="Lặp lại">
              <Repeat size={10} />
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full",
            schedule.completed 
              ? "bg-gray-100 dark:bg-gray-800 text-gray-500" 
              : isOverdue 
                ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" 
                : isSoon 
                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" 
                  : "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
          )}>
            <Clock size={12} />
            {format(schedule.startTime, 'HH:mm - d/M', { locale: vi })}
          </div>

          {isOverdue && (
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-500">
              <AlertCircle size={10} />
              Quá hạn
            </span>
          )}

          {isSoon && (
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-500">
              <Clock size={10} />
              Sắp diễn ra ({minutesUntil} phút)
            </span>
          )}
        </div>
      </div>

      <button
        onClick={() => onDelete(schedule.id)}
        className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"
      >
        <Trash2 size={18} />
      </button>
    </motion.div>
  );
}
