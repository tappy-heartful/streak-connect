import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/src/lib/cron-auth";
import { runDayOfTicketReminders } from "@/src/features/ticket/services/reminder-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/cron/reminder (GAS時間主導型トリガーから15分おきに実行)
 */
export async function POST(req: NextRequest) {
  try {
    const auth = verifyCronAuth(req);
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.reason },
        { status: 401 }
      );
    }

    let isForce = req.nextUrl.searchParams.get("force") === "true";
    try {
      const body = await req.json();
      if (body?.isForce !== undefined) {
        isForce = Boolean(body.isForce);
      }
    } catch {
      // ボディなし時はクエリパラメータを採用
    }

    const res = await runDayOfTicketReminders(isForce);
    return NextResponse.json(res);
  } catch (err: any) {
    console.error("[API /api/cron/reminder] POST error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/reminder (開発時・検証用)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = verifyCronAuth(req);
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.reason },
        { status: 401 }
      );
    }

    const isForce = req.nextUrl.searchParams.get("force") === "true";
    const res = await runDayOfTicketReminders(isForce);
    return NextResponse.json(res);
  } catch (err: any) {
    console.error("[API /api/cron/reminder] GET error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

