import { useState } from "react"
import { 
  Home,
  Wrench,
  Building2,
  Users,
  Settings,
  BarChart3,
  FileText,
  Bell,
  HelpCircle,
  Euro,
  Zap
} from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"

const menuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Assistências", url: "/assistencias", icon: Wrench },
  { title: "Workflow", url: "/workflow", icon: Zap },
  { title: "Orçamentos", url: "/orcamentos", icon: Euro },
  { title: "Edifícios", url: "/edificios", icon: Building2 },
  { title: "Fornecedores", url: "/fornecedores", icon: Users },
  { title: "Relatórios", url: "/relatorios", icon: FileText },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
]

const configItems = [
  { title: "Configurações", url: "/configuracoes", icon: Settings },
  { title: "Tipos Assistência", url: "/tipos-assistencia", icon: FileText },
  { title: "Comunicações", url: "/comunicacoes", icon: Bell },
  { title: "Notificações", url: "/notificacoes", icon: Bell },
]

export function AppSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const currentPath = location.pathname
  const isCollapsed = state === "collapsed"

  const isActive = (path: string) => currentPath === path
  const isMainExpanded = menuItems.some((i) => isActive(i.url))
  const isConfigExpanded = configItems.some((i) => isActive(i.url))

  const getNavCls = (path: string) =>
    isActive(path) 
      ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary font-medium border-r-2 border-primary" 
      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"

  return (
    <Sidebar
      collapsible="icon"
    >
      <SidebarContent className="bg-gradient-to-b from-card to-muted/30">
        <div className="p-4 border-b">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <img 
                src="/lovable-uploads/9e67bd21-c565-405a-918d-e9aac10336e8.png" 
                alt="Luvimg" 
                className="w-8 h-8 object-contain"
              />
              <div>
                <h2 className="font-semibold text-sm">Luvimg</h2>
                <p className="text-xs text-muted-foreground">Administração de Condomínios</p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="flex justify-center">
              <img 
                src="/lovable-uploads/9e67bd21-c565-405a-918d-e9aac10336e8.png" 
                alt="Luvimg" 
                className="w-8 h-8 object-contain"
              />
            </div>
          )}
        </div>

        <SidebarGroup className="px-2">
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-2">
            {!isCollapsed && "Principal"}
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-10">
                    <NavLink to={item.url} end className={getNavCls(item.url)}>
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!isCollapsed && <span className="ml-3">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="px-2">
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-2">
            {!isCollapsed && "Configuração"}
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {configItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-10">
                    <NavLink to={item.url} className={getNavCls(item.url)}>
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!isCollapsed && <span className="ml-3">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4 border-t">
          {!isCollapsed && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <HelpCircle className="h-4 w-4" />
              <span>Versão 1.0</span>
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  )
}