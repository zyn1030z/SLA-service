import { NextRequest, NextResponse } from "next/server";
import { getApiUrl } from "@/lib/api/get-api-url";

const API_BASE_URL = getApiUrl();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const target = `${API_BASE_URL}/auth/login`;

    console.log("[Auth Login Proxy] Forwarding to:", target);

    const res = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Failed to login:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Login failed",
      },
      { status: 502 }
    );
  }
}
