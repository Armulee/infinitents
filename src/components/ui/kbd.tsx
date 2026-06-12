import { cn } from "@/lib/utils";

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center gap-0.5 rounded border border-border bg-secondary/80 px-1.5 font-sans text-[10.5px] font-medium text-muted-foreground shadow-[0_1px_0_var(--color-border)]",
        className,
      )}
      {...props}
    />
  );
}

export { Kbd };
