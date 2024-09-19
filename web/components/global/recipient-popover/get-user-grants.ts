"use server"

import database from "@/lib/database"
import { unstable_cache } from "next/cache"

export const getUserGrants = unstable_cache(
  async (address: `0x${string}`) => {
    if (!address) return []

    const grants = await database.grant.findMany({
      where: {
        recipient: address,
        isFlow: 0,
        isRemoved: 0,
      },
      orderBy: {
        totalEarned: "desc",
      },
    })

    return grants
  },
  ["user-grants"],
  { revalidate: 120 }, // 2 minutes
)