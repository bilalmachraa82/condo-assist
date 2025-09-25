
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SecurityDashboard from "./SecurityDashboard";
import SecuritySettings from "./SecuritySettings";
import SecurityAudit from "./SecurityAudit";  
import SecurityAlerts from "./SecurityAlerts";
import { Shield, Settings, FileText } from "lucide-react";

export default function SecurityOverview() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Centro de Segurança</h1>
      </div>
      
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Painel
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Definições
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Auditoria
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SecurityDashboard />
            <SecurityAlerts />
          </div>
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-6">
          <SecuritySettings />
        </TabsContent>
        
        <TabsContent value="audit" className="space-y-6">
          <SecurityAudit />
        </TabsContent>
      </Tabs>
    </div>
  );
}
