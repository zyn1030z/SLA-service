import { NextRequest, NextResponse } from "next/server";
import { getApiUrl } from "@/lib/api/get-api-url";

const API_BASE_URL = getApiUrl();

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');

    const target = `${API_BASE_URL}/admin/users/${params.id}/lock`;
    console.log("[Admin Users Lock] Forwarding to:", target);

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
    console.error("Failed to lock user:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to lock user",
      },
      { status: 502 }
    );
  }
}
