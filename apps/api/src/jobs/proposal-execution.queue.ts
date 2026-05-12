import { Queue } from "bullmq";
import { getBullConnection } from "./mpesa-callback.queue";

export const proposalExecutionQueueName = "proposal-execution";

export type ProposalExecutionJobData = {
  proposalId: string;
};

let proposalExecutionQueue: Queue<ProposalExecutionJobData> | undefined;

export function getProposalExecutionQueue(): Queue<ProposalExecutionJobData> {
  proposalExecutionQueue ??= new Queue<ProposalExecutionJobData>(proposalExecutionQueueName, {
    connection: getBullConnection()
  });

  return proposalExecutionQueue;
}
