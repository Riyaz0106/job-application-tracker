// Date helpers. Thanks to the superjson transformer, dates from the API are real
// Date objects, so these receive Date (never strings).

const longFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const shortFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
});

export function formatDate(date: Date | null | undefined): string {
  return date ? longFormatter.format(date) : '—';
}

export function formatDateShort(date: Date | null | undefined): string {
  return date ? shortFormatter.format(date) : '—';
}

// yyyy-mm-dd in local time, for <input type="date"> values.
export function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
