import { NextRequest, NextResponse } from "next/server";
import { getApiUrl } from "@/lib/api/get-api-url";

const API_BASE_URL = getApiUrl();

// Handle PUT requests to /api/admin/users/:id (for updating user)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const body = await req.json();

    const target = `${API_BASE_URL}/admin/users/${params.id}`;
    console.log("[Admin Users UPDATE] Forwarding to:", target);

    const res = await fetch(target, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { "Authorization": authHeader }),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update user",
      },
      { status: 502 }
    );
  }
}

// Handle POST requests to /api/admin/users/:id (for lock/unlock actions)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Determine action based on URL path
    let action: string | null = null;
    if (pathname.endsWith('/lock')) {
      action = 'lock';
    } else if (pathname.endsWith('/unlock')) {
      action = 'unlock';
    }

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Invalid endpoint. Use /lock or /unlock" },
        { status: 400 }
      );
    }

    const target = `${API_BASE_URL}/admin/users/${params.id}/${action}`;
    console.log(`[Admin Users ${action.toUpperCase()}] Forwarding to:`, target);

    const res = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { "Authorization": authHeader }),
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Failed to lock/unlock user:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to lock/unlock user",
      },
      { status: 502 }
    );
  }
}
