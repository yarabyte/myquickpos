"use client"

import { useState } from "react"
import { Menu } from "lucide-react"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-background">
      <aside className="hidden h-full w-64 shrink-0 lg:flex">
        <AdminSidebar className="w-full" />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-3 lg:hidden">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-card-foreground">MyQuickPOS</p>
            <p className="text-xs text-muted-foreground">Admin Panel</p>
          </div>
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain pb-safe">
          {children}
        </main>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[min(100vw-2rem,18rem)] p-0 [&>button]:hidden">
          <SheetTitle className="sr-only">Navigation admin</SheetTitle>
          <AdminSidebar
            className="h-full w-full border-0"
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}
