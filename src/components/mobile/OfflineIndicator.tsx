import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { WifiOff, Wifi, RefreshCw, Trash2 } from 'lucide-react';

export function OfflineIndicator() {
  const { isOnline, hasCachedData, clearCache, syncPendingChanges } = useOfflineStorage();

  if (isOnline && !hasCachedData) return null;

  return (
    <div className="fixed top-16 left-4 right-4 z-40 md:left-auto md:right-4 md:max-w-sm">
      <Card className="border-l-4 border-l-orange-500">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {isOnline ? (
                <Wifi className="h-5 w-5 text-green-600" />
              ) : (
                <WifiOff className="h-5 w-5 text-orange-600" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm">
                  {isOnline ? 'Conectado' : 'Offline'}
                </h3>
                <Badge variant={isOnline ? 'default' : 'secondary'} className="text-xs">
                  {isOnline ? 'Online' : 'Sem conexão'}
                </Badge>
              </div>
              
              <p className="text-xs text-muted-foreground">
                {isOnline 
                  ? 'Dados em cache disponíveis'
                  : 'Usando dados salvos localmente'
                }
              </p>
              
              {isOnline && (
                <div className="flex gap-2 mt-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={syncPendingChanges}
                    className="h-6 text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Sync
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={clearCache}
                    className="h-6 text-xs"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Limpar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}