import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("animate-pulse-soft rounded-lg bg-foreground/[0.06]", className)}
      {...props}
    />
  );
}

export { Skeleton };
