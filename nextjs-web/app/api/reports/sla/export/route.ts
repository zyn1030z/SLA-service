import { NextRequest, NextResponse } from "next/server";
import { getApiUrl } from "@/lib/api/get-api-url";

const API_BASE_URL = getApiUrl();

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId") || "all";
    const days = url.searchParams.get("days") || "30";
    const format = url.searchParams.get("format") || "pdf";

    // Get report content from backend
    const reportResponse = await fetch(
      `${API_BASE_URL}/reports/sla/export?userId=${userId}&days=${days}&format=${format}`,
      {
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!reportResponse.ok) {
      console.error(`Backend export returned ${reportResponse.status}: ${reportResponse.statusText}`);
      return NextResponse.json(
        { error: "Failed to generate report from backend" },
        { status: reportResponse.status }
      );
    }

    const reportContent = await reportResponse.text();

    // Return as text file
    const headers = new Headers();
    if (format === "pdf") {
      headers.set("Content-Type", "application/pdf");
      headers.set("Content-Disposition", `attachment; filename="sla-report-${userId}-${days}days.pdf"`);
    } else {
      headers.set("Content-Type", "application/vnd.ms-excel");
      headers.set("Content-Disposition", `attachment; filename="sla-report-${userId}-${days}days.xlsx"`);
    }

    return new NextResponse(reportContent, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="sla-report-${userId}-${days}days.txt"`,
      },
    });
  } catch (error) {
    console.error("Error generating SLA report:", error);
    return NextResponse.json(
      { error: "Failed to generate SLA report" },
      { status: 500 }
    );
  }
}
