#!/usr/bin/env tsx
/**
 * Set stock to 100 for all products in the Bar/Restaurant store.
 * Run: pnpm run db:set-bar-restaurant-stock-100
 */

import { prisma } from "@/lib/db"

const STORE_NAME = "Bar/Restaurant"
const TARGET_QUANTITY = 100

async function main() {
  const stores = await prisma.store.findMany({
    where: {
      OR: [
        { name: { equals: STORE_NAME, mode: "insensitive" } },
        { name: { contains: "Bar/Restaurant", mode: "insensitive" } },
        { name: { contains: "Bar-Restaurant", mode: "insensitive" } },
      ],
    },
    include: { tenant: true },
  })

  if (stores.length === 0) {
    console.error("No store found with name containing 'Bar/Restaurant'. Creating it for tenant CMM if needed.")
    // Try to find or create for tenant cmm3bmydp00005hnea4s561m0
    const tenant = await prisma.tenant.findUnique({
      where: { id: "cmm3bmydp00005hnea4s561m0" },
    })
    if (!tenant) {
      console.error("Tenant cmm3bmydp00005hnea4s561m0 not found.")
      process.exit(1)
    }
    const central = await prisma.store.findFirst({
      where: { tenantId: tenant.id, isCentral: true },
    })
    if (central) {
      const barStore = await prisma.store.create({
        data: {
          tenantId: tenant.id,
          name: STORE_NAME,
          isCentral: false,
        },
        include: { tenant: true },
      })
      stores.push(barStore)
      console.log("Created store:", barStore.name, barStore.id)
    }
  }

  let totalUpdated = 0
  for (const store of stores) {
    const products = await prisma.product.findMany({
      where: { tenantId: store.tenantId, isActive: true, isService: false },
      select: { id: true, name: true },
    })

    for (const product of products) {
      await prisma.storeStock.upsert({
        where: {
          storeId_productId: { storeId: store.id, productId: product.id },
        },
        create: { storeId: store.id, productId: product.id, quantity: TARGET_QUANTITY },
        update: { quantity: TARGET_QUANTITY },
      })
      totalUpdated++
    }
    console.log("Store", store.name, "(" + store.id + "): set stock to", TARGET_QUANTITY, "for", products.length, "products")
  }

  if (totalUpdated === 0 && stores.length === 0) {
    console.error("No store matched. List existing stores:")
    const allStores = await prisma.store.findMany({ select: { id: true, name: true, tenantId: true } })
    allStores.forEach((s) => console.log(" -", s.name, "(" + s.id + ")"))
    process.exit(1)
  }

  console.log("\nDone. Total products updated:", totalUpdated)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
