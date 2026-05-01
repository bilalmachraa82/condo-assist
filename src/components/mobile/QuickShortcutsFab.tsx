import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Wrench, Bell, MailQuestion, Zap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNotificationBadge } from "@/hooks/useNotificationBadge";
import { cn } from "@/lib/utils";

const shortcuts = [
  { title: "Assistências", url: "/assistencias", icon: Wrench },
  { title: "Follow-ups", url: "/follow-ups", icon: Bell },
  { title: "Pendências Email", url: "/pendencias-email", icon: MailQuestion },
];

export function QuickShortcutsFab() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { getBadgeForRoute } = useNotificationBadge();
  const [open, setOpen] = useState(false);

  if (!isMobile) return null;

  const go = (url: string) => {
    setOpen(false);
    navigate(url);
  };

  return (
    <>
      {open && (
        <button
          aria-label="Fechar atalhos"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm animate-fade-in"
        />
      )}

      <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3">
        {open &&
          shortcuts.map((s, i) => {
            const badge = getBadgeForRoute(s.url);
            const active = location.pathname === s.url;
            return (
              <div
                key={s.url}
                className="flex items-center gap-2 animate-fade-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <span className="rounded-full bg-card text-card-foreground text-xs font-medium px-3 py-1 shadow-md border">
                  {s.title}
                </span>
                <Button
                  onClick={() => go(s.url)}
                  size="icon"
                  className={cn(
                    "relative h-12 w-12 rounded-full shadow-lg",
                    active && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                  aria-label={s.title}
                >
                  <s.icon className="h-5 w-5" />
                  {badge > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center"
                    >
                      {badge > 9 ? "9+" : badge}
                    </Badge>
                  )}
                </Button>
              </div>
            );
          })}

        <Button
          onClick={() => setOpen((o) => !o)}
          variant="fab"
          size="fab"
          aria-label={open ? "Fechar atalhos" : "Abrir atalhos"}
          aria-expanded={open}
          className={cn(
            "shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95",
            open && "rotate-45"
          )}
        >
          {open ? <X className="h-6 w-6" /> : <Zap className="h-6 w-6" />}
        </Button>
      </div>
    </>
  );
}
