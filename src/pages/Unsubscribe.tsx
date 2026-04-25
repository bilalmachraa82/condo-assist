import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-unsubscribe`;

type State =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "submitting" }
  | { kind: "done" }
  | { kind: "error"; message: string };

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<State>({ kind: token ? "ready" : "error" } as State);

  useEffect(() => {
    if (!token) {
      setState({ kind: "error", message: "Link inválido — falta o token." });
    }
  }, [token]);

  const handleConfirm = async () => {
    setState({ kind: "submitting" });
    try {
      const res = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        setState({ kind: "error", message: "Não foi possível processar o pedido." });
        return;
      }
      setState({ kind: "done" });
    } catch {
      setState({ kind: "error", message: "Erro de rede. Tente novamente." });
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Cancelar subscrição de emails</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {state.kind === "loading" && (
            <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          )}
          {state.kind === "ready" && (
            <>
              <p className="text-sm text-muted-foreground">
                Confirme que pretende deixar de receber comunicações automáticas da Luvimg neste endereço.
              </p>
              <Button onClick={handleConfirm} className="w-full">Confirmar cancelamento</Button>
            </>
          )}
          {state.kind === "submitting" && (
            <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          )}
          {state.kind === "done" && (
            <div className="space-y-2">
              <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
              <p className="font-medium">Subscrição cancelada</p>
              <p className="text-sm text-muted-foreground">
                Não receberá mais comunicações automáticas. Se foi engano, contacte{" "}
                <a className="underline" href="mailto:geral@luvimg.com">geral@luvimg.com</a>.
              </p>
            </div>
          )}
          {state.kind === "error" && (
            <div className="space-y-2">
              <XCircle className="mx-auto h-10 w-10 text-destructive" />
              <p className="text-sm text-muted-foreground">{state.message}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
