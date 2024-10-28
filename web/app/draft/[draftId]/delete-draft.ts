"use server"

import database from "@/lib/database"
import { revalidatePath } from "next/cache"

export async function deleteDraft(id: number, user?: string) {
  try {
    const draft = await database.draft.findUnique({ where: { id, isOnchain: false } })
    if (!draft) throw new Error("Draft not found")

    if (!user || !draft.users.some((address) => address === user?.toLowerCase())) {
      throw new Error("Failed to update draft")
    }

    await database.draft.update({ where: { id }, data: { isPrivate: true } })

    revalidatePath(`/flow/${draft.flowId}/drafts`)

    return { error: false }
  } catch (error) {
    return { error: (error as Error).message || "Failed to delete draft" }
  }
}