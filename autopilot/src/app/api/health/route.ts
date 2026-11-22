import { NextResponse } from "next/server";
import { getDb } from "@/database/client";

export async function GET() {
  try {
    const db = await getDb();
    await db.get(`SELECT 1 AS ok`);
    return NextResponse.json({ ok: true, db: db.dialect });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
