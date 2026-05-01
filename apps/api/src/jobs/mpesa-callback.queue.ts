import { Queue } from "bullmq";
import Redis from "ioredis";
import type { MpesaCallback } from "../lib/mpesa";

export const mpesaCallbackQueueName = "mpesa-callbacks";

export type MpesaCallbackJobData = {
  callback: MpesaCallback;
};

let bullConnection: Redis | undefined;
let mpesaCallbackQueue: Queue<MpesaCallbackJobData> | undefined;

export function getBullConnection(): Redis {
  bullConnection ??= new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null
  });

  return bullConnection;
}

export function getMpesaCallbackQueue(): Queue<MpesaCallbackJobData> {
  mpesaCallbackQueue ??= new Queue<MpesaCallbackJobData>(mpesaCallbackQueueName, {
    connection: getBullConnection()
  });

  return mpesaCallbackQueue;
}
