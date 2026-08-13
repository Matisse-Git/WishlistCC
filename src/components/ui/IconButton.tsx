import { forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "default" | "danger" | "success";

const VARIANT_CLASSES: Record<Variant, string> = {
  default: "text-muted-foreground hover:text-foreground hover:bg-surface-muted",
  danger: "text-muted-foreground hover:text-destructive hover:bg-destructive-soft",
  success: "text-muted-foreground hover:text-success hover:bg-success-soft",
};

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  "aria-label": string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = "default", className, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        VARIANT_CLASSES[variant],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
