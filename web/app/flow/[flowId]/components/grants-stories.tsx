import "server-only"

import { StoryCard } from "@/app/components/story-card"
import { FeaturedStoryCard } from "@/app/components/story-card-featured"
import database from "@/lib/database/edge"

interface Props {
  flowId: string
}

export async function GrantsStories(props: Props) {
  const { flowId } = props

  const stories = await database.story.findMany({
    where: { complete: true, header_image: { not: null }, parent_flow_ids: { has: flowId } },
    orderBy: { updated_at: "desc" },
    take: 11,
  })

  if (stories.length === 0) return null

  const [featuredStory, ...remainingStories] = stories

  return (
    <div className="mt-10 grid grid-cols-1 gap-2.5 md:grid-cols-4">
      {featuredStory && <FeaturedStoryCard story={featuredStory} />}
      {remainingStories.map((story) => (
        <StoryCard story={story} key={story.id} />
      ))}
    </div>
  )
}
