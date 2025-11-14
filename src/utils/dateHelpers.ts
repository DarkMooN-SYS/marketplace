// Mongolian month names
const mongolianMonths = [
  '1-р сар', '2-р сар', '3-р сар', '4-р сар',
  '5-р сар', '6-р сар', '7-р сар', '8-р сар',
  '9-р сар', '10-р сар', '11-р сар', '12-р сар'
];

const mongolianMonthsFull = [
  'Нэгдүгээр сар', 'Хоёрдугаар сар', 'Гуравдугаар сар', 'Дөрөвдүгээр сар',
  'Тавдугаар сар', 'Зургадугаар сар', 'Долоодугаар сар', 'Наймдугаар сар',
  'Есдүгээр сар', 'Аравдугаар сар', 'Арван нэгдүгээр сар', 'Арван хоёрдугаар сар'
];

/**
 * Format date safely, returns fallback if invalid
 * Supports: string, Date, Firestore Timestamp
 */
export function formatDate(
  dateValue: string | Date | null | undefined | { toDate?: () => Date; _seconds?: number },
  locale: string = 'mn-MN',
  options?: Intl.DateTimeFormatOptions,
  fallback: string = '—'
): string {
  if (!dateValue) return fallback;
  
  try {
    let date: Date;
    
    // Handle string
    if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    } 
    // Handle Date object
    else if (dateValue instanceof Date) {
      date = dateValue;
    }
    // Handle Firestore Timestamp with toDate method
    else if (typeof dateValue === 'object' && 'toDate' in dateValue && typeof dateValue.toDate === 'function') {
      date = dateValue.toDate();
    }
    // Handle Firestore Timestamp with _seconds
    else if (typeof dateValue === 'object' && '_seconds' in dateValue && dateValue._seconds) {
      date = new Date(dateValue._seconds * 1000);
    }
    // Unknown format
    else {
      console.warn('Unknown date format:', dateValue);
      return fallback;
    }
    
    // Check if date is valid
    if (!date || isNaN(date.getTime())) {
      console.warn('Invalid date:', dateValue);
      return fallback;
    }
    
    // Custom Mongolian formatting
    if (locale === 'mn-MN') {
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      
      // If options specified
      if (options) {
        if (options.month === 'long' && options.year === 'numeric') {
          // Format: "Нэгдүгээр сар 2023"
          return `${mongolianMonthsFull[month]} ${year}`;
        } else if (options.month === 'long') {
          // Format: "Нэгдүгээр сар"
          return mongolianMonthsFull[month];
        } else if (options.month === 'short') {
          // Format: "1-р сар 2023"
          return `${mongolianMonths[month]} ${year}`;
        } else if (options.month === 'numeric' || options.day === 'numeric') {
          // Format: "2023/1/15"
          return `${year}/${month + 1}/${day}`;
        }
      }
      
      // Default Mongolian format: "2023 оны 1-р сарын 15"
      return `${year} оны ${month + 1}-р сарын ${day}`;
    }
    
    return date.toLocaleDateString(locale, options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return fallback;
  }
}

/**
 * Format date and time safely
 * Supports: string, Date, Firestore Timestamp
 */
export function formatDateTime(
  dateValue: string | Date | null | undefined | { toDate?: () => Date; _seconds?: number },
  locale: string = 'mn-MN',
  options?: Intl.DateTimeFormatOptions,
  fallback: string = '—'
): string {
  if (!dateValue) return fallback;
  
  try {
    let date: Date;
    
    if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === 'object' && 'toDate' in dateValue && typeof dateValue.toDate === 'function') {
      date = dateValue.toDate();
    } else if (typeof dateValue === 'object' && '_seconds' in dateValue && dateValue._seconds) {
      date = new Date(dateValue._seconds * 1000);
    } else {
      console.warn('Unknown date format:', dateValue);
      return fallback;
    }
    
    if (!date || isNaN(date.getTime())) {
      console.warn('Invalid date:', dateValue);
      return fallback;
    }
    
    // Custom Mongolian formatting for datetime
    if (locale === 'mn-MN' && options) {
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      if (options.month === 'short' && options.year === 'numeric') {
        // Format: "1-р сар 15, 2023 14:30"
        return `${mongolianMonths[month]} ${day}, ${year} ${hours}:${minutes}`;
      } else if (options.month === 'short') {
        // Format: "1-р сар 15, 14:30"
        return `${mongolianMonths[month]} ${day}, ${hours}:${minutes}`;
      } else if (options.month === 'long') {
        // Format: "Нэгдүгээр сар 15, 14:30"
        return `${mongolianMonthsFull[month]} ${day}, ${hours}:${minutes}`;
      }
    }
    
    return date.toLocaleString(locale, options);
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return fallback;
  }
}

/**
 * Check if date is valid
 * Supports: string, Date, Firestore Timestamp
 */
export function isValidDate(dateValue: string | Date | null | undefined | { toDate?: () => Date; _seconds?: number }): boolean {
  if (!dateValue) return false;
  
  try {
    let date: Date;
    
    if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === 'object' && 'toDate' in dateValue && typeof dateValue.toDate === 'function') {
      date = dateValue.toDate();
    } else if (typeof dateValue === 'object' && '_seconds' in dateValue && dateValue._seconds) {
      date = new Date(dateValue._seconds * 1000);
    } else {
      return false;
    }
    
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

/**
 * Get timestamp from date safely
 * Supports: string, Date, Firestore Timestamp
 */
export function getTimestamp(dateValue: string | Date | null | undefined | { toDate?: () => Date; _seconds?: number }): number {
  if (!dateValue) return 0;
  
  try {
    let date: Date;
    
    if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === 'object' && 'toDate' in dateValue && typeof dateValue.toDate === 'function') {
      date = dateValue.toDate();
    } else if (typeof dateValue === 'object' && '_seconds' in dateValue && dateValue._seconds) {
      date = new Date(dateValue._seconds * 1000);
    } else {
      return 0;
    }
    
    return isNaN(date.getTime()) ? 0 : date.getTime();
  } catch {
    return 0;
  }
}

/**
 * Format number with locale
 */
export function formatNumber(value: number | null | undefined, locale: string = 'en-US'): string {
  if (value === null || value === undefined) return '0';
  return value.toLocaleString(locale);
}
