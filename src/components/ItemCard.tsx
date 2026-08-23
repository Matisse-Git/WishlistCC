"use client";

import Link from "next/link";
import { Pencil, ShoppingCart, Trash2, ExternalLink, CheckCircle2, Layers } from "lucide-react";
import { PriceTag } from "./PriceTag";
import { Badge } from "./ui/Badge";
import { IconButton } from "./ui/IconButton";
import { ImageThumbnail } from "./ui/ImageThumbnail";
import { Card } from "./ui/Card";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import type { SerializedItem } from "@/lib/items";

const PRIORITY_TONE: Record<string, "destructive" | "warning" | "neutral"> = {
  high: "destructive",
  medium: "warning",
  low: "neutral",
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
    <Card hover padding="none" className="group flex flex-col overflow-hidden">
      <div className="relative">
        <ImageThumbnail src={item.imageUrl} alt={item.title} className="aspect-[4/3] w-full" />
        {isBought && (
          <div className="absolute left-2.5 top-2.5">
            <Badge tone="success" className="bg-white/90 shadow-sm backdrop-blur">
              <CheckCircle2 className="h-3 w-3" />
              Bought
            </Badge>
          </div>
        )}
        {!isBought && item.priority && (
          <div className="absolute left-2.5 top-2.5">
            <Badge tone={PRIORITY_TONE[item.priority]} className="bg-white/90 capitalize shadow-sm backdrop-blur">
              {item.priority}
            </Badge>
          </div>
        )}
      </div>

      <div className={`flex flex-1 flex-col gap-2 p-4 ${isBought ? "opacity-90" : ""}`}>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground" title={item.title}>
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-start gap-1 hover:text-accent-hover hover:underline"
            >
              {item.title}
              <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
            </a>
          ) : (
            item.title
          )}
        </h3>

        {item.store && <p className="text-xs text-muted-foreground">{item.store}</p>}

        {isBought ? (
          <div className="text-sm">
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-semibold tabular-nums text-foreground">
                {formatMoney(item.boughtPrice, item.boughtCurrency)}
              </span>
              {item.boughtAt && <span className="text-xs text-muted-foreground">{formatDate(item.boughtAt)}</span>}
            </div>
            {item.originalPrice &&
              (item.boughtPrice !== item.originalPrice || item.boughtCurrency !== item.originalCurrency) && (
                <div className="text-xs tabular-nums text-muted-foreground">
                  Wishlist price: {formatMoney(item.originalPrice, item.originalCurrency)}
                </div>
              )}
            {item.notes && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.notes}</p>}
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

        {item.group && (
          <Link href={`/groups/${item.group.id}`} className="w-fit">
            <Badge tone="neutral" className="hover:bg-border/60">
              <Layers className="h-3 w-3" />
              {item.group.name}
            </Badge>
          </Link>
        )}

        {item.labels.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.labels.map((l) => (
              <Badge key={l.id} tone="accent">
                {l.name}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-2.5">
          <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
          <div className="flex items-center gap-0.5">
            {onEdit && (
              <IconButton onClick={() => onEdit(item)} aria-label="Edit item">
                <Pencil className="h-3.5 w-3.5" />
              </IconButton>
            )}
            {onMarkBought && !isBought && (
              <IconButton variant="success" onClick={() => onMarkBought(item)} aria-label="Mark as bought">
                <ShoppingCart className="h-3.5 w-3.5" />
              </IconButton>
            )}
            {onDelete && (
              <IconButton variant="danger" onClick={() => onDelete(item)} aria-label="Delete item">
                <Trash2 className="h-3.5 w-3.5" />
              </IconButton>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
