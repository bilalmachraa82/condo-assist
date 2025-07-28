import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock } from "lucide-react";

interface ScheduleFormProps {
  onSubmit: (data: {
    scheduledStartDate: string;
    scheduledEndDate?: string;
    estimatedDurationHours?: number;
    responseComments?: string;
  }) => void;
  isLoading: boolean;
}

export default function ScheduleForm({ onSubmit, isLoading }: ScheduleFormProps) {
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [duration, setDuration] = useState<number | string>("");
  const [comments, setComments] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!startDate || !startTime) {
      alert("Por favor, defina pelo menos a data e hora de início.");
      return;
    }

    const scheduledStartDate = `${startDate}T${startTime}:00`;
    const scheduledEndDate = endDate && endTime ? `${endDate}T${endTime}:00` : undefined;

    onSubmit({
      scheduledStartDate,
      scheduledEndDate,
      estimatedDurationHours: duration ? Number(duration) : undefined,
      responseComments: comments || undefined
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Agendar Assistência
        </CardTitle>
        <CardDescription>
          Defina quando pretende realizar esta assistência
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-date">Data de Início *</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div>
              <Label htmlFor="start-time">Hora de Início *</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="end-date">Data de Fim (opcional)</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <Label htmlFor="end-time">Hora de Fim (opcional)</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={!endDate}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="duration" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Duração Estimada (horas)
            </Label>
            <Input
              id="duration"
              type="number"
              min="0.5"
              step="0.5"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Ex: 2.5"
            />
          </div>

          <div>
            <Label htmlFor="comments">Comentários Adicionais</Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Informações adicionais sobre o agendamento, materiais necessários, etc."
              rows={3}
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "A agendar..." : "Aceitar e Agendar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}