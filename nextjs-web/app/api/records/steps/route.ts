import { NextRequest, NextResponse } from "next/server";
import { getApiUrl } from "@/lib/api/get-api-url";

const API_BASE_URL = getApiUrl();

export async function GET(req: NextRequest) {
  try {
    const target = `${API_BASE_URL}/records/steps`;

    const res = await fetch(target, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("API request failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch steps",
      },
      { status: 502 }
    );
  }
}


