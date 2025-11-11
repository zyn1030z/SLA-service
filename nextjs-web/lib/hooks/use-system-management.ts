"use client";
import { useState, useEffect } from "react";
import {
  SystemConfig,
  WorkflowWithSystem,
  SystemSyncResult,
} from "@/lib/types/system";
import { apiClient } from "@/lib/api/client";

export function useSystemManagement() {
  const [systems, setSystems] = useState<SystemConfig[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowWithSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingSystems, setSyncingSystems] = useState<Set<string>>(new Set());
  const [fetchingWorkflows, setFetchingWorkflows] = useState<Set<string>>(
    new Set()
  );

  // Define functions first
  const loadSystems = async () => {
    try {
      const response = await apiClient.getSystems();

      // Hỗ trợ cả 2 cấu trúc: response.data là array hoặc response.data.data là array
      const systemsArray = Array.isArray(response.data)
        ? response.data
        : (response.data as any)?.data &&
          Array.isArray((response.data as any).data)
        ? (response.data as any).data
        : null;

      if (response.success && systemsArray) {
        // Map systemName to name for frontend compatibility
        const mappedSystems = systemsArray.map((system: any) => ({
          ...system,
          name: system.systemName,
          // Ensure all required fields are present
          status: system.status || "disconnected",
          workflowsCount: system.workflowsCount || 0,
          violationsCount: system.violationsCount || 0,
          lastSync: system.lastSync || null,
          // Map apiConfig để đảm bảo có đầy đủ config
          apiConfig: system.apiConfig || {
            workflowEndpoint: system.workflowEndpoint || "",
            method: system.apiMethod || "POST",
            headers: system.apiHeaders || {},
            requestBody: system.apiRequestBody || {},
          },
        }));

        setSystems(mappedSystems);
      } else {
        console.warn("❌ API call failed or returned no data");
        setSystems([]);
      }
    } catch (error) {
      console.error("💥 Failed to load systems:", error);
      setSystems([]);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkflows = async () => {
    try {
      console.log("🔄 Loading workflows from API...");
      const response = await apiClient.getWorkflows();
      console.log("📦 Workflows response:", response);

      // Hỗ trợ cả 2 cấu trúc: response.data là array hoặc response.data.data là array
      const workflowsArray = Array.isArray(response.data)
        ? response.data
        : (response.data as any)?.data &&
          Array.isArray((response.data as any).data)
        ? (response.data as any).data
        : null;

      if (response.success && workflowsArray) {
        console.log(`✅ Found ${workflowsArray.length} workflows`);
        setWorkflows(workflowsArray);
      } else {
        console.warn("⚠️ No workflows found or invalid response format");
        console.log("Response structure:", {
          success: response.success,
          hasData: !!response.data,
          isArray: Array.isArray(response.data),
          workflowsArray: workflowsArray,
        });
        setWorkflows([]);
      }
    } catch (error) {
      console.error("💥 Failed to load workflows:", error);
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load data when component mounts
    // debugger;
    try {
      loadSystems();
    } catch (error) {
      console.error("💥 Error calling loadSystems:", error);
    }
    try {
      loadWorkflows();
    } catch (error) {
      console.error("💥 Error calling loadWorkflows:", error);
    }
  }, []);

  const addWorkflow = async (
    workflow: Omit<WorkflowWithSystem, "id" | "lastUpdated">
  ) => {
    try {
      const response = await apiClient.createWorkflow(workflow);
      if (response.success && response.data) {
        const newWorkflow = response.data;
        setWorkflows((prev) => [...prev, newWorkflow]);

        // Update system counters
        const violationsDelta = newWorkflow.violations || 0;
        const current = systems.find((s) => s.id === newWorkflow.systemId);
        if (current) {
          updateSystem(newWorkflow.systemId, {
            workflowsCount: (current.workflowsCount || 0) + 1,
            violationsCount: (current.violationsCount || 0) + violationsDelta,
          });
        }

        return newWorkflow;
      }
      throw new Error(response.error || "Failed to create workflow");
    } catch (error) {
      console.error("Failed to add workflow:", error);
      throw error;
    }
  };

  const addSystem = async (
    system: Omit<
      SystemConfig,
      "id" | "status" | "workflowsCount" | "violationsCount"
    >
  ) => {
    try {
      // Call backend API to create system
      const response = await fetch("http://localhost:3000/systems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemName: system.name,
          description: system.description,
          baseUrl: system.baseUrl,
          apiKey: system.apiKey,
          enabled: system.enabled,
          color: system.color,
          icon: system.icon,
          apiConfig: system.apiConfig || {
            workflowEndpoint: "",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            requestBody: {},
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create system: ${response.status}`);
      }

      const createdSystem = await response.json();

      // Update local state with the created system
      const newSystem: SystemConfig = {
        ...system,
        id: createdSystem.id || `system-${Date.now()}`,
        status: "disconnected",
        workflowsCount: 0,
        violationsCount: 0,
        apiConfig: system.apiConfig || {
          workflowEndpoint: "",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          requestBody: {},
        },
      };

      const updatedSystems = [...systems, newSystem];
      setSystems(updatedSystems);
      localStorage.setItem("slaSystems", JSON.stringify(updatedSystems));
    } catch (error) {
      console.error("Error creating system:", error);
      // Fallback to local creation if API fails
      const newSystem: SystemConfig = {
        ...system,
        id: `system-${Date.now()}`,
        status: "disconnected",
        workflowsCount: 0,
        violationsCount: 0,
        apiConfig: system.apiConfig || {
          workflowEndpoint: "",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          requestBody: {},
        },
      };
      const updatedSystems = [...systems, newSystem];
      setSystems(updatedSystems);
      localStorage.setItem("slaSystems", JSON.stringify(updatedSystems));
    }
  };

  const updateSystem = async (
    systemId: string,
    updates: Partial<SystemConfig>
  ) => {
    try {
      // Call API to update system in database via apiClient
      const response = await apiClient.updateSystem(systemId, updates);
      console.log("🔄 updateSystem response:", response);

      if (response.success && response.data) {
        // Update local state only after successful API call
        const updatedSystems = systems.map((system) =>
          system.id === systemId ? { ...system, ...updates } : system
        );
        setSystems(updatedSystems);
        localStorage.setItem("slaSystems", JSON.stringify(updatedSystems));

        // Reload systems from database to ensure data consistency
        await loadSystems();

        // Reload workflows to update systemName in workflow data
        await loadWorkflows();
      } else {
        console.error("Failed to update system:", response.error);
        alert("Lỗi khi lưu dữ liệu hệ thống. Vui lòng thử lại.");
      }
    } catch (error) {
      console.error("Error updating system:", error);
      alert("Lỗi khi lưu dữ liệu hệ thống. Vui lòng thử lại.");
    }
  };

  const deleteSystem = async (systemId: string) => {
    try {
      // Call backend API to delete system
      const response = await fetch(
        `http://localhost:3000/systems/${systemId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        console.warn("Failed to delete system from backend:", response.status);
        // Continue with local deletion even if backend fails
      }

      // Update local state
      const updatedSystems = systems.filter((system) => system.id !== systemId);
      const updatedWorkflows = workflows.filter(
        (workflow) => workflow.systemId !== systemId
      );
      setSystems(updatedSystems);
      setWorkflows(updatedWorkflows);
      localStorage.setItem("slaSystems", JSON.stringify(updatedSystems));
      localStorage.setItem("slaWorkflows", JSON.stringify(updatedWorkflows));
    } catch (error) {
      console.error("Error deleting system:", error);
      // Fallback to local deletion if API fails
      const updatedSystems = systems.filter((system) => system.id !== systemId);
      const updatedWorkflows = workflows.filter(
        (workflow) => workflow.systemId !== systemId
      );
      setSystems(updatedSystems);
      setWorkflows(updatedWorkflows);
      localStorage.setItem("slaSystems", JSON.stringify(updatedSystems));
      localStorage.setItem("slaWorkflows", JSON.stringify(updatedWorkflows));
    }
  };

  const syncSystem = async (systemId: string): Promise<SystemSyncResult> => {
    const system = systems.find((s) => s.id === systemId);
    console.log("🔄 system:", system);
    if (!system || !system.enabled) {
      return {
        systemId,
        success: false,
        workflowsCount: 0,
        error: "System not enabled or not found",
        timestamp: new Date(),
      };
    }

    setSyncingSystems((prev) => new Set(prev).add(systemId));

    try {
      // Thử gọi API thực tế từ Odoo với timeout và error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      let response;
      try {
        // Sử dụng API config từ system thay vì hardcode
        const apiUrl = `${system.baseUrl}${system.apiConfig.workflowEndpoint}`;
        console.log("🔄 apiUrl:", apiUrl);
        console.log("🔄 system.apiConfig.method:", system.apiConfig.method);
        console.log("🔄 system.apiConfig.headers:", system.apiConfig.headers);
        console.log(
          "🔄 system.apiConfig.requestBody:",
          system.apiConfig.requestBody
        );

        response = await fetch(apiUrl, {
          method: system.apiConfig.method,
          headers: system.apiConfig.headers,
          body:
            system.apiConfig.method !== "GET"
              ? JSON.stringify(system.apiConfig.requestBody)
              : undefined,
          signal: controller.signal,
        });
      } catch (fetchError: any) {
        // Nếu gặp lỗi, thử lại với timeout ngắn hơn
        console.warn(
          "First attempt failed, retrying with shorter timeout:",
          fetchError.message
        );

        // Thử lại với timeout ngắn hơn
        const retryController = new AbortController();
        const retryTimeoutId = setTimeout(() => retryController.abort(), 5000);

        try {
          const retryApiUrl = `${system.baseUrl}${system.apiConfig.workflowEndpoint}`;
          response = await fetch(retryApiUrl, {
            method: system.apiConfig.method,
            headers: system.apiConfig.headers,
            body:
              system.apiConfig.method !== "GET"
                ? JSON.stringify(system.apiConfig.requestBody)
                : undefined,
            signal: retryController.signal,
          });
          clearTimeout(retryTimeoutId);
        } catch (retryError: any) {
          clearTimeout(retryTimeoutId);
          console.error(
            "Retry also failed, using mock data:",
            retryError.message
          );
          throw new Error(`API_ERROR: ${retryError.message}`);
        }
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `API Error: ${response.status} - ${response.statusText}`
        );
      }

      const data = await response.json();

      // Xử lý dữ liệu thật từ Odoo API
      const odooWorkflows = data.result?.data?.workflows || [];

      if (odooWorkflows.length === 0) {
        console.warn("❌ No workflows found in API response");
        throw new Error("NO_WORKFLOWS: API trả về không có workflows");
      }

      const systemWorkflows: WorkflowWithSystem[] = odooWorkflows.map(
        (workflow: any, index: number) => {
          // Create workflow object
          const workflowData = {
            id: workflow.workflow_id,
            name: workflow.workflow_name,
            model: workflow.model,
            activities: workflow.activities?.length || 0,
          };

          return {
            id: crypto.randomUUID(),
            systemId: system.id,
            systemName: system.name || "Unknown System",
            // Odoo workflow fields - matching API structure
            workflowId: workflow.workflow_id,
            workflowName: workflow.workflow_name || "Unknown Workflow",
            model: workflow.model || "unknown.model",
            onCreate: workflow.on_create || false,
            share: workflow.share || false,
            domain: workflow.domain || "[]",
            note: workflow.note || "",
            activityCount: workflow.activity_count || 0,
            activities: workflow.activities || [],
            // Legacy fields for compatibility
            name: workflow.workflow_name || "Unknown Workflow",
            steps: workflow.activity_count || 0,
            violations: 0,
            status: workflow.on_create ? "active" : "inactive",
            lastUpdated: new Date(),
            // Lưu thêm dữ liệu chi tiết từ Odoo với cấu trúc mới
            odooData: {
              workflowId: workflow.workflow_id,
              workflowName: workflow.workflow_name,
              model: workflow.model,
              onCreate: workflow.on_create || false,
              share: workflow.share || false,
              domain: workflow.domain || "[]",
              note: workflow.note || "",
              activities: (workflow.activities || []).map((activity: any) => ({
                id: activity.id,
                name: activity.name,
                code: activity.code,
                kind: activity.kind,
                splitMode: activity.split_mode,
                joinMode: activity.join_mode,
                flowStart: activity.flow_start,
                flowStop: activity.flow_stop,
                flowCancel: activity.flow_cancel,
                flowDone: activity.flow_done,
                action: activity.action,
                note: activity.note,
                transitions: (activity.transitions || []).map(
                  (transition: any) => ({
                    id: transition.id,
                    signal: transition.signal,
                    condition: transition.condition,
                    sequence: transition.sequence,
                    targetActivityId: transition.target_activity_id,
                    targetActivityName: transition.target_activity_name,
                    groupRequired: transition.group_required,
                  })
                ),
              })),
              activityCount: workflow.activity_count || 0,
            },
          };
        }
      );
      console.log("systemWorkflows:", systemWorkflows);

      // BREAKPOINT 6: Trước khi gọi NestJS API để sync workflows
      debugger;
      // Update workflows for this system using API
      const syncResponse = await apiClient.syncWorkflows(
        systemId,
        systemWorkflows
      );
      // BREAKPOINT 7: Sau khi nhận response từ NestJS
      debugger;

      if (syncResponse.success && syncResponse.data) {
        const updatedWorkflows = workflows.filter(
          (w) => w.systemId !== systemId
        );
        updatedWorkflows.push(...systemWorkflows);
        setWorkflows(updatedWorkflows);
      } else {
        // Fallback to local update if API fails
        const updatedWorkflows = workflows.filter(
          (w) => w.systemId !== systemId
        );
        updatedWorkflows.push(...systemWorkflows);
        setWorkflows(updatedWorkflows);
      }

      // Update system status
      updateSystem(systemId, {
        status: "connected",
        lastSync: new Date(),
        workflowsCount: systemWorkflows.length,
        violationsCount: systemWorkflows.reduce(
          (sum, wf) => sum + wf.violations,
          0
        ),
      });

      return {
        systemId,
        success: true,
        workflowsCount: systemWorkflows.length,
        timestamp: new Date(),
      };
    } catch (error: any) {
      console.error(`Error syncing system ${system.name}:`, error);

      // Fallback: Chỉ sử dụng mock data khi API thực sự thất bại
      const isApiError = error.message?.includes("API_ERROR");
      const isNoWorkflows = error.message?.includes("NO_WORKFLOWS");

      console.warn(
        `No workflows found for system ${system.name}. Reason: ${error.message}`
      );

      // No mock data - return empty result
      return {
        systemId,
        success: true,
        workflowsCount: 0,
        timestamp: new Date(),
      };
    } finally {
      setSyncingSystems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(systemId);
        return newSet;
      });
    }
  };

  const testSystemConnection = async (systemId: string): Promise<boolean> => {
    // Tìm system trong danh sách hiện tại
    let system = systems.find((s) => s.id === systemId);
    console.log("systems testSystemConnection:", systems);
    console.log("systemId cần test:", systemId);
    console.log("system testSystemConnection (before):", system);

    // Nếu không tìm thấy trong systems, fetch trực tiếp từ API
    if (!system) {
      console.log("⚠️ System not found in local state, fetching from API...");
      try {
        const response = await apiClient.getSystems();
        console.log("response testSystemConnection1:", response.data);
        // debugger;
        // Hỗ trợ cả 2 cấu trúc: response.data là array hoặc response.data.data là array
        const systemsArray = Array.isArray(response.data)
          ? response.data
          : (response.data as any)?.data &&
            Array.isArray((response.data as any).data)
          ? (response.data as any).data
          : null;

        if (response.success && systemsArray) {
          // Map systems giống như trong loadSystems
          const allSystems = systemsArray.map((s: any) => ({
            ...s,
            name: s.systemName,
            status: s.status || "disconnected",
            workflowsCount: s.workflowsCount || 0,
            violationsCount: s.violationsCount || 0,
            lastSync: s.lastSync || null,
            // Giữ nguyên các field khác từ API
            baseUrl: s.baseUrl,
            apiKey: s.apiKey,
            enabled: s.enabled,
            color: s.color,
            icon: s.icon,
            workflowEndpoint: s.workflowEndpoint,
            apiMethod: s.apiMethod,
            apiHeaders: s.apiHeaders,
            apiRequestBody: s.apiRequestBody,
            // Map apiConfig nếu có
            apiConfig: s.apiConfig || {
              workflowEndpoint: s.workflowEndpoint || "",
              method: s.apiMethod || "POST",
              headers: s.apiHeaders || {},
              requestBody: s.apiRequestBody || {},
            },
          }));

          // Tìm system từ kết quả API
          console.log("allSystems testSystemConnection:", allSystems);
          system = allSystems.find((s: any) => s.id === systemId);
          console.log("system testSystemConnection (from API):", system);

          // Cập nhật state để lần sau không cần fetch lại
          if (system && allSystems.length > 0) {
            setSystems(allSystems);
          }
        }
      } catch (error) {
        console.error("Failed to fetch system from API:", error);
      }
    }

    if (!system) {
      console.error("❌ System not found with ID:", systemId);
      return false;
    }
    // debugger;

    try {
      // Test kết nối với Odoo API qua proxy
      // Lý do dùng proxy:
      // 1. Tránh CORS - Browser chặn request cross-origin từ frontend
      // 2. Bảo mật - Không expose token/credentials trong frontend code
      // 3. Xử lý tập trung - Error handling, logging, mock data fallback
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      // Sử dụng config từ system thay vì hardcode
      const apiUrl = `${system.baseUrl}${
        system.apiConfig?.workflowEndpoint ||
        "/api/v2/tcm/workflow/get_workflow_steps"
      }`;
      console.log("🔄 apiUrl:", apiUrl);

      const response = await fetch("/api/proxy-odoo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Truyền config từ system để proxy route sử dụng
          systemId: system.id,
          baseUrl: system.baseUrl,
          apiUrl: apiUrl,
          method: system.apiConfig?.method || "POST",
          headers: system.apiConfig?.headers || {},
          requestBody: system.apiConfig?.requestBody || {
            access_token: system.apiKey || "",
            model: "purchase.request",
            res_id: 123,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log("response testSystemConnection2:", response);

      const isConnected = response.ok;
      await updateSystem(systemId, {
        status: isConnected ? "connected" : "error",
      });

      return isConnected;
    } catch (error) {
      console.error(`Connection test failed for ${system.name}:`, error);
      updateSystem(systemId, {
        status: "error",
      });
      return false;
    }
  };

  const getWorkflowsBySystem = (systemId: string) => {
    // Trả về dữ liệu hiện có ngay lập tức để không phá vỡ UI hiện tại
    const existing = workflows.filter(
      (workflow) => workflow.systemId === systemId
    );

    // Tránh gọi liên tục: chỉ fetch nếu chưa đang fetch system này
    if (fetchingWorkflows.has(systemId)) {
      return existing;
    }

    // Đánh dấu đang fetch
    setFetchingWorkflows((prev) => new Set(prev).add(systemId));

    // Đồng thời kích hoạt fetch + sync ở nền để cập nhật dữ liệu và lưu DB
    (async () => {
      try {
        // Tìm system theo id
        let system = systems.find((s) => s.id === systemId);
        if (!system) {
          const response = await apiClient.getSystems();
          // Hỗ trợ cả 2 cấu trúc: response.data là array hoặc response.data.data là array
          const systemsArray = Array.isArray(response.data)
            ? response.data
            : (response.data as any)?.data &&
              Array.isArray((response.data as any).data)
            ? (response.data as any).data
            : null;

          if (response.success && systemsArray) {
            const allSystems = systemsArray.map((s: any) => ({
              ...s,
              name: s.systemName,
              status: s.status || "disconnected",
              workflowsCount: s.workflowsCount || 0,
              violationsCount: s.violationsCount || 0,
              lastSync: s.lastSync || null,
              apiConfig: s.apiConfig || {
                workflowEndpoint: s.workflowEndpoint || "",
                method: s.apiMethod || "POST",
                headers: s.apiHeaders || {},
                requestBody: s.apiRequestBody || {},
              },
            }));
            system = allSystems.find((s: any) => s.id === systemId);
            if (allSystems.length > 0) setSystems(allSystems);
          }
        }

        if (!system || !system.enabled) return; // Không fetch nếu không có hoặc không bật

        // Gọi Odoo qua proxy như testSystemConnection
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const apiUrl = `${system.baseUrl}${
          system.apiConfig?.workflowEndpoint ||
          "/api/v2/tcm/workflow/get_workflow_steps"
        }`;

        const proxyRes = await fetch("/api/proxy-odoo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemId: system.id,
            baseUrl: system.baseUrl,
            apiUrl,
            method: system.apiConfig?.method || "POST",
            headers: system.apiConfig?.headers || {},
            requestBody: system.apiConfig?.requestBody || {
              access_token: system.apiKey || "",
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        if (!proxyRes.ok) return;

        const data = await proxyRes.json().catch(() => null);
        const odooWorkflows =
          data?.result?.data?.workflows || data?.workflows || [];
        if (!Array.isArray(odooWorkflows) || odooWorkflows.length === 0) return;

        // Map sang WorkflowWithSystem (giống logic sync trong hook)
        const mapped: WorkflowWithSystem[] = odooWorkflows.map(
          (workflow: any) => ({
            id: crypto.randomUUID(),
            systemId: system!.id,
            systemName:
              system!.name || (system as any).systemName || "Unknown System",
            workflowId: workflow.workflow_id,
            workflowName: workflow.workflow_name || "Unknown Workflow",
            model: workflow.model || "unknown.model",
            onCreate: workflow.on_create || false,
            share: workflow.share || false,
            domain: workflow.domain || "[]",
            note: workflow.note || "",
            activityCount: workflow.activity_count || 0,
            activities: workflow.activities || [],
            name: workflow.workflow_name || "Unknown Workflow",
            steps: workflow.activity_count || 0,
            violations: 0,
            status: workflow.on_create ? "active" : "inactive",
            lastUpdated: new Date(),
            odooData: {
              workflowId: workflow.workflow_id,
              workflowName: workflow.workflow_name,
              model: workflow.model,
              onCreate: workflow.on_create || false,
              share: workflow.share || false,
              domain: workflow.domain || "[]",
              note: workflow.note || "",
              activities: (workflow.activities || []).map((activity: any) => ({
                id: activity.id,
                name: activity.name,
                code: activity.code,
                kind: activity.kind,
                splitMode: activity.split_mode,
                joinMode: activity.join_mode,
                flowStart: activity.flow_start,
                flowStop: activity.flow_stop,
                flowCancel: activity.flow_cancel,
                flowDone: activity.flow_done,
                action: activity.action,
                note: activity.note,
                transitions: (activity.transitions || []).map(
                  (transition: any) => ({
                    id: transition.id,
                    signal: transition.signal,
                    condition: transition.condition,
                    sequence: transition.sequence,
                    targetActivityId: transition.target_activity_id,
                    targetActivityName: transition.target_activity_name,
                    groupRequired: transition.group_required,
                  })
                ),
              })),
              activityCount: workflow.activity_count || 0,
            },
          })
        );

        // Lưu xuống DB qua API backend
        try {
          console.log("🔄 syncingWorkflows", mapped);
          const syncResponse = await apiClient.syncWorkflows(systemId, mapped);
          if (!syncResponse.success) {
            console.warn("Sync to backend failed, updating state only");
          } else {
            // Cập nhật trạng thái system thành "connected" nếu chưa kết nối
            const currentSystem = systems.find((s) => s.id === systemId);
            if (currentSystem && currentSystem.status !== "connected") {
              console.log(
                `🔄 Updating system ${systemId} status from "${currentSystem.status}" to "connected"`
              );
              await updateSystem(systemId, {
                status: "connected",
                lastSync: new Date(),
              });
            }
          }
        } catch (e) {
          console.warn("Sync to backend errored, updating state only");
        }

        // Cập nhật state workflows cục bộ: thay các workflow của systemId
        // setWorkflows((prev) => {
        //   const without = prev.filter((w) => w.systemId !== systemId);
        //   return [...without, ...mapped];
        // });
      } catch (err) {
        console.error("Failed to fetch workflows by system:", err);
      } finally {
        // Xóa flag sau khi hoàn thành (thành công hoặc lỗi)
        setFetchingWorkflows((prev) => {
          const newSet = new Set(prev);
          newSet.delete(systemId);
          return newSet;
        });
      }
    })();

    return existing;
  };

  const getSystemStats = () => {
    return {
      totalSystems: systems.length,
      connectedSystems: systems.filter((s) => s.status === "connected").length,
      totalWorkflows: workflows.length,
      totalViolations: workflows.reduce((sum, wf) => sum + wf.violations, 0),
    };
  };

  return {
    systems,
    workflows,
    loading,
    syncingSystems,
    addSystem,
    updateSystem,
    deleteSystem,
    syncSystem,
    testSystemConnection,
    getWorkflowsBySystem,
    getSystemStats,
    addWorkflow,
    loadSystems, // Expose để có thể reload từ component
  };
}
