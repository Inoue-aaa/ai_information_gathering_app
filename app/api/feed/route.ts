import { NextRequest, NextResponse } from "next/server";
import { getFeed } from "@/lib/services/feed-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function clampPeriod(value: string | null) {
  const parsed = Number(value ?? "7");

  if (Number.isNaN(parsed)) {
    return 7;
  }

  if (parsed <= 3) {
    return 3;
  }

  if (parsed <= 7) {
    return 7;
  }

  return 30;
}

export async function GET(request: NextRequest) {
  const periodDays = clampPeriod(request.nextUrl.searchParams.get("period"));

  try {
    const feed = await getFeed(periodDays);
    return NextResponse.json(feed);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "記事の取得に失敗しました。";

    return NextResponse.json(
      {
        message
      },
      {
        status: 500
      }
    );
  }
}
