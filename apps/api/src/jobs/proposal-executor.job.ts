import { Worker } from "bullmq";
import { executeProposal } from "../modules/treasury/proposal.service";
import { getBullConnection } from "./mpesa-callback.queue";
import {
  proposalExecutionQueueName,
  type ProposalExecutionJobData
} from "./proposal-execution.queue";

export function startProposalExecutorWorker(): Worker<ProposalExecutionJobData> {
  return new Worker<ProposalExecutionJobData>(
    proposalExecutionQueueName,
    async (job) => executeProposal(job.data.proposalId),
    {
      connection: getBullConnection()
    }
  );
}
