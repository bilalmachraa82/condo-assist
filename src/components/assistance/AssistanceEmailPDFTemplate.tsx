import React from "react";

interface Assistance {
  id: string;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  created_at: string;
  requires_quotation?: boolean | null;
  quotation_deadline?: string | null;
  assistance_number?: number;
  buildings?: {
    code: string;
    name: string;
    address?: string | null;
    nif?: string | null;
  };
  intervention_types?: {
    name: string;
    category?: string | null;
  };
  suppliers?: {
    name: string;
    email?: string | null;
    phone?: string | null;
    specialization?: string | null;
  };
}

interface AssistanceEmailPDFTemplateProps {
  assistance: Assistance;
}

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: "Pendente",
    awaiting_quotation: "Aguarda Orçamento",
    quotation_rejected: "Orçamento Rejeitado",
    accepted: "Aceite",
    scheduled: "Agendada",
    in_progress: "Em Curso",
    completed: "Concluída",
    cancelled: "Cancelada",
  };
  return labels[status] || status;
};

const getPriorityLabel = (priority: string): string => {
  const labels: Record<string, string> = {
    normal: "Normal",
    urgent: "Urgente",
    critical: "Crítica",
  };
  return labels[priority] || priority;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const AssistanceEmailPDFTemplate: React.FC<AssistanceEmailPDFTemplateProps> = ({
  assistance,
}) => {
  return (
    <div
      id="assistance-email-pdf"
      style={{
        fontFamily: "Arial, sans-serif",
        padding: "40px",
        maxWidth: "800px",
        margin: "0 auto",
        backgroundColor: "white",
        color: "#333",
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: "3px solid #2563eb",
          paddingBottom: "20px",
          marginBottom: "30px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, color: "#1e40af", fontSize: "24px" }}>
              LUVIMG - Gestão de Condomínios
            </h1>
            <p style={{ margin: "5px 0 0 0", color: "#666", fontSize: "14px" }}>
              Pedido de Assistência para Reencaminhar
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
              Gerado em: {formatDate(new Date().toISOString())}
            </p>
          </div>
        </div>
      </div>

      {/* Assistance Number & Priority Banner */}
      <div
        style={{
          backgroundColor: assistance.priority === "critical" ? "#fee2e2" : 
                          assistance.priority === "urgent" ? "#fef3c7" : "#dbeafe",
          padding: "15px 20px",
          borderRadius: "8px",
          marginBottom: "25px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <span style={{ fontSize: "14px", color: "#666" }}>Assistência Nº</span>
          <h2 style={{ margin: "5px 0 0 0", fontSize: "28px", color: "#1e40af" }}>
            {assistance.assistance_number || "N/A"}
          </h2>
        </div>
        <div style={{ textAlign: "right" }}>
          <span
            style={{
              backgroundColor: assistance.priority === "critical" ? "#dc2626" :
                              assistance.priority === "urgent" ? "#f59e0b" : "#3b82f6",
              color: "white",
              padding: "6px 16px",
              borderRadius: "20px",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            {getPriorityLabel(assistance.priority)}
          </span>
        </div>
      </div>

      {/* Title & Description */}
      <div style={{ marginBottom: "25px" }}>
        <h3 style={{ margin: "0 0 10px 0", color: "#1e40af", fontSize: "18px" }}>
          {assistance.title}
        </h3>
        {assistance.description && (
          <p style={{ margin: 0, color: "#666", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
            {assistance.description}
          </p>
        )}
      </div>

      {/* Building Information */}
      <div
        style={{
          backgroundColor: "#f8fafc",
          padding: "20px",
          borderRadius: "8px",
          marginBottom: "20px",
          border: "1px solid #e2e8f0",
        }}
      >
        <h4 style={{ margin: "0 0 15px 0", color: "#1e40af", fontSize: "16px" }}>
          📍 Informação do Edifício
        </h4>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={{ padding: "8px 0", color: "#666", width: "30%" }}>Código:</td>
              <td style={{ padding: "8px 0", fontWeight: "bold" }}>
                {assistance.buildings?.code || "N/A"}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "8px 0", color: "#666" }}>Nome:</td>
              <td style={{ padding: "8px 0", fontWeight: "bold" }}>
                {assistance.buildings?.name || "N/A"}
              </td>
            </tr>
            {assistance.buildings?.nif && (
              <tr>
                <td style={{ padding: "8px 0", color: "#666" }}>NIF:</td>
                <td style={{ padding: "8px 0" }}>{assistance.buildings.nif}</td>
              </tr>
            )}
            {assistance.buildings?.address && (
              <tr>
                <td style={{ padding: "8px 0", color: "#666" }}>Morada:</td>
                <td style={{ padding: "8px 0" }}>{assistance.buildings.address}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Intervention Type */}
      <div
        style={{
          backgroundColor: "#f8fafc",
          padding: "20px",
          borderRadius: "8px",
          marginBottom: "20px",
          border: "1px solid #e2e8f0",
        }}
      >
        <h4 style={{ margin: "0 0 15px 0", color: "#1e40af", fontSize: "16px" }}>
          🔧 Tipo de Intervenção
        </h4>
        <p style={{ margin: 0 }}>
          <strong>{assistance.intervention_types?.name || "N/A"}</strong>
          {assistance.intervention_types?.category && (
            <span style={{ color: "#666" }}> ({assistance.intervention_types.category})</span>
          )}
        </p>
      </div>

      {/* Supplier Information */}
      {assistance.suppliers && (
        <div
          style={{
            backgroundColor: "#ecfdf5",
            padding: "20px",
            borderRadius: "8px",
            marginBottom: "20px",
            border: "1px solid #a7f3d0",
          }}
        >
          <h4 style={{ margin: "0 0 15px 0", color: "#059669", fontSize: "16px" }}>
            👷 Fornecedor Atribuído
          </h4>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ padding: "8px 0", color: "#666", width: "30%" }}>Nome:</td>
                <td style={{ padding: "8px 0", fontWeight: "bold" }}>
                  {assistance.suppliers.name}
                </td>
              </tr>
              {assistance.suppliers.email && (
                <tr>
                  <td style={{ padding: "8px 0", color: "#666" }}>Email:</td>
                  <td style={{ padding: "8px 0" }}>{assistance.suppliers.email}</td>
                </tr>
              )}
              {assistance.suppliers.phone && (
                <tr>
                  <td style={{ padding: "8px 0", color: "#666" }}>Telefone:</td>
                  <td style={{ padding: "8px 0" }}>{assistance.suppliers.phone}</td>
                </tr>
              )}
              {assistance.suppliers.specialization && (
                <tr>
                  <td style={{ padding: "8px 0", color: "#666" }}>Especialização:</td>
                  <td style={{ padding: "8px 0" }}>{assistance.suppliers.specialization}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Quotation Info */}
      {assistance.requires_quotation && (
        <div
          style={{
            backgroundColor: "#fef3c7",
            padding: "20px",
            borderRadius: "8px",
            marginBottom: "20px",
            border: "1px solid #fcd34d",
          }}
        >
          <h4 style={{ margin: "0 0 10px 0", color: "#b45309", fontSize: "16px" }}>
            💰 Orçamento Requerido
          </h4>
          <p style={{ margin: 0, color: "#92400e" }}>
            Esta assistência requer orçamento antes de iniciar.
            {assistance.quotation_deadline && (
              <span>
                {" "}Prazo: <strong>{formatDate(assistance.quotation_deadline)}</strong>
              </span>
            )}
          </p>
        </div>
      )}

      {/* Status & Dates */}
      <div
        style={{
          backgroundColor: "#f8fafc",
          padding: "20px",
          borderRadius: "8px",
          marginBottom: "30px",
          border: "1px solid #e2e8f0",
        }}
      >
        <h4 style={{ margin: "0 0 15px 0", color: "#1e40af", fontSize: "16px" }}>
          📋 Estado e Datas
        </h4>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={{ padding: "8px 0", color: "#666", width: "30%" }}>Estado:</td>
              <td style={{ padding: "8px 0" }}>
                <span
                  style={{
                    backgroundColor: "#e0e7ff",
                    color: "#3730a3",
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "13px",
                  }}
                >
                  {getStatusLabel(assistance.status)}
                </span>
              </td>
            </tr>
            <tr>
              <td style={{ padding: "8px 0", color: "#666" }}>Criada em:</td>
              <td style={{ padding: "8px 0" }}>{formatDate(assistance.created_at)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Instructions */}
      <div
        style={{
          backgroundColor: "#eff6ff",
          padding: "20px",
          borderRadius: "8px",
          border: "2px dashed #3b82f6",
        }}
      >
        <h4 style={{ margin: "0 0 10px 0", color: "#1e40af", fontSize: "16px" }}>
          📧 Instruções para Reencaminhamento
        </h4>
        <ol style={{ margin: 0, paddingLeft: "20px", color: "#1e3a8a", lineHeight: "1.8" }}>
          <li>Reveja os detalhes desta assistência</li>
          <li>Reencaminhe este email para o fornecedor indicado acima</li>
          <li>O código de acesso ao portal será incluído no corpo do email original</li>
          <li>O fornecedor poderá aceder ao portal para responder/agendar</li>
        </ol>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: "40px",
          paddingTop: "20px",
          borderTop: "1px solid #e2e8f0",
          textAlign: "center",
          color: "#999",
          fontSize: "12px",
        }}
      >
        <p style={{ margin: 0 }}>
          LUVIMG - Gestão de Condomínios | arquivo@luvimg.com
        </p>
        <p style={{ margin: "5px 0 0 0" }}>
          Documento gerado automaticamente pelo sistema de gestão de assistências
        </p>
      </div>
    </div>
  );
};

export default AssistanceEmailPDFTemplate;
