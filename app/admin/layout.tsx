import { AdminSidebar } from "@/components/admin/admin-sidebar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 flex overflow-hidden bg-background">
      <AdminSidebar />
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</main>
    </div>
  )
}
