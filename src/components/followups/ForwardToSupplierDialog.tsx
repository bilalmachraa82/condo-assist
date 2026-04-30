import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Send, Forward } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { FollowUpWithDetails } from "@/hooks/useFollowUpSchedules";
import CreatePendencyDialog from "@/components/pendencies/CreatePendencyDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  followUp: FollowUpWithDetails | null;
}

export default function ForwardToSupplierDialog({ open, onOpenChange, followUp }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [supplierId, setSupplierId] = useState<string>("");
  const [extraNote, setExtraNote] = useState<string>("");
  const [createPendency, setCreatePendency] = useState<boolean>(false);
  const [pendencyOpen, setPendencyOpen] = useState<boolean>(false);
  const [lastSubject, setLastSubject] = useState<string>("");

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers-active-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name, email, specialization")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!followUp || !supplierId) throw new Error("missing");
      const supplier = suppliers?.find((s) => s.id === supplierId);
      if (!supplier?.email) throw new Error("Fornecedor sem email");

      const a = followUp.assistances;
      const buildingLabel = a?.buildings
        ? `${a.buildings.code ? `${a.buildings.code} - ` : ""}${a.buildings.name}`
        : "—";
      const note = (followUp.metadata as any)?.note ?? "";
      const subject = `Pedido de assistência: #${a?.assistance_number ?? ""} ${a?.title ?? ""} — ${buildingLabel}`;
      const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f4f5f7;padding:20px;color:#222;">
        <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:10px;padding:24px;">
          <h2 style="margin:0 0 12px;color:#0f172a;font-size:18px;">Pedido de assistência — ${supplier.name}</h2>
          <p style="margin:0 0 16px;color:#475569;font-size:14px;">Encaminhamos o seguinte pedido para a vossa intervenção:</p>
          ${extraNote ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px;margin-bottom:16px;color:#1e3a8a;font-size:14px;white-space:pre-wrap;">${extraNote.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!))}</div>` : ""}
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:6px 0;color:#64748b;width:140px;">Assistência</td><td style="padding:6px 0;font-weight:600;">#${a?.assistance_number ?? "—"} ${a?.title ?? ""}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;">Edifício</td><td style="padding:6px 0;">${buildingLabel}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;">Intervenção</td><td style="padding:6px 0;">${a?.intervention_types?.name ?? "—"}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;">Prioridade</td><td style="padding:6px 0;">${followUp.priority}</td></tr>
          </table>
          ${a?.description ? `<div style="margin-top:16px;padding:12px;background:#f8fafc;border-radius:8px;font-size:13px;color:#334155;white-space:pre-wrap;">${a.description.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!))}</div>` : ""}
          ${note ? `<div style="margin-top:16px;padding:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:13px;color:#451a03;"><strong>Nota interna:</strong> ${note.replace(/[&<>]/g, (c: string) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!))}</div>` : ""}
          <p style="margin-top:24px;color:#94a3b8;font-size:12px;">Email automático Luvimg · geral@luvimg.com</p>
        </div>
      </body></html>`;

      const { error } = await supabase.functions.invoke("send-email", {
        body: { to: supplier.email, subject, html, email_type: "supplier_forward" },
      });
      if (error) throw error;
      setLastSubject(subject);
      return supplier;
    },
    onSuccess: (supplier) => {
      toast({ title: "Email enviado", description: `Encaminhado para ${supplier.name} (${supplier.email}).` });
      queryClient.invalidateQueries({ queryKey: ["follow-up-schedules"] });
      onOpenChange(false);
      setSupplierId("");
      setExtraNote("");
      if (createPendency) {
        setPendencyOpen(true);
      }
    },
    onError: (e: any) => {
      toast({ title: "Erro", description: e?.message ?? "Falha ao enviar email", variant: "destructive" });
    },
  });

  if (!followUp) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Forward className="h-5 w-5" /> Encaminhar a fornecedor
          </DialogTitle>
          <DialogDescription>
            Envia o detalhe desta assistência por email a um fornecedor escolhido.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="font-medium">#{followUp.assistances?.assistance_number ?? "—"} {followUp.assistances?.title}</div>
            <div className="text-muted-foreground text-xs mt-1">
              {followUp.assistances?.buildings?.code ? `${followUp.assistances.buildings.code} - ` : ""}
              {followUp.assistances?.buildings?.name ?? "Sem edifício"}
            </div>
          </div>

          <div>
            <Label>Fornecedor</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger><SelectValue placeholder="Escolher fornecedor…" /></SelectTrigger>
              <SelectContent>
                {suppliers?.filter((s) => s.email).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} {s.specialization ? `· ${s.specialization}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Mensagem adicional (opcional)</Label>
            <Textarea
              placeholder="Ex.: agradecemos orçamento até dia X."
              value={extraNote}
              onChange={(e) => setExtraNote(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>

          <label className="flex items-start gap-2 rounded-md border p-3 bg-primary/5 cursor-pointer">
            <Checkbox
              checked={createPendency}
              onCheckedChange={(v) => setCreatePendency(!!v)}
              className="mt-0.5"
            />
            <div className="text-sm">
              <div className="font-medium">📎 Criar pendência de seguimento</div>
              <div className="text-xs text-muted-foreground">
                Após enviar, abre janela para anexares o PDF do email enviado e ficar registado em "Pendências Email".
              </div>
            </div>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => send.mutate()} disabled={!supplierId || send.isPending} className="gap-2">
            <Send className="h-4 w-4" /> {send.isPending ? "A enviar…" : "Enviar email"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <CreatePendencyDialog
        open={pendencyOpen}
        onOpenChange={setPendencyOpen}
        defaults={{
          building_id: followUp.assistances?.buildings?.id ?? "",
          assistance_id: followUp.assistance_id,
          supplier_id: supplierId || followUp.supplier_id || undefined,
          subject: lastSubject,
          title: `Email enviado: ${followUp.assistances?.title ?? ""}`,
        }}
      />
    </Dialog>
  );
}
    </Dialog>
  );
}
