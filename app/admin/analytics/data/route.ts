import { NextResponse } from "next/server"
import { getTenantId } from "@/lib/auth"
import { analyticsRepository } from "@/lib/repositories/analytics.repository"
import { toDateParam } from "@/lib/analytics-date-range"
import { subDays } from "date-fns"

export async function GET(request: Request) {
  const tenantId = await getTenantId()
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const fromParam = searchParams.get("from")
  const toParam = searchParams.get("to")

  const today = toDateParam(new Date())
  const defaultFrom = toDateParam(subDays(new Date(), 29))
  const from = fromParam && /^\d{4}-\d{2}-\d{2}$/.test(fromParam) ? fromParam : defaultFrom
  const to = toParam && /^\d{4}-\d{2}-\d{2}$/.test(toParam) ? toParam : today

  if (from > to) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 })
  }

  const data = await analyticsRepository.analyticsBundleForRange(tenantId, from, to)
  return NextResponse.json(data)
}
