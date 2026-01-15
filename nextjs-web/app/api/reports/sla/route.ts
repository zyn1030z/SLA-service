import { NextRequest, NextResponse } from "next/server";
import { getApiUrl } from "@/lib/api/get-api-url";

const API_BASE_URL = getApiUrl();

interface SLAReport {
  userId: number;
  userName: string;
  userLogin: string;
  totalRecords: number;
  completedRecords: number;
  violatedRecords: number;
  pendingRecords: number;
  successRate: number;
  avgCompletionTime: number;
  totalViolations: number;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId") || "all";
    const days = parseInt(url.searchParams.get("days") || "30");

    // Get SLA report data from backend
    const reportResponse = await fetch(
      `${API_BASE_URL}/reports/sla?userId=${userId}&days=${days}`,
      {
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!reportResponse.ok) {
      console.error(`Backend returned ${reportResponse.status}: ${reportResponse.statusText}`);
      return NextResponse.json(
        { error: "Failed to fetch SLA reports from backend" },
        { status: reportResponse.status }
      );
    }

    const data = await reportResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching SLA reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch SLA reports" },
      { status: 500 }
    );
  }
}
