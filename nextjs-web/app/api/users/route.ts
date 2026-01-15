import { NextRequest, NextResponse } from "next/server";

interface User {
  id: number;
  name: string;
  login: string;
}

export async function GET(request: NextRequest) {
  try {
    // Mock users data for demonstration
    // In real implementation, this would fetch from backend API
    const mockUsers: User[] = [
      {
        id: 1,
        name: "Nguyễn Văn A",
        login: "nguyenvana",
      },
      {
        id: 2,
        name: "Trần Thị B",
        login: "tranthib",
      },
      {
        id: 3,
        name: "Lê Văn C",
        login: "levanc",
      },
      {
        id: 4,
        name: "Phạm Thị D",
        login: "phamthid",
      },
      {
        id: 5,
        name: "Hoàng Văn E",
        login: "hoangvane",
      },
    ];

    return NextResponse.json(mockUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
