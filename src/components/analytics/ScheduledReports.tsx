import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Mail, Trash2, Edit, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScheduledReport {
  id: string;
  name: string;
  reportType: 'executive' | 'performance' | 'operational' | 'full';
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  isActive: boolean;
  lastSent?: string;
  nextSend: string;
}

export function ScheduledReports() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    reportType: 'executive' | 'performance' | 'operational' | 'full';
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string;
    isActive: boolean;
  }>({
    name: '',
    reportType: 'executive',
    frequency: 'monthly',
    recipients: '',
    isActive: true,
  });
  
  // Mock data - in real app, this would come from a hook
  const [reports, setReports] = useState<ScheduledReport[]>([
    {
      id: '1',
      name: 'Relatório Executivo Mensal',
      reportType: 'executive',
      frequency: 'monthly',
      recipients: ['admin@empresa.com', 'diretor@empresa.com'],
      isActive: true,
      lastSent: '2024-01-01',
      nextSend: '2024-02-01',
    },
    {
      id: '2',
      name: 'Performance Semanal Fornecedores',
      reportType: 'performance',
      frequency: 'weekly',
      recipients: ['gestao@empresa.com'],
      isActive: true,
      nextSend: '2024-01-08',
    },
  ]);

  const { toast } = useToast();

  const handleSubmit = () => {
    if (!formData.name || !formData.recipients) {
      toast({
        title: "Campos Obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const recipients = formData.recipients.split(',').map(email => email.trim());
    
    if (editingReport) {
      setReports(prev => prev.map(report => 
        report.id === editingReport.id 
          ? { 
              ...report, 
              ...formData, 
              recipients,
            }
          : report
      ));
      toast({
        title: "Relatório Atualizado",
        description: "O agendamento foi atualizado com sucesso.",
      });
    } else {
      const newReport: ScheduledReport = {
        id: Date.now().toString(),
        ...formData,
        recipients,
        nextSend: getNextSendDate(formData.frequency),
      };
      setReports(prev => [...prev, newReport]);
      toast({
        title: "Relatório Agendado",
        description: "O relatório foi agendado com sucesso.",
      });
    }

    setIsOpen(false);
    setEditingReport(null);
    setFormData({
      name: '',
      reportType: 'executive',
      frequency: 'monthly',
      recipients: '',
      isActive: true,
    });
  };

  const getNextSendDate = (frequency: string) => {
    const now = new Date();
    switch (frequency) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      case 'monthly':
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        return nextMonth.toISOString().split('T')[0];
      default:
        return now.toISOString().split('T')[0];
    }
  };

  const openEditDialog = (report: ScheduledReport) => {
    setEditingReport(report);
    setFormData({
      name: report.name,
      reportType: report.reportType,
      frequency: report.frequency,
      recipients: report.recipients.join(', '),
      isActive: report.isActive,
    });
    setIsOpen(true);
  };

  const deleteReport = (id: string) => {
    setReports(prev => prev.filter(report => report.id !== id));
    toast({
      title: "Relatório Removido",
      description: "O agendamento foi removido com sucesso.",
    });
  };

  const toggleReportStatus = (id: string) => {
    setReports(prev => prev.map(report =>
      report.id === id 
        ? { ...report, isActive: !report.isActive }
        : report
    ));
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'Diário';
      case 'weekly': return 'Semanal';
      case 'monthly': return 'Mensal';
      default: return frequency;
    }
  };

  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case 'executive': return 'Executivo';
      case 'performance': return 'Performance';
      case 'operational': return 'Operacional';
      case 'full': return 'Completo';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Relatórios Agendados</h3>
          <p className="text-sm text-muted-foreground">
            Configure envios automáticos de relatórios por email
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Agendamento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingReport ? 'Editar Agendamento' : 'Novo Agendamento'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Relatório</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Relatório Mensal de Performance"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reportType">Tipo de Relatório</Label>
                <Select 
                  value={formData.reportType} 
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, reportType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="executive">Dashboard Executivo</SelectItem>
                    <SelectItem value="performance">Performance Fornecedores</SelectItem>
                    <SelectItem value="operational">Métricas Operacionais</SelectItem>
                    <SelectItem value="full">Relatório Completo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Frequência</Label>
                <Select 
                  value={formData.frequency} 
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, frequency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diário</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipients">Destinatários (emails separados por vírgula)</Label>
                <Input
                  id="recipients"
                  value={formData.recipients}
                  onChange={(e) => setFormData(prev => ({ ...prev, recipients: e.target.value }))}
                  placeholder="email1@empresa.com, email2@empresa.com"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, isActive: checked as boolean }))
                  }
                />
                <Label htmlFor="isActive">Ativo</Label>
              </div>

              <Button onClick={handleSubmit} className="w-full">
                {editingReport ? 'Atualizar' : 'Criar'} Agendamento
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {reports.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <Calendar className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Nenhum relatório agendado</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          reports.map((report) => (
            <Card key={report.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{report.name}</CardTitle>
                    <Badge variant={report.isActive ? "default" : "secondary"}>
                      {report.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(report)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteReport(report.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  {getReportTypeLabel(report.reportType)} • {getFrequencyLabel(report.frequency)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{report.recipients.join(', ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>Próximo envio: {new Date(report.nextSend).toLocaleDateString()}</span>
                  </div>
                  {report.lastSent && (
                    <div className="text-muted-foreground">
                      Último envio: {new Date(report.lastSent).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}