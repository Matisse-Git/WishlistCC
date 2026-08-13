import { KNOWN_CURRENCY_CODES } from "@/lib/currencies";

interface CurrencySelectProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  allowEmpty?: boolean;
  className?: string;
  disabled?: boolean;
}

export function CurrencySelect({ value, onChange, id, allowEmpty, className = "", disabled }: CurrencySelectProps) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 ${className}`}
    >
      {allowEmpty && <option value="">—</option>}
      {KNOWN_CURRENCY_CODES.map((code) => (
        <option key={code} value={code}>
          {code}
        </option>
      ))}
    </select>
  );
}
