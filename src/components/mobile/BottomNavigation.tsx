import { useState } from 'react';
import { Home, Wrench, Euro, Building2, Users, FileText, BarChart3, Menu } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNotificationBadge } from '@/hooks/useNotificationBadge';
import { cn } from '@/lib/utils';

const bottomNavItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Assistências", url: "/assistencias", icon: Wrench },
  { title: "Orçamentos", url: "/orcamentos", icon: Euro },
  { title: "Mais", url: "/more", icon: Menu }
];

const moreItems = [
  { title: "Edifícios", url: "/edificios", icon: Building2 },
  { title: "Fornecedores", url: "/fornecedores", icon: Users },
  { title: "Relatórios", url: "/relatorios", icon: FileText },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
];

export function BottomNavigation() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile();
  const { getBadgeForRoute } = useNotificationBadge();

  if (!isMobile) return null;

  const isActive = (path: string) => location.pathname === path;
  const isMoreSectionActive = moreItems.some(item => isActive(item.url));

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t z-50 safe-area-pb animate-fade-in">
        <nav className="flex items-center justify-around h-16 px-2">
          {bottomNavItems.map((item) => {
            if (item.url === "/more") {
              return (
                <Sheet key={item.title} open={moreOpen} onOpenChange={setMoreOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`flex flex-col items-center gap-1 h-auto py-2 px-3 min-w-0 flex-1 ${
                        isMoreSectionActive 
                          ? 'text-primary bg-primary/10' 
                          : 'text-muted-foreground'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="text-xs font-medium">{item.title}</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-auto">
                    <div className="grid grid-cols-2 gap-4 py-6">
                      {moreItems.map((moreItem) => (
                        <NavLink
                          key={moreItem.title}
                          to={moreItem.url}
                          onClick={() => setMoreOpen(false)}
                          className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-colors ${
                            isActive(moreItem.url)
                              ? 'bg-primary/10 text-primary'
                              : 'hover:bg-muted/50 text-muted-foreground'
                          }`}
                        >
                          <moreItem.icon className="h-6 w-6" />
                          <span className="text-sm font-medium">{moreItem.title}</span>
                        </NavLink>
                      ))}
                    </div>
                  </SheetContent>
                </Sheet>
              );
            }

            const badgeCount = getBadgeForRoute(item.url);
            
            return (
              <NavLink
                key={item.title}
                to={item.url}
                className={`relative flex flex-col items-center gap-1 py-2 px-3 min-w-0 flex-1 rounded-lg transition-all duration-200 ${
                  isActive(item.url) 
                    ? 'text-primary bg-primary/10 scale-105' 
                    : 'text-muted-foreground hover:text-foreground hover:scale-105'
                }`}
              >
                <div className="relative">
                  <item.icon className="h-5 w-5" />
                  {badgeCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center min-w-4"
                    >
                      {badgeCount > 9 ? '9+' : badgeCount}
                    </Badge>
                  )}
                </div>
                <span className="text-xs font-medium">{item.title}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom spacing for content */}
      <div className="h-16" />
    </>
  );
}