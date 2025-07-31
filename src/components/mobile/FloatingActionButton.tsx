import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface FloatingActionButtonProps {
  onClick: () => void;
  icon?: React.ReactNode;
  className?: string;
  label?: string;
}

export function FloatingActionButton({ 
  onClick, 
  icon = <Plus className="h-6 w-6" />, 
  className,
  label = "Adicionar"
}: FloatingActionButtonProps) {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <Button
      onClick={onClick}
      variant="fab"
      size="fab"
      className={cn(
        "fixed bottom-20 right-4 z-50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95",
        className
      )}
      aria-label={label}
    >
      {icon}
    </Button>
  );
}