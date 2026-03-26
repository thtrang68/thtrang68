import { Schedule } from '../types';
import ScheduleItem from './ScheduleItem';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarOff } from 'lucide-react';

interface ScheduleListProps {
  schedules: Schedule[];
  totalSchedules: number;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function ScheduleList({ schedules, totalSchedules, onToggle, onDelete }: ScheduleListProps) {
  const sortedSchedules = [...schedules].sort((a, b) => {
    // 1. Completed tasks at the bottom
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    
    // 2. Sort by priority (High > Medium > Low)
    const priorityWeight = { high: 0, medium: 1, low: 2 };
    if (a.priority !== b.priority) {
      return priorityWeight[a.priority] - priorityWeight[b.priority];
    }
    
    // 3. Sort by time
    return a.startTime.getTime() - b.startTime.getTime();
  });

  if (totalSchedules === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center p-12 text-gray-400 dark:text-gray-600 bg-gray-50/50 dark:bg-gray-900/30 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800"
      >
        <CalendarOff size={48} className="mb-4 opacity-20" />
        <p className="text-lg font-medium">Chưa có lịch trình nào</p>
        <p className="text-sm">Hãy nhấn nút bên dưới để thêm mới!</p>
      </motion.div>
    );
  }

  if (schedules.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center p-12 text-gray-400 dark:text-gray-600 bg-gray-50/50 dark:bg-gray-900/30 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800"
      >
        <CalendarOff size={48} className="mb-4 opacity-20" />
        <p className="text-lg font-medium">Không tìm thấy kết quả</p>
        <p className="text-sm">Thử tìm kiếm với từ khóa khác xem sao!</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {sortedSchedules.map((schedule) => (
          <div key={schedule.id}>
            <ScheduleItem
              schedule={schedule}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
