import { NextRequest, NextResponse } from "next/server";
import { getApiUrl } from "@/lib/api/get-api-url";

const API_BASE_URL = getApiUrl();

export async function POST(
  request: NextRequest,
  { params }: { params: { systemId: string } }
) {
  try {
    const body = await request.json();
    const { systemId } = params;

    const response = await fetch(`${API_BASE_URL}/workflows/sync/${systemId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error("API request failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      },
      { status: 500 }
    );
  }
}
