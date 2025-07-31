import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { useSwipeGestures } from '@/hooks/useSwipeGestures';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChevronLeft, ChevronRight, WifiOff } from 'lucide-react';

interface SwipeableCardProps {
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  onEdit?: () => void;
  onView?: () => void;
  children?: React.ReactNode;
}

const statusColors = {
  pending: 'bg-orange-100 text-orange-800 border-orange-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-green-100 text-green-800 border-green-200'
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-800 border-gray-200',
  normal: 'bg-blue-100 text-blue-800 border-blue-200',
  high: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  urgent: 'bg-red-100 text-red-800 border-red-200'
};

export function SwipeableCard({
  title,
  description,
  status,
  priority,
  onEdit,
  onView,
  children
}: SwipeableCardProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const { isOnline } = useOfflineStorage();
  const { vibrate } = useHapticFeedback();
  const isMobile = useIsMobile();
  
  const swipeHandlers = useSwipeGestures({
    onSwipeLeft: onEdit ? () => {
      vibrate('light');
      setIsAnimating(true);
      setTimeout(() => {
        onEdit();
        setIsAnimating(false);
      }, 150);
    } : undefined,
    onSwipeRight: onView ? () => {
      vibrate('light');
      setIsAnimating(true);
      setTimeout(() => {
        onView();
        setIsAnimating(false);
      }, 150);
    } : undefined
  }, { threshold: 60 });

  return (
    <div 
      className="relative overflow-hidden"
      {...(isMobile ? swipeHandlers : {})}
    >
      <Card className={`transition-all duration-200 hover:shadow-md touch-action-pan-y ${
        isAnimating ? 'scale-[0.98] opacity-80' : 'hover:scale-[1.02]'
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold truncate">
                {title}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {description}
              </CardDescription>
            </div>
            
            <div className="flex flex-col gap-1 items-end">
              <Badge 
                variant="outline" 
                className={`text-xs px-2 py-1 ${statusColors[status]}`}
              >
                {status === 'pending' && 'Pendente'}
                {status === 'in_progress' && 'Em Progresso'}
                {status === 'completed' && 'Concluído'}
              </Badge>
              
              <Badge 
                variant="outline" 
                className={`text-xs px-2 py-1 ${priorityColors[priority]}`}
              >
                {priority === 'low' && 'Baixa'}
                {priority === 'normal' && 'Normal'}
                {priority === 'high' && 'Alta'}
                {priority === 'urgent' && 'Urgente'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        {children && (
          <CardContent className="pt-0">
            {children}
          </CardContent>
        )}
        
        {/* Mobile swipe instructions */}
        {isMobile && (onEdit || onView) && (
          <div className="flex items-center justify-between p-4 pt-0 text-xs text-muted-foreground">
            {onEdit && (
              <div className="flex items-center gap-2">
                <ChevronLeft className="h-3 w-3" />
                <span>Deslizar para editar</span>
              </div>
            )}
            
            {onView && (
              <div className="flex items-center gap-2 ml-auto">
                <span>Ver detalhes</span>
                <ChevronRight className="h-3 w-3" />
              </div>
            )}
          </div>
        )}
        
        {/* Desktop action buttons */}
        <div className="hidden md:flex items-center gap-2 p-4 pt-0">
          {onView && (
            <Button size="sm" variant="outline" onClick={onView} className="flex-1">
              Ver Detalhes
            </Button>
          )}
          {onEdit && (
            <Button size="sm" onClick={onEdit} className="flex-1">
              Editar
            </Button>
          )}
        </div>
        
        {!isOnline && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-orange-500/10 px-2 py-1 rounded-full">
            <WifiOff className="h-3 w-3 text-orange-600" />
            <span className="text-xs text-orange-600 font-medium">Offline</span>
          </div>
        )}
      </Card>
    </div>
  );
}