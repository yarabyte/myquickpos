import { auth } from "@/auth"
import {
  firstAllowedAdminRoute,
  hasAnyAdminPermission,
  hasPermission,
  permissionForPath,
  sessionPermissionsFromUser,
  type PermissionKey,
} from "@/lib/permissions"

export default auth((req) => {
  const pathname = req.nextUrl.pathname
  const isAdmin = pathname.startsWith("/admin")
  const isPos = pathname.startsWith("/pos")
  const isRestaurant = pathname.startsWith("/restaurant")

  if (isAdmin || isPos || isRestaurant) {
    if (!req.auth) {
      if (isRestaurant) return undefined
      const loginUrl = new URL("/login", req.nextUrl.origin)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return Response.redirect(loginUrl)
    }

    const permissions = sessionPermissionsFromUser({
      permissions: (req.auth.user as { permissions?: PermissionKey[] })?.permissions,
      role: (req.auth.user as { role?: string })?.role,
    })

    if (isRestaurant) {
      const canUseRestaurant =
        hasPermission(permissions, "restaurant.tablet") ||
        hasAnyAdminPermission(permissions) ||
        hasPermission(permissions, "pos.access")
      if (!canUseRestaurant) {
        const adminRoute = firstAllowedAdminRoute(permissions)
        if (adminRoute) return Response.redirect(new URL(adminRoute, req.nextUrl.origin))
        return Response.redirect(new URL("/login", req.nextUrl.origin))
      }
      return undefined
    }

    if (isAdmin && !hasAnyAdminPermission(permissions)) {
      if (hasPermission(permissions, "pos.access")) {
        return Response.redirect(new URL("/pos", req.nextUrl.origin))
      }
      if (hasPermission(permissions, "restaurant.tablet")) {
        return Response.redirect(new URL("/admin/tablet", req.nextUrl.origin))
      }
      return Response.redirect(new URL("/login", req.nextUrl.origin))
    }

    if (isPos && !hasPermission(permissions, "pos.access")) {
      const adminRoute = firstAllowedAdminRoute(permissions)
      if (adminRoute) {
        return Response.redirect(new URL(adminRoute, req.nextUrl.origin))
      }
      if (hasPermission(permissions, "restaurant.tablet")) {
        return Response.redirect(new URL("/admin/tablet", req.nextUrl.origin))
      }
      return Response.redirect(new URL("/login", req.nextUrl.origin))
    }

    if (isAdmin) {
      const required = permissionForPath(pathname)
      if (required && !hasPermission(permissions, required)) {
        const fallback = firstAllowedAdminRoute(permissions)
        if (fallback && fallback !== pathname) {
          return Response.redirect(new URL(fallback, req.nextUrl.origin))
        }
      }
    }
  }

  return undefined
})

export const config = {
  matcher: ["/admin/:path*", "/pos/:path*", "/restaurant/:path*"],
}
