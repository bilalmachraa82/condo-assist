import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  title: string;
  path: string;
}

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/assistencias': 'Assistências',
  '/orcamentos': 'Orçamentos',
  '/edificios': 'Edifícios',
  '/fornecedores': 'Fornecedores',
  '/analytics': 'Análise e Relatórios',
  '/configuracoes': 'Configurações',
  '/comunicacoes': 'Comunicações',
  '/tipos-assistencia': 'Tipos de Assistência',
  '/follow-ups': 'Follow-ups',
  '/follow-ups/configuracao': 'Tempos Follow-up',
  '/pendencias-email': 'Pendências Email',
  '/follow-up-testing': 'Teste Follow-ups',
  '/email-testing': 'Teste Email',
  '/knowledge': 'Base de Conhecimento',
  '/assembly': 'Seguimento Actas',
  '/inspecoes': 'Inspeções',
  '/seguros': 'Seguros',
  '/seguranca': 'Segurança',
};

export function MobileBreadcrumbs() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  const currentTitle = pageTitles[location.pathname] || 'Página';
  const canGoBack = window.history.length > 1;

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-background/95 backdrop-blur border-b">
      <div className="flex items-center gap-2">
        {canGoBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        <h1 className="font-semibold text-foreground truncate">
          {currentTitle}
        </h1>
      </div>
      
      <div className="text-xs text-muted-foreground">
        {location.pathname}
      </div>
    </div>
  );
}