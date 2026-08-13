import { KNOWN_CURRENCY_CODES } from "@/lib/currencies";
import { Select } from "./Input";

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
    <Select id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={className}>
      {allowEmpty && <option value="">—</option>}
      {KNOWN_CURRENCY_CODES.map((code) => (
        <option key={code} value={code}>
          {code}
        </option>
      ))}
    </Select>
  );
}
