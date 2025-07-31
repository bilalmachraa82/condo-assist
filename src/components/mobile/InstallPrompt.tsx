import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePWA } from '@/hooks/usePWA';

export function InstallPrompt() {
  const [dismissed, setDismissed] = useState(false);
  const { isInstallable, isInstalled, installApp } = usePWA();

  if (!isInstallable || isInstalled || dismissed) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Download className="h-5 w-5 text-primary" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">Instalar Luvimg</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Adicione à tela inicial para acesso rápido
            </p>
            
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={installApp} className="flex-1">
                Instalar
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setDismissed(true)}
                className="px-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}