import {
  Home,
  Wrench,
  Building2,
  Users,
  Settings,
  BarChart3,
  FileText,
  Bell,
  Clock,
  HelpCircle,
  Euro,
  TestTube,
  BookOpen,
  ClipboardList,
  ShieldCheck,
  ShieldAlert,
  MailQuestion,
  Mail,
  Lock,
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
  useSidebar,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { useFollowUpStats } from "@/hooks/useFollowUpSchedules"
import { usePendencyRemindersStats } from "@/hooks/usePendencyReminders"
import { useIsAdmin } from "@/hooks/useIsAdmin"

type NavItem = {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

const principalItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Análise e Relatórios", url: "/analytics", icon: BarChart3 },
]

const operacoesItems: NavItem[] = [
  { title: "Assistências", url: "/assistencias", icon: Wrench },
  { title: "Orçamentos", url: "/orcamentos", icon: Euro },
  { title: "Follow-ups", url: "/follow-ups", icon: Bell },
  { title: "Pendências Email", url: "/pendencias-email", icon: MailQuestion },
  { title: "Comunicações", url: "/comunicacoes", icon: Mail },
]

const catalogoItems: NavItem[] = [
  { title: "Edifícios", url: "/edificios", icon: Building2 },
  { title: "Fornecedores", url: "/fornecedores", icon: Users },
  { title: "Seguimento Actas", url: "/assembly", icon: ClipboardList },
  { title: "Inspeções", url: "/inspecoes", icon: ShieldCheck },
  { title: "Seguros", url: "/seguros", icon: ShieldAlert },
  { title: "Base de Conhecimento", url: "/knowledge", icon: BookOpen },
]

const configItems: NavItem[] = [
  { title: "Configurações", url: "/configuracoes", icon: Settings },
  { title: "Tempos Follow-up", url: "/follow-ups/configuracao", icon: Clock },
  { title: "Tipos Assistência", url: "/tipos-assistencia", icon: FileText },
  { title: "Segurança", url: "/seguranca", icon: Lock, adminOnly: true },
]

const devItems: NavItem[] = [
  { title: "Teste Follow-ups", url: "/follow-up-testing", icon: TestTube, adminOnly: true },
  { title: "Teste Email", url: "/email-testing", icon: TestTube, adminOnly: true },
]

export function AppSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const currentPath = location.pathname
  const isCollapsed = state === "collapsed"

  const { data: followUpStats } = useFollowUpStats()
  const { data: pendencyStats } = usePendencyRemindersStats()
  const followUpDueCount = (followUpStats?.due_now ?? 0) + (pendencyStats?.due_now ?? 0)
  const { data: isAdmin } = useIsAdmin()

  const isActive = (path: string) => currentPath === path

  const getNavCls = (path: string) =>
    isActive(path)
      ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary font-medium border-r-2 border-primary"
      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"

  const filterByRole = (items: NavItem[]) =>
    items.filter((i) => !i.adminOnly || isAdmin)

  const renderGroup = (label: string, items: NavItem[]) => {
    const visible = filterByRole(items)
    if (visible.length === 0) return null
    return (
      <SidebarGroup className="px-2" key={label}>
        <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-2">
          {!isCollapsed && label}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {visible.map((item) => {
              const showBadge =
                item.url === "/follow-ups" && !isCollapsed && followUpDueCount > 0
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-10">
                    <NavLink to={item.url} end={item.url === "/"} className={getNavCls(item.url)}>
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!isCollapsed && (
                        <span className="ml-3 flex-1">{item.title}</span>
                      )}
                      {showBadge && (
                        <Badge
                          variant="destructive"
                          className="ml-auto h-5 px-1.5 text-[10px]"
                        >
                          {followUpDueCount}
                        </Badge>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="bg-gradient-to-b from-card to-muted/30">
        <div className="p-4 border-b">
          {!isCollapsed ? (
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
          ) : (
            <div className="flex justify-center">
              <img
                src="/lovable-uploads/9e67bd21-c565-405a-918d-e9aac10336e8.png"
                alt="Luvimg"
                className="w-8 h-8 object-contain"
              />
            </div>
          )}
        </div>

        {renderGroup("Principal", principalItems)}
        {renderGroup("Operações", operacoesItems)}
        {renderGroup("Catálogo", catalogoItems)}
        {renderGroup("Configuração", configItems)}
        {isAdmin && renderGroup("Desenvolvimento", devItems)}

        <div className="mt-auto p-4 border-t">
          {!isCollapsed && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <HelpCircle className="h-4 w-4" />
              <span>Versão 2.0</span>
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  )
}
