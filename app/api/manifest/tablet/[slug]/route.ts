import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const decoded = decodeURIComponent(slug)
  const origin = request.nextUrl.origin

  const manifest = {
    name: "MyQuickPOS - Tablet",
    short_name: "MyQuickPOS",
    description: "Ordering tablet - Point of sale",
    start_url: `${origin}/restaurant/${encodeURIComponent(decoded)}`,
    scope: `${origin}/restaurant/`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f1117",
    theme_color: "#0f1117",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  }

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
