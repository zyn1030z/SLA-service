import { NextRequest, NextResponse } from "next/server";
import { getApiUrl } from "@/lib/api/get-api-url";

const API_BASE_URL = getApiUrl();

export async function GET(req: NextRequest) {
  try {
    // Forward auth headers from client
    const authHeader = req.headers.get('authorization');

    const target = `${API_BASE_URL}/admin/users`;
    console.log("[Admin Users Proxy] Forwarding to:", target);

    let response = await fetch(target, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { "Authorization": authHeader }),
      },
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
    console.error("Failed to fetch admin users:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch users",
      },
      { status: 502 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const authHeader = req.headers.get('authorization');
    
    const target = `${API_BASE_URL}/admin/users`;
    console.log("[Admin Users Proxy] Creating user at:", target);

    const res = await fetch(target, {
      method: "POST",
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
    console.error("Failed to create user:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create user",
      },
      { status: 502 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const authHeader = req.headers.get('authorization');
    const url = new URL(req.url);
    const userId = url.searchParams.get('id');
    
    const target = `${API_BASE_URL}/admin/users/${userId}`;
    console.log("[Admin Users Proxy] Updating user at:", target);

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

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const url = new URL(req.url);
    const userId = url.searchParams.get('id');
    
    const target = `${API_BASE_URL}/admin/users/${userId}`;
    console.log("[Admin Users Proxy] Deleting user at:", target);

    const res = await fetch(target, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { "Authorization": authHeader }),
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    return new NextResponse(null, { status: res.status });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete user",
      },
      { status: 502 }
    );
  }
}