import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./AppSidebar"
import UserMenu from "@/components/auth/UserMenu"
import RealtimeNotificationCenter from "./RealtimeNotificationCenter"
import { InstallPrompt } from "@/components/mobile/InstallPrompt"
import { BottomNavigation } from "@/components/mobile/BottomNavigation"
import { OfflineIndicator } from "@/components/mobile/OfflineIndicator"
import { useIsMobile } from "@/hooks/use-mobile"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {!isMobile && <AppSidebar />}
        
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="flex h-14 items-center gap-4 px-4">
              {!isMobile && <SidebarTrigger className="h-8 w-8" />}
              <div className="flex-1" />
              <div className="flex items-center gap-2 md:gap-4">
                <RealtimeNotificationCenter />
                {!isMobile && (
                  <div className="text-sm text-muted-foreground">
                    Luvimg Portal
                  </div>
                )}
                <UserMenu />
              </div>
            </div>
          </header>
          
          <main className={`flex-1 p-3 md:p-6 ${isMobile ? 'pb-20' : ''}`}>
            {children}
          </main>
        </div>
        
        <InstallPrompt />
        <OfflineIndicator />
        <BottomNavigation />
      </div>
    </SidebarProvider>
  )
}