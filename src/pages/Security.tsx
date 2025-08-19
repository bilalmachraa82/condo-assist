
import SecurityDashboard from "@/components/security/SecurityDashboard";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function Security() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto p-6">
        <SecurityDashboard />
      </div>
    </ProtectedRoute>
  );
}
