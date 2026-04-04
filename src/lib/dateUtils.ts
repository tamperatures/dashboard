// src/lib/dateUtils.ts
// 香港公眾假期 (2024-2025 範例, 可擴充至資料庫中維護)
export const HK_HOLIDAYS_2024_2025 = [
    // 2024
    '2024-01-01', '2024-02-10', '2024-02-12', '2024-02-13',
    '2024-03-29', '2024-03-30', '2024-04-01', '2024-04-04',
    '2024-05-01', '2024-05-15', '2024-06-10', '2024-07-01',
    '2024-09-18', '2024-10-01', '2024-10-11', '2024-12-25', '2024-12-26',
    // 2025
    '2025-01-01', '2025-01-29', '2025-01-30', '2025-01-31',
    '2025-04-04', '2025-04-18', '2025-04-19', '2025-04-21',
    '2025-05-01', '2025-05-05', '2025-05-31', '2025-07-01',
    '2025-10-01', '2025-10-07', '2025-10-29', '2025-12-25', '2025-12-26'
];

/**
 * 自動推算完工日期，避開香港公眾假期與星期日
 * @param startDateStr 'YYYY-MM-DD'
 * @param days 預計工作天數
 */
export function addWorkingDays(startDateStr: string, days: number): string {
    if (!startDateStr || isNaN(new Date(startDateStr).getTime())) return '';
    let current = new Date(startDateStr);
    let addedDays = 0;

    // 如果天數是 0 或負數，直接返回原日期
    if (days <= 0) return startDateStr;

    while (addedDays < days) {
        current.setDate(current.getDate() + 1);
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, '0');
        const dd = String(current.getDate()).padStart(2, '0');
        const dateString = `${yyyy}-${mm}-${dd}`;
        
        // 0 is Sunday
        const isSunday = current.getDay() === 0;
        const isHoliday = HK_HOLIDAYS_2024_2025.includes(dateString);

        if (!isSunday && !isHoliday) {
            addedDays++;
        }
    }

    const resY = current.getFullYear();
    const resM = String(current.getMonth() + 1).padStart(2, '0');
    const resD = String(current.getDate()).padStart(2, '0');
    return `${resY}-${resM}-${resD}`;
}

export function formatGanttDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
}
