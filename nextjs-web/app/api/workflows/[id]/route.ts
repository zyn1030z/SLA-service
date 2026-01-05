import { NextRequest, NextResponse } from "next/server";
import { getApiUrl } from "@/lib/api/get-api-url";

const API_BASE_URL = getApiUrl();

type Params = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: Params) {
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

/**
 * Proxy PUT /api/workflows/[id] -> NestJS /workflows/:id
 * Dùng cho màn Cấu hình API toàn cục - Thông báo & Tự động duyệt.
 */
export async function PUT(request: NextRequest, { params }: Params) {
  const targetUrl = `${API_BASE_URL}/workflows/${params.id}`;
  console.log(`[PUT /api/workflows/${params.id}] -> ${targetUrl}`);

  try {
    const body = await request.text();

    const response = await fetch(targetUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(
        `[PUT /api/workflows/${params.id}] upstream error ${response.status}`,
        text
      );

      return NextResponse.json(
        {
          success: false,
          error: `Upstream responded ${response.status}`,
          details:
            process.env.NODE_ENV === "development" ? { body: text } : undefined,
        },
        { status: response.status }
      );
    }

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(
      { success: true, data },
      { status: response.status }
    );
  } catch (error: any) {
    console.error(`[PUT /api/workflows/${params.id}] failed`, {
      error: error?.message || error,
      targetUrl,
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
