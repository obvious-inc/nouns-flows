import { ponder, type Context, type Event } from "@/generated"
import { decodeAbiParameters, getAddress, zeroAddress } from "viem"
import { RecipientType, Status } from "../enums"
import { JobBody } from "../queue/job"

ponder.on("NounsFlowTcr:ItemSubmitted", handleItemSubmitted)
ponder.on("NounsFlowTcrChildren:ItemSubmitted", handleItemSubmitted)

async function handleItemSubmitted(params: {
  event: Event<"NounsFlowTcr:ItemSubmitted">
  context: Context<"NounsFlowTcr:ItemSubmitted">
}) {
  const { event, context } = params
  const { _submitter, _data, _itemID, _evidenceGroupID } = event.args

  const tcr = event.log.address.toLowerCase()

  if (event.block.number === BigInt(21826311)) {
    console.log({ _data, _itemID })
  }

  const { items } = await context.db.Grant.findMany({ where: { tcr, isFlow: true } })
  const flow = items?.[0]
  if (!flow) throw new Error("Flow not found for TCR item")

  const [recipient, metadata, recipientType] = decodeAbiParameters(
    [
      { name: "recipient", type: "address" },
      {
        name: "metadata",
        type: "tuple",
        components: [
          { name: "title", type: "string" },
          { name: "description", type: "string" },
          { name: "image", type: "string" },
          { name: "tagline", type: "string" },
          { name: "url", type: "string" },
        ],
      },
      { name: "recipientType", type: "uint8" },
    ],
    _data
  )

  const challengePeriodDuration = await context.client.readContract({
    address: getAddress(tcr),
    abi: context.contracts.NounsFlowTcr.abi,
    functionName: "challengePeriodDuration",
  })

  const grant = await context.db.Grant.create({
    id: _itemID,
    data: {
      ...metadata,
      isActive: false,
      recipient: recipient.toString(),
      flowId: flow.id,
      submitter: _submitter.toLowerCase(),
      parentContract: flow.recipient,
      isTopLevel: false,
      isFlow: recipientType === RecipientType.FlowContract,
      isRemoved: false,
      votesCount: "0",
      monthlyIncomingFlowRate: "0",
      monthlyIncomingBaselineFlowRate: "0",
      monthlyIncomingBonusFlowRate: "0",
      monthlyOutgoingFlowRate: "0",
      monthlyRewardPoolFlowRate: "0",
      challengePeriodEndsAt: Number(event.block.timestamp + challengePeriodDuration),
      monthlyBaselinePoolFlowRate: "0",
      monthlyBonusPoolFlowRate: "0",
      bonusMemberUnits: "0",
      baselineMemberUnits: "0",
      totalEarned: "0",
      activeRecipientCount: 0,
      awaitingRecipientCount: 0,
      challengedRecipientCount: 0,
      tcr: "",
      erc20: "",
      arbitrator: "",
      tokenEmitter: "",
      superToken: "",
      managerRewardPool: "",
      managerRewardSuperfluidPool: "",
      managerRewardPoolFlowRatePercent: 0,
      baselinePoolFlowRatePercent: 0,
      baselinePool: "",
      bonusPool: "",
      status: Status.RegistrationRequested,
      isDisputed: false,
      isResolved: false,
      evidenceGroupID: _evidenceGroupID.toString(),
      createdAt: Number(event.block.timestamp),
      updatedAt: Number(event.block.timestamp),
    },
  })

  await context.db.Grant.update({
    id: flow.id,
    data: { awaitingRecipientCount: flow.awaitingRecipientCount + 1 },
  })

  await postToEmbeddingsQueue(grant)
}

async function postToEmbeddingsQueue(grant: any) {
  const users = [
    ...new Set([grant.recipient, grant.submitter].map((address) => address.toLowerCase())),
  ].filter((address) => address !== zeroAddress)

  const content = `This is a grant application submitted by ${grant.submitter} for ${
    grant.recipient
  }. Here is the grant data: ${JSON.stringify(grant)}`

  const payload: JobBody = {
    type: "grant-application",
    content,
    groups: ["nouns"],
    users,
    tags: ["flows"],
  }

  const response = await fetch(process.env.EMBEDDINGS_QUEUE_URL + "/add-job", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    console.error("Failed to post to embeddings queue:", await response.text())
  }
}
