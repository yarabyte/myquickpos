import Link from "next/link"

export default function RestaurantTableNotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-4">
      <h1 className="text-xl font-semibold text-foreground">Tablet not found</h1>
      <p className="text-sm text-muted-foreground text-center">
        Check the link or contact the venue.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Home
      </Link>
    </div>
  )
}
