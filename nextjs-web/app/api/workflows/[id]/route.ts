import { NextRequest, NextResponse } from "next/server";
import { getApiUrl } from "@/lib/api/get-api-url";

const API_BASE_URL = getApiUrl();

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const targetUrl = `${API_BASE_URL}/workflows/${params.id}`;
  console.log(`[GET /api/workflows/${params.id}] -> ${targetUrl}`);

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Upstream responded ${response.status}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ data, success: true });
  } catch (error: any) {
    console.error(`[GET /api/workflows/${params.id}] failed`, {
      error: error?.message || error,
      targetUrl,
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        details:
          process.env.NODE_ENV === "development"
            ? { targetUrl, errorCode: error?.code }
            : undefined,
      },
      { status: 500 }
    );
  }
}
