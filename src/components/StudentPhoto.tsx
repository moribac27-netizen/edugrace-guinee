import { useSignedUrl } from "@/hooks/useSignedUrl";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

export function StudentPhoto({
  path,
  name,
  className,
  size = "md",
}: {
  path: string | null | undefined;
  name?: string | null;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}) {
  const url = useSignedUrl(path);
  const dims = {
    xs: "size-8 text-[10px]",
    sm: "size-10 text-xs",
    md: "size-14 text-sm",
    lg: "size-20 text-base",
    xl: "size-28 text-lg",
  }[size];
  const initials = (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div
      className={cn(
        "rounded-full bg-muted text-muted-foreground flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-border",
        dims,
        className,
      )}
    >
      {url ? (
        <img src={url} alt={name ?? "Photo élève"} className="w-full h-full object-cover" loading="lazy" />
      ) : initials ? (
        <span className="font-semibold">{initials}</span>
      ) : (
        <User className="size-1/2" />
      )}
    </div>
  );
}
