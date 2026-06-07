import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "MyQuickPOS - Tablet",
  manifest: "/api/manifest/tablet-admin",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MyQuickPOS",
  },
}

export default function TabletAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
