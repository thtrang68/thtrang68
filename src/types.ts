export type Priority = 'low' | 'medium' | 'high';

export interface Schedule {
  id: string;
  title: string;
  startTime: Date;
  completed: boolean;
  createdAt: Date;
  priority: Priority;
  recurring?: 'daily' | 'weekly' | 'none';
  userId?: string;
}

export type ScheduleInput = Omit<Schedule, 'id' | 'createdAt' | 'completed'>;
