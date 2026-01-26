import { NextRequest, NextResponse } from "next/server";
import { getApiUrl } from "@/lib/api/get-api-url";

const API_BASE_URL = getApiUrl();

export async function POST(req: NextRequest) {
  try {
    // Forward auth headers from client
    const authHeader = req.headers.get('authorization');
    const body = await req.json();

    const target = `${API_BASE_URL}/workflows/activity`;
    console.log("[Create Activity Proxy] Forwarding to:", target);

    let response = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { "Authorization": authHeader }),
      },
      body: JSON.stringify(body),
    });

    // For 401/403 errors, return the error to client
    // Client-side apiClient interceptor will handle token refresh
    if (response.status === 401 || response.status === 403) {
      const errorData = await response.json().catch(() => ({ error: 'Authentication failed' }));
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication expired. Please refresh and try again.',
          originalError: errorData
        },
        { status: response.status }
      );
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Failed to create activity:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create activity",
      },
      { status: 502 }
    );
  }
}
