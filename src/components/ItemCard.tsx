"use client";

import { Pencil, ShoppingCart, Trash2, ExternalLink } from "lucide-react";
import { PriceTag } from "./PriceTag";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import type { SerializedItem } from "@/lib/items";

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-red-50 text-red-700",
  medium: "bg-amber-50 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};

interface ItemCardProps {
  item: SerializedItem;
  onEdit?: (item: SerializedItem) => void;
  onMarkBought?: (item: SerializedItem) => void;
  onDelete?: (item: SerializedItem) => void;
}

export function ItemCard({ item, onEdit, onMarkBought, onDelete }: ItemCardProps) {
  const isBought = item.status === "bought";

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
      <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center overflow-hidden">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span className="text-slate-300 text-xs">No image</span>
        )}
      </div>

      <div className="p-3.5 flex-1 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium text-slate-900 line-clamp-2" title={item.title}>
            {item.url ? (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline inline-flex gap-1">
                {item.title}
                <ExternalLink className="h-3 w-3 shrink-0 mt-0.5 text-slate-400" />
              </a>
            ) : (
              item.title
            )}
          </h3>
          {item.priority && (
            <span className={`shrink-0 text-[10px] font-medium uppercase rounded px-1.5 py-0.5 ${PRIORITY_STYLES[item.priority]}`}>
              {item.priority}
            </span>
          )}
        </div>

        {item.store && <p className="text-xs text-slate-400">{item.store}</p>}

        {isBought ? (
          <div className="text-sm">
            <div>
              <span className="font-medium text-slate-900">
                {formatMoney(item.boughtPrice, item.boughtCurrency)}
              </span>
              {item.boughtAt && (
                <span className="text-slate-400"> · {formatDate(item.boughtAt)}</span>
              )}
            </div>
            {item.originalPrice &&
              (item.boughtPrice !== item.originalPrice || item.boughtCurrency !== item.originalCurrency) && (
                <div className="text-xs text-slate-400">
                  Wishlist price: {formatMoney(item.originalPrice, item.originalCurrency)}
                </div>
              )}
            {item.notes && <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{item.notes}</p>}
          </div>
        ) : (
          <PriceTag
            originalPrice={item.originalPrice}
            originalCurrency={item.originalCurrency}
            convertedPrice={item.convertedPrice}
            baseCurrency={item.baseCurrency}
            conversionStatus={item.conversionStatus}
          />
        )}

        {item.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.labels.map((l) => (
              <span key={l.id} className="text-[10px] rounded-full bg-slate-100 text-slate-600 px-2 py-0.5">
                {l.name}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-2 flex items-center justify-between text-xs text-slate-400">
          <span>{formatDate(item.createdAt)}</span>
          <div className="flex items-center gap-2.5">
            {onEdit && (
              <button onClick={() => onEdit(item)} className="hover:text-slate-700" aria-label="Edit">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {onMarkBought && !isBought && (
              <button onClick={() => onMarkBought(item)} className="hover:text-emerald-600" aria-label="Mark bought">
                <ShoppingCart className="h-3.5 w-3.5" />
              </button>
            )}
            {onDelete && (
              <button onClick={() => onDelete(item)} className="hover:text-red-600" aria-label="Delete">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
