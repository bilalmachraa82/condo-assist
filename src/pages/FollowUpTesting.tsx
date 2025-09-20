import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import FollowUpTester from "@/components/testing/FollowUpTester";

export default function FollowUpTesting() {
  const { user } = useAuth();

  if (!user) {
    return <ProtectedRoute><div /></ProtectedRoute>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Teste de Follow-ups</h1>
        <p className="text-muted-foreground">
          Ferramenta de desenvolvimento para testar a funcionalidade de follow-ups automatizados
        </p>
      </div>
      <FollowUpTester />
    </div>
  );
}