const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error) {
      console.error("💥 API request failed:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  // Workflow API methods
  async getWorkflows() {
    return this.request<any[]>("/api/workflows");
  }

  async getWorkflow(id: string) {
    return this.request<any>(`/workflows/${id}`);
  }

  async getWorkflowsBySystem(systemId: string) {
    return this.request<any[]>(`/workflows/system/${systemId}`);
  }

  async createWorkflow(workflow: any) {
    return this.request<any>("/workflows", {
      method: "POST",
      body: JSON.stringify(workflow),
    });
  }

  async updateWorkflow(id: string, workflow: any) {
    return this.request<any>(`/workflows/${id}`, {
      method: "PUT",
      body: JSON.stringify(workflow),
    });
  }

  async deleteWorkflow(id: string) {
    return this.request<{ success: boolean }>(`/workflows/${id}`, {
      method: "DELETE",
    });
  }

  async syncWorkflows(systemId: string, workflows: any[]) {
    return this.request<any>(`/api/workflows/sync/${systemId}`, {
      method: "POST",
      body: JSON.stringify({ workflows }),
    });
  }

  // System API methods
  async getSystems() {
    return this.request<any[]>("/api/systems");
  }

  async getSystem(id: string) {
    return this.request<any>(`/systems/${id}`);
  }

  async createSystem(system: any) {
    return this.request<any>("/api/systems", {
      method: "POST",
      body: JSON.stringify(system),
    });
  }

  async updateSystem(id: string, system: any) {
    return this.request<any>(`/api/systems/${id}`, {
      method: "PUT",
      body: JSON.stringify(system),
    });
  }

  async deleteSystem(id: string) {
    return this.request<{ success: boolean }>(`/systems/${id}`, {
      method: "DELETE",
    });
  }
}

export const apiClient = new ApiClient();
