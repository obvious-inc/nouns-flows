import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Currency } from "@/components/ui/currency"
import database from "@/lib/database"
import { getIpfsUrl } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"
import { ExclamationTriangleIcon } from "@radix-ui/react-icons"
import Noggles from "@/public/noggles.svg"

export default async function ApplyPage() {
  const flows = await database.grant.findMany({
    where: { isFlow: 1, isActive: 1, isTopLevel: 0 },
  })

  return (
    <main className="container mt-8 pb-12">
      <div className="mx-auto max-w-screen-lg">
        <h3 className="font-semibold leading-none tracking-tight">Apply for a Grant</h3>
        <p className="mt-1.5 text-balance text-sm text-muted-foreground">
          Start your grant application by selecting the flow that best fits your project. Each flow
          has a specific focus and budget.
        </p>

        {flows.length === 0 && (
          <div className="mt-12 flex items-center justify-center">
            <Alert variant="destructive">
              <ExclamationTriangleIcon className="size-4" />
              <AlertTitle>No flows found</AlertTitle>
              <AlertDescription>There are no flows available for you to apply to.</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-2.5 lg:grid-cols-3 lg:gap-5">
          {flows.length > 0 && (
            <>
              {flows.map((flow) => (
                <Link
                  href={`/apply/${flow.id}`}
                  key={flow.id}
                  className="group h-full transition-transform md:hover:-translate-y-2"
                >
                  <Card className="h-full">
                    <CardContent className="p-4">
                      <div className="flex flex-col items-center">
                        <Image
                          src={getIpfsUrl(flow.image)}
                          alt={flow.title}
                          width={64}
                          height={64}
                          className="mb-4 size-10 rounded-full object-cover lg:size-16"
                        />
                        <h3 className="text-center text-base font-medium transition-colors group-hover:text-primary lg:text-lg">
                          {flow.title}
                        </h3>
                        <p className="mb-2 text-center text-sm text-muted-foreground">
                          {flow.tagline}
                        </p>
                        <Badge className="mt-2">
                          <Currency>{flow.monthlyFlowRate}</Currency>
                          /mo
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </>
          )}
          <NewFlowCard />
        </div>
      </div>
    </main>
  )
}

const NewFlowCard = () => (
  <Link href="/new-flow" className="group mt-6 h-full transition-transform md:hover:-translate-y-2">
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="flex flex-col items-center">
          <Image
            src={Noggles}
            alt="Noggles"
            width={64}
            height={64}
            className="object-fit mb-4 size-10 lg:size-16"
          />
          <h3 className="text-center text-base font-medium transition-colors group-hover:text-primary lg:text-lg">
            Create a flow
          </h3>
          <p className="mb-2 text-center text-sm text-muted-foreground">
            Create a new outcome funding pool for Nouns.
          </p>
        </div>
      </CardContent>
    </Card>
  </Link>
)
