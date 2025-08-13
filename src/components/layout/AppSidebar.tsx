import {
  LayoutDashboard,
  Settings,
  FileText,
  Users,
  Building,
  ShoppingCart,
  Mail,
  BarChart4,
  Logout,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useMobile } from "@/hooks/useMobile";

export function AppSidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isMobile } = useMobile();

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
    logout();
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
        {menuItems.map((item) => (
          <SidebarItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={location.pathname === item.href}
          />
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold">{user?.email}</p>
            <p className="text-xs text-muted-foreground">
              {user?.role || "Administrador"}
            </p>
          </div>
          <SidebarTrigger asChild>
            <button
              aria-label="Toggle sidebar"
              className="peer inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-secondary focus:outline-none disabled:opacity-50 data-[state=open]:bg-secondary"
            >
              {isMobile ? (
                <Logout className="h-4 w-4" onClick={handleLogout} />
              ) : null}
            </button>
          </SidebarTrigger>
          {!isMobile ? (
            <Logout className="h-4 w-4" onClick={handleLogout} />
          ) : null}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
