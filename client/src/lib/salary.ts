// Salary stays a single free-text column (no migration), because real salaries
// are ranges and qualifiers — "€65,000–80,000", "€70k + equity", "€450/day" —
// and forcing one number would throw that away. The currency therefore has to
// live inside the string: it is stored symbol-prefixed ("€65,000–80,000") and
// parsed back into the selector when the form reopens.

export const CURRENCIES = [
  { code: 'EUR', symbol: '€', example: '65,000–80,000' },
  { code: 'GBP', symbol: '£', example: '55,000–70,000' },
  { code: 'USD', symbol: '$', example: '120,000–150,000' },
  // CHF has no distinct glyph in common use, so the code doubles as the prefix.
  { code: 'CHF', symbol: 'CHF ', example: '110,000–130,000' },
  { code: 'INR', symbol: '₹', example: '25,00,000–35,00,000' },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]['code'];

export const DEFAULT_CURRENCY: CurrencyCode = 'EUR';

function currency(code: CurrencyCode) {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

export function symbolFor(code: CurrencyCode): string {
  return currency(code).symbol;
}

export function placeholderFor(code: CurrencyCode): string {
  return `${currency(code).example} or 70k`;
}

// Strips any currency marker the user typed themselves, so picking EUR and
// typing "€70k" stores "€70k" rather than "€€70k".
function stripSymbol(amount: string): string {
  let out = amount.trim();
  for (const { symbol, code } of CURRENCIES) {
    const marks = [symbol.trim(), code];
    for (const mark of marks) {
      if (out.toUpperCase().startsWith(mark.toUpperCase())) {
        out = out.slice(mark.length).trim();
      }
    }
  }
  return out;
}

// Form values -> the string stored in Application.salary.
export function formatSalary(code: CurrencyCode, amount: string): string {
  const value = stripSymbol(amount);
  return value ? `${symbolFor(code)}${value}` : '';
}

// Stored string -> form values. Anything without a recognised prefix (older
// free-text rows) keeps its text and falls back to the default currency.
export function parseSalary(stored: string | null | undefined): {
  currency: CurrencyCode;
  amount: string;
} {
  const value = (stored ?? '').trim();
  if (!value) return { currency: DEFAULT_CURRENCY, amount: '' };
  // Longest markers first so "CHF" wins before any single-character symbol.
  const markers = CURRENCIES.flatMap((c) => [
    { code: c.code, mark: c.symbol.trim() },
    { code: c.code, mark: c.code },
  ]).sort((a, b) => b.mark.length - a.mark.length);
  for (const { code, mark } of markers) {
    if (value.toUpperCase().startsWith(mark.toUpperCase())) {
      return { currency: code, amount: value.slice(mark.length).trim() };
    }
  }
  return { currency: DEFAULT_CURRENCY, amount: value };
}

// Empty is fine — salary is optional. Anything present must carry a number, so
// "dfdghdghgh" is rejected while "70k + equity" and "450/day" are not.
export function validateSalary(amount: string): string | null {
  const value = amount.trim();
  if (!value) return null;
  if (!/\d/.test(value)) {
    return 'Add a number — for example 65,000–80,000 or 70k.';
  }
  return null;
}
