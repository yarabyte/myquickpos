"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Monitor, User, Search, ArrowLeft, LogOut, LayoutDashboard, ChevronDown, X } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { toTitleCase, cn } from "@/lib/utils"

interface PosHeaderProps {
  onSearch: (query: string) => void
  terminalName?: string
  cashierName?: string
}

export function PosHeader({ onSearch, terminalName, cashierName }: PosHeaderProps) {
  const { data: session } = useSession()
  const user = session?.user as { name?: string; role?: string } | undefined
  const router = useRouter()
  const [time, setTime] = useState("")
  const [date, setDate] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasDashboardAccess = ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(user?.role ?? "")

  const queueSearch = useCallback(
    (value: string) => {
      setSearchValue(value)
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
      searchTimerRef.current = setTimeout(() => onSearch(value), 180)
    },
    [onSearch]
  )

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })
      )
      setDate(
        now.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      )
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="shrink-0 border-b border-border bg-card">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:gap-4 sm:px-5 sm:py-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2 text-muted-foreground hover:bg-secondary hover:text-foreground sm:px-3"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden text-sm font-medium sm:inline">Menu</span>
                <ChevronDown className="hidden h-3.5 w-3.5 sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {hasDashboardAccess && (
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="flex items-center gap-2 cursor-pointer">
                    <LayoutDashboard className="h-4 w-4" />
                    Back to Dashboard
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link href="/pos" className="flex items-center gap-2 cursor-pointer">
                  <Monitor className="h-4 w-4" />
                  Switch Terminal
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Monitor className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold text-card-foreground leading-none sm:text-base">
              MyQuickPOS
            </h1>
            <p className="truncate text-xs text-muted-foreground mt-0.5">
              {toTitleCase(terminalName ?? "Terminal 01")}
            </p>
          </div>
        </div>

        <div className="relative hidden flex-1 max-w-md md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchValue}
            onChange={(e) => queueSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-secondary py-2.5 pl-10 pr-4 text-sm text-card-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary touch-manipulation"
          />
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <button
            type="button"
            onClick={() => setSearchOpen((open) => !open)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg transition-colors touch-manipulation md:hidden",
              searchOpen
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
            aria-label="Search products"
          >
            {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
          </button>
          <div className="hidden text-right lg:block">
            <p className="text-sm font-semibold text-card-foreground font-mono leading-none">
              {time}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{date}</p>
          </div>
          <ThemeToggle />
          <div className="hidden items-center gap-2 rounded-lg bg-secondary px-3 py-2 sm:flex">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="max-w-[120px] truncate text-sm font-medium text-secondary-foreground">
              {user?.name ?? cashierName ?? "Cashier"}
            </span>
          </div>
          {user?.role === "CASHIER" && (
            <button
              onClick={async () => {
                await signOut({ redirect: false })
                router.push("/login")
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-destructive transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-border px-3 pb-3 pt-2 md:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products..."
              autoFocus
              value={searchValue}
              onChange={(e) => queueSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-secondary py-2.5 pl-10 pr-4 text-sm text-card-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary touch-manipulation"
            />
          </div>
        </div>
      )}
    </header>
  )
}
