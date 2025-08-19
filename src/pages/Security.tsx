
import SecurityOverview from "@/components/security/SecurityOverview";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function Security() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto p-6">
        <SecurityOverview />
      </div>
    </ProtectedRoute>
  );
}
