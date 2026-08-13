import { AlertCircle } from "lucide-react";
import { formatMoney } from "@/lib/money";

interface PriceTagProps {
  originalPrice: string | null;
  originalCurrency: string | null;
  convertedPrice: string | null;
  baseCurrency: string | null;
  conversionStatus: string;
}

export function PriceTag({ originalPrice, originalCurrency, convertedPrice, baseCurrency, conversionStatus }: PriceTagProps) {
  if (!originalPrice) {
    return <span className="text-sm text-slate-400">No price set</span>;
  }

  const original = formatMoney(originalPrice, originalCurrency);

  if (conversionStatus === "not_needed") {
    return <span className="text-sm font-medium text-slate-900">{original}</span>;
  }

  if (convertedPrice && baseCurrency) {
    return (
      <span className="text-sm">
        <span className="font-medium text-slate-900">{original}</span>{" "}
        <span className="text-slate-400">≈ {formatMoney(convertedPrice, baseCurrency)}</span>
      </span>
    );
  }

  return (
    <span className="text-sm inline-flex items-center gap-1">
      <span className="font-medium text-slate-900">{original}</span>
      <span
        className="inline-flex items-center gap-0.5 text-amber-600 text-xs"
        title="Exchange rate unavailable — showing original price only"
      >
        <AlertCircle className="h-3 w-3" />
        rate unavailable
      </span>
    </span>
  );
}
