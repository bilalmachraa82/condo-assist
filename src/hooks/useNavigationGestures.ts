import { useSwipeGestures } from './useSwipeGestures';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIsMobile } from './use-mobile';

export function useNavigationGestures() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  const navigationHistory = [
    { path: '/', title: 'Dashboard' },
    { path: '/assistencias', title: 'Assistências' },
    { path: '/orcamentos', title: 'Orçamentos' },
    { path: '/edificios', title: 'Edifícios' },
    { path: '/fornecedores', title: 'Fornecedores' },
    { path: '/relatorios', title: 'Relatórios' },
    { path: '/analytics', title: 'Analytics' },
  ];

  const currentIndex = navigationHistory.findIndex(item => item.path === location.pathname);
  
  const swipeHandlers = useSwipeGestures({
    onSwipeRight: () => {
      if (!isMobile || currentIndex <= 0) return;
      
      // Navigate to previous page in history
      const previousPage = navigationHistory[currentIndex - 1];
      if (previousPage) {
        navigate(previousPage.path);
      }
    },
    onSwipeLeft: () => {
      if (!isMobile || currentIndex >= navigationHistory.length - 1) return;
      
      // Navigate to next page in history
      const nextPage = navigationHistory[currentIndex + 1];
      if (nextPage) {
        navigate(nextPage.path);
      }
    }
  }, { threshold: 100 });

  return {
    ...swipeHandlers,
    canSwipeBack: isMobile && currentIndex > 0,
    canSwipeForward: isMobile && currentIndex < navigationHistory.length - 1,
    currentPage: navigationHistory[currentIndex]?.title || 'Página',
    isNavigationEnabled: isMobile
  };
}