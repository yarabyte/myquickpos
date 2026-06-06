import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin

  const manifest = {
    name: "MyQuickPOS - Serveur",
    short_name: "MyQuickPOS",
    description: "Application tablette pour les serveurs",
    start_url: `${origin}/admin/tablet`,
    scope: `${origin}/`,
    display: "standalone",
    orientation: "any",
    background_color: "#0f1117",
    theme_color: "#0f1117",
    icons: [
      {
        src: "/icons/icon-192x192.jpg",
        sizes: "192x192",
        type: "image/jpeg",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.jpg",
        sizes: "512x512",
        type: "image/jpeg",
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
