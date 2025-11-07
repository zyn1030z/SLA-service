// Types for multi-system management
export interface SystemConfig {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  status: "connected" | "disconnected" | "error";
  lastSync?: Date;
  workflowsCount: number;
  violationsCount: number;
  color: string; // For UI differentiation
  icon: string; // System icon
  // API Configuration
  apiConfig: {
    workflowEndpoint: string; // e.g., "/api/v2/tcm/workflow/get_workflow_steps"
    method: "GET" | "POST" | "PUT" | "DELETE"; // HTTP method
    headers: Record<string, string>; // All headers including Content-Type, Cookie, etc.
    requestBody: Record<string, any>; // Request body data
  };
}

export interface WorkflowWithSystem {
  id: string;
  systemId: string;
  systemName: string;
  // Odoo workflow fields - matching API structure
  workflowId: number;
  workflowName: string;
  model: string;
  onCreate: boolean;
  share: boolean;
  domain: string;
  note: string;
  activityCount: number;
  activities: OdooActivity[];
  // Legacy fields for compatibility
  name: string;
  steps: number;
  violations: number;
  status: "active" | "inactive";
  lastUpdated: Date;
  odooData: {
    workflowId: number;
    workflowName: string;
    model: string;
    onCreate: boolean;
    share: boolean;
    domain: string;
    note: string;
    activities: OdooActivity[];
    activityCount: number;
  };
}

export interface OdooActivity {
  id: number;
  name: string;
  code: string;
  kind: string;
  splitMode: string;
  joinMode: string;
  flowStart: boolean;
  flowStop: boolean;
  flowCancel: boolean;
  flowDone: boolean;
  action: string;
  note: string;
  transitions: OdooTransition[];
}

export interface OdooTransition {
  id: number;
  signal: string;
  condition: string;
  sequence: number;
  targetActivityId: number;
  targetActivityName: string;
  groupRequired: boolean;
}

export interface SystemSyncResult {
  systemId: string;
  success: boolean;
  workflowsCount: number;
  error?: string;
  timestamp: Date;
}
