import { AlertCircle } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { Badge } from "./ui/Badge";

interface PriceTagProps {
  originalPrice: string | null;
  originalCurrency: string | null;
  convertedPrice: string | null;
  baseCurrency: string | null;
  conversionStatus: string;
}

export function PriceTag({ originalPrice, originalCurrency, convertedPrice, baseCurrency, conversionStatus }: PriceTagProps) {
  if (!originalPrice) {
    return <Badge tone="neutral">No price set</Badge>;
  }

  const original = formatMoney(originalPrice, originalCurrency);

  if (conversionStatus === "not_needed") {
    return <span className="text-base font-semibold tabular-nums text-foreground">{original}</span>;
  }

  if (convertedPrice && baseCurrency) {
    return (
      <span className="flex flex-wrap items-baseline gap-x-1.5">
        <span className="text-base font-semibold tabular-nums text-foreground">
          {formatMoney(convertedPrice, baseCurrency)}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">originally {original}</span>
      </span>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="text-base font-semibold tabular-nums text-foreground">{original}</span>
      <span
        className="inline-flex items-center gap-0.5 text-xs font-medium text-amber-600"
        title="Exchange rate unavailable — showing original price only"
      >
        <AlertCircle className="h-3 w-3" />
        rate unavailable
      </span>
    </span>
  );
}
