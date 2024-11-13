"use server"

import { validTypes } from "@/lib/types/job"
import { z } from "zod"
import { generateEmbedding } from "../../../embedding/generate-embedding"
import { queryEmbeddingsSimilarity } from "@/lib/embedding/query"

const embeddingQuerySchema = z.object({
  types: z.array(z.enum(validTypes)),
  query: z.string().trim().min(10, "Substantial query is required"),
  groups: z.array(z.string().trim()),
  users: z
    .array(
      z
        .string()
        .trim()
        .toLowerCase()
        .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid user address"),
    )
    .optional(),
  tags: z.array(z.string().trim()),
  numResults: z.number().min(1).max(100),
})

export async function searchEmbeddings({
  types,
  query,
  groups,
  users,
  tags,
  numResults,
}: z.infer<typeof embeddingQuerySchema>) {
  try {
    const validation = embeddingQuerySchema.safeParse({
      types,
      query,
      groups,
      users,
      tags,
      numResults,
    })

    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors
      throw new Error(Object.values(errors).flat().join(", "))
    }

    const embeddingQuery = await generateEmbedding(query)

    const results = await queryEmbeddingsSimilarity({
      embeddingQuery,
      types,
      groups,
      users: users || [],
      tags,
      numResults,
    })

    return results
  } catch (error) {
    console.error(error)
    return (error as Error).message
  }
}