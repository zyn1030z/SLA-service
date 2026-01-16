/**
 * Format a date/time string or Date object to local time string
 * Handles UTC dates from database correctly by converting to local timezone
 */
export const formatDateTime = (dateInput: string | Date): string => {
  const date = new Date(dateInput);

  // JavaScript Date object automatically converts UTC strings to local timezone
  // when using getHours(), getFullYear(), etc. No additional conversion needed

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * Format a date/time to Vietnamese locale string
 */
export const formatDateTimeVN = (dateInput: string | Date): string => {
  const date = new Date(dateInput);
  return date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};
