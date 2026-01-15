import { NextRequest, NextResponse } from "next/server";
import { getApiUrl } from "@/lib/api/get-api-url";

const API_BASE_URL = getApiUrl();

export async function PUT(
  request: NextRequest,
  { params }: { params: { activityId: string } }
) {
  const targetUrl = `${API_BASE_URL}/workflows/activity/${params.activityId}`;
  console.log(`[PUT /api/workflows/activity/${params.activityId}] -> ${targetUrl}`);

  try {
    const body = await request.text();
    const response = await fetch(targetUrl, {
      method: "PUT",
      headers: request.headers,
      body,
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          error: errorData?.message || response.statusText,
        },
        {
          status: response.status,
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
          },
        }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error: any) {
    console.error(`[PUT /api/workflows/activity/${params.activityId}] failed`, {
      error: error?.message || error,
      targetUrl,
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { activityId: string } }
) {
  const targetUrl = `${API_BASE_URL}/workflows/activity/${params.activityId}`;
  console.log(
    `[PATCH /api/workflows/activity/${params.activityId}] -> ${targetUrl}`
  );

  try {
    const body = await request.text();
    const response = await fetch(targetUrl, {
      method: "PATCH",
      headers: request.headers,
      body,
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          error: errorData?.message || response.statusText,
        },
        {
          status: response.status,
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
          },
        }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error: any) {
    console.error(
      `[PATCH /api/workflows/activity/${params.activityId}] failed`,
      {
        error: error?.message || error,
        targetUrl,
      }
    );
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { activityId: string } }
) {
  const targetUrl = `${API_BASE_URL}/workflows/activity/${params.activityId}`;
  console.log(
    `[DELETE /api/workflows/activity/${params.activityId}] -> ${targetUrl}`
  );

  try {
    const response = await fetch(targetUrl, {
      method: "DELETE",
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          error: errorData?.message || response.statusText,
        },
        {
          status: response.status,
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
          },
        }
      );
    }

    const data = await response.json().catch(() => ({ success: true }));
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error: any) {
    console.error(
      `[DELETE /api/workflows/activity/${params.activityId}] failed`,
      {
        error: error?.message || error,
        targetUrl,
      }
    );
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  }
}

