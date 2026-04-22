import { addDays, getDay, format } from 'date-fns';

export const HK_HOLIDAYS = [
  // 2024
  '2024-01-01', '2024-02-10', '2024-02-12', '2024-02-13', '2024-03-29', '2024-03-30', '2024-04-01', '2024-04-04', '2024-05-01', '2024-05-15', '2024-06-10', '2024-07-01', '2024-09-18', '2024-10-01', '2024-10-11', '2024-12-25', '2024-12-26',
  // 2025
  '2025-01-01', '2025-01-29', '2025-01-30', '2025-01-31', '2025-04-04', '2025-04-18', '2025-04-19', '2025-04-21', '2025-05-01', '2025-05-05', '2025-05-31', '2025-07-01', '2025-10-01', '2025-10-07', '2025-10-29', '2025-12-25', '2025-12-26',
  // 2026
  '2026-01-01', '2026-02-17', '2026-02-18', '2026-02-19', '2026-04-03', '2026-04-04', '2026-04-05', '2026-04-06', '2026-05-01', '2026-05-24', '2026-06-19', '2026-07-01', '2026-09-25', '2026-10-01', '2026-10-18', '2026-12-25', '2026-12-26',
];

export function isHKHoliday(dateStr: string): boolean {
  return HK_HOLIDAYS.includes(dateStr);
}

// Check if a date is a working day (Not Sunday, Not Holiday)
export function isWorkingDay(date: Date): boolean {
  const isSunday = getDay(date) === 0;
  const isHoliday = isHKHoliday(format(date, 'yyyy-MM-dd'));
  return !isSunday && !isHoliday;
}

// Get the next working day (could be the same day if it's already a working day)
export function getNextWorkingDay(date: Date): Date {
  let currentDate = date;
  while (!isWorkingDay(currentDate)) {
    currentDate = addDays(currentDate, 1);
  }
  return currentDate;
}

// Calculate end date given a start date and duration in working days
export function calculateEndDate(startDate: Date, durationDays: number): Date {
  if (durationDays <= 0) return startDate;
  
  let currentDate = getNextWorkingDay(startDate);
  let daysCount = 1; // currentStart accounts for day 1
  
  while (daysCount < durationDays) {
    currentDate = addDays(currentDate, 1);
    if (isWorkingDay(currentDate)) {
      daysCount++;
    }
  }
  return currentDate;
}

/**
 * Legacy compatibility wrapping
 */
export function addWorkingDays(startDateStr: string, days: number): string {
    if (!startDateStr || isNaN(new Date(startDateStr).getTime())) return '';
    if (days <= 0) return startDateStr;
    const end = calculateEndDate(new Date(startDateStr), days);
    return format(end, 'yyyy-MM-dd');
}

export function formatGanttDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
}
