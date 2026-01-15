import { NextRequest, NextResponse } from "next/server";
import { getApiUrl } from "@/lib/api/get-api-url";

const API_BASE_URL = getApiUrl();

export async function GET(request: NextRequest) {
  try {
    console.log("Fetching dashboard data from:", `${API_BASE_URL}/dashboard/summary`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`${API_BASE_URL}/dashboard/summary`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Backend API returned ${response.status}: ${response.statusText}`);
      // Return fallback data if backend fails
      return NextResponse.json({
        totalViolations: 0,
        activeRecords: 0,
        completedToday: 0,
        successRate: 0,
        trendPercent: 0,
        trendDirection: "stable",
      }, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      });
    }

    const data = await response.json();
    console.log("Dashboard data received:", data);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard summary from backend:", error);
    // Return fallback data on error
    return NextResponse.json({
      totalViolations: 0,
      activeRecords: 0,
      completedToday: 0,
      successRate: 0,
      trendPercent: 0,
      trendDirection: "stable",
    }, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  }
}
