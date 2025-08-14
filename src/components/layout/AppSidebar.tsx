import {
  LayoutDashboard,
  Settings,
  FileText,
  Users,
  Building,
  ShoppingCart,
  Mail,
  BarChart4,
  LogOut,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();

  const menuItems = [
    {
      href: "/",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/assistances",
      label: "Assistências",
      icon: FileText,
    },
    {
      href: "/buildings",
      label: "Edifícios",
      icon: Building,
    },
    {
      href: "/suppliers",
      label: "Fornecedores",
      icon: Users,
    },
    {
      href: "/quotations",
      label: "Orçamentos",
      icon: Mail,
    },
    {
      href: "/invoices",
      label: "Faturas",
      icon: ShoppingCart,
    },
    {
      href: "/reports",
      label: "Relatórios",
      icon: BarChart4,
    },
    {
      href: "/settings",
      label: "Definições",
      icon: Settings,
    },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <Sidebar collapsible="icon" className="border-r bg-card">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <img 
              src="/logo-luvimg.png" 
              alt="Luvimg" 
              className="h-6 w-6 object-contain"
              onError={(e) => {
                console.error("Erro ao carregar logo:", e);
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Luvimg</span>
            <span className="text-xs text-muted-foreground">Gestão de Assistências</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === item.href}
                  onClick={() => navigate(item.href)}
                >
                  <a href={item.href}>
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold">{user?.email}</p>
            <p className="text-xs text-muted-foreground">
              Administrador
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
