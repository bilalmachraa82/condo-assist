import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Images, ExternalLink, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Tables } from "@/integrations/supabase/types";

interface PhotoGalleryProps {
  assistanceId: string;
}

type AssistancePhoto = Tables<"assistance_photos">;

const photoTypeLabels = {
  before: "Antes",
  during: "Durante", 
  after: "Depois",
  other: "Outro"
};

const photoTypeBadgeVariants = {
  before: "secondary" as const,
  during: "default" as const,
  after: "outline" as const,
  other: "secondary" as const
};

export default function PhotoGallery({ assistanceId }: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<AssistancePhoto | null>(null);

  const { data: photos, isLoading, refetch } = useQuery({
    queryKey: ["assistance-photos", assistanceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assistance_photos")
        .select("*")
        .eq("assistance_id", assistanceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AssistancePhoto[];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Images className="h-5 w-5" />
            Fotos da Assistência
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            A carregar fotos...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!photos || photos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Images className="h-5 w-5" />
            Fotos da Assistência
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            Nenhuma foto carregada ainda.
          </div>
        </CardContent>
      </Card>
    );
  }

  const groupedPhotos = photos.reduce((acc, photo) => {
    const type = photo.photo_type as keyof typeof photoTypeLabels;
    if (!acc[type]) acc[type] = [];
    acc[type].push(photo);
    return acc;
  }, {} as Record<string, AssistancePhoto[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Images className="h-5 w-5" />
          Fotos da Assistência ({photos.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(groupedPhotos).map(([type, typePhotos]) => (
            <div key={type} className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant={photoTypeBadgeVariants[type as keyof typeof photoTypeBadgeVariants]}>
                  {photoTypeLabels[type as keyof typeof photoTypeLabels]}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {typePhotos.length} foto{typePhotos.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {typePhotos.map((photo) => (
                  <Dialog key={photo.id}>
                    <DialogTrigger asChild>
                      <div className="group cursor-pointer">
                        <div className="relative overflow-hidden rounded-lg border bg-muted">
                          <img
                            src={photo.file_url}
                            alt={photo.caption || `Foto ${photoTypeLabels[type as keyof typeof photoTypeLabels]}`}
                            className="aspect-square object-cover transition-transform group-hover:scale-105"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <ExternalLink className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                        {photo.caption && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {photo.caption}
                          </p>
                        )}
                      </div>
                    </DialogTrigger>
                    
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Badge variant={photoTypeBadgeVariants[type as keyof typeof photoTypeBadgeVariants]}>
                            {photoTypeLabels[type as keyof typeof photoTypeLabels]}
                          </Badge>
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(photo.created_at), "dd/MM/yyyy HH:mm")}
                          </span>
                        </DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div className="relative">
                          <img
                            src={photo.file_url}
                            alt={photo.caption || `Foto ${photoTypeLabels[type as keyof typeof photoTypeLabels]}`}
                            className="w-full max-h-[70vh] object-contain rounded-lg"
                          />
                        </div>
                        
                        {photo.caption && (
                          <div className="space-y-2">
                            <h4 className="font-medium">Descrição:</h4>
                            <p className="text-muted-foreground">{photo.caption}</p>
                          </div>
                        )}
                        
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(photo.file_url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Ver Original
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}