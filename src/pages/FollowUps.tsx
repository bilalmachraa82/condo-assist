
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import FollowUpDashboard from "@/components/followups/FollowUpDashboard";

export default function FollowUps() {
  const { user } = useAuth();

  if (!user) {
    return <ProtectedRoute><div /></ProtectedRoute>;
  }

  return (
    <div className="container mx-auto p-6">
      <FollowUpDashboard />
    </div>
  );
}
