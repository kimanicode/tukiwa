import { Worker } from "bullmq";
import { expireStaleProposals } from "../modules/treasury/proposal.service";
import { getBullConnection } from "./mpesa-callback.queue";

export const proposalExpiryQueueName = "proposal-expiry";

export function startProposalExpiryWorker(): Worker<Record<string, never>> {
  return new Worker<Record<string, never>>(
    proposalExpiryQueueName,
    async () => expireStaleProposals(),
    {
      connection: getBullConnection()
    }
  );
}
