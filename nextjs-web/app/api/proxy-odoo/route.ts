import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Breakpoint 1: Start of function 
    debugger; // Set breakpoint here in VS Code

    const body = await request.json();

    // Kiểm tra Odoo server có chạy không
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    let response;
    try {
      // Read dynamic config from request body sent by frontend
      const apiUrl: string =
        body.apiUrl ||
        `${body.baseUrl || ""}/api/v2/tcm/workflow/get_workflow_steps`;
      const method: string = body.method || "POST";
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(body.headers || {}),
      };
      const requestBody: Record<string, any> = body.requestBody || {};

      console.log("🔗 [DEBUG] URL:", apiUrl);
      console.log("🛠️ [DEBUG] Method:", method);
      console.log("🧾 [DEBUG] Headers:", headers);
      console.log(
        "📤 [DEBUG] Request body:",
        JSON.stringify(requestBody, null, 2)
      );

      response = await fetch(apiUrl, {
        method,
        headers,
        body: method === "GET" ? undefined : JSON.stringify(requestBody),
        signal: controller.signal,
      });

      console.log(
        "📊 [DEBUG] Response headers:",
        Object.fromEntries(response.headers.entries())
      );

      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      console.error(
        "❌ [DEBUG] Failed to connect to Odoo server:",
        fetchError.message
      );
      console.error("🔍 [DEBUG] Error type:", fetchError.name);
      console.error("🔍 [DEBUG] Error stack:", fetchError.stack);

      // Trả về lỗi rõ ràng thay vì mock data
      return NextResponse.json(
        {
          error: "Cannot connect to Odoo server",
          details: fetchError?.message || "Unknown error",
        },
        { status: 502 }
      );
    }

    if (!response.ok) {
      console.error("❌ [DEBUG] Odoo API returned error status");
      console.error(
        `📊 [DEBUG] Status: ${response.status} - ${response.statusText}`
      );
      return NextResponse.json(
        {
          error: `Odoo API Error: ${response.status} - ${response.statusText}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("💥 [DEBUG] Global error caught:", error.message);
    console.error("🔍 [DEBUG] Error type:", error.name);
    console.error("🔍 [DEBUG] Error stack:", error.stack);
    return NextResponse.json(
      { error: `Proxy error: ${error.message}` },
      { status: 500 }
    );
  }
}
