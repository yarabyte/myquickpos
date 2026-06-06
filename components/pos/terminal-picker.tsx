"use client"

import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { Monitor, MapPin, LogOut } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { cn, toTitleCase } from "@/lib/utils"

interface TerminalInfo {
  id: string
  name: string
  location: string
  status: "online" | "offline" | "maintenance"
}

interface TerminalPickerProps {
  userName: string
  terminals: TerminalInfo[]
}

export function TerminalPicker({ userName, terminals }: TerminalPickerProps) {
  const router = useRouter()
  const assignedTerminals = terminals

  function handleSelect(terminalId: string) {
    router.push(`/pos/${terminalId}`)
  }

  async function handleLogout() {
    await signOut({ redirect: false })
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Monitor className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-bold text-card-foreground leading-none">
              MyQuickPOS
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select a terminal
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
            <span className="text-sm font-medium text-secondary-foreground">
              {userName}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-9 w-9 text-muted-foreground hover:text-destructive"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Terminal Selection */}
      <main className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground">
              Welcome back, {userName.split(" ")[0]}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose a terminal to start your shift
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {assignedTerminals.map((terminal) => (
              <button
                key={terminal.id}
                onClick={() => handleSelect(terminal.id)}
                className={cn(
                  "group flex flex-col items-start gap-4 rounded-xl border border-border bg-card p-6 text-left transition-all",
                  "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5",
                  "active:scale-[0.98] touch-manipulation",
                  terminal.status === "offline" && "opacity-50 pointer-events-none"
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
                      "bg-secondary group-hover:bg-primary/10"
                    )}
                  >
                    <Monitor
                      className={cn(
                        "h-6 w-6 text-muted-foreground transition-colors",
                        "group-hover:text-primary"
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      terminal.status === "online"
                        ? "bg-primary"
                        : terminal.status === "maintenance"
                          ? "bg-chart-3"
                          : "bg-muted-foreground"
                    )}
                  />
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors">
                    {toTitleCase(terminal.name)}
                  </h3>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {toTitleCase(terminal.location)}
                  </p>
                </div>

                {terminal.status === "offline" && (
                  <span className="text-xs font-medium text-destructive">
                    Terminal is offline
                  </span>
                )}
              </button>
            ))}
          </div>

          {assignedTerminals.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Monitor className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm font-medium text-card-foreground">
                No terminals assigned
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Contact your manager to get assigned to a terminal.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
