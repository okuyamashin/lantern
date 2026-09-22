import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import type { Job, JobQueue } from "./types.ts";

export function createSqsQueue(queueUrl: string, region: string): JobQueue {
  const client = new SQSClient({ region });
  return {
    async enqueue(job) {
      await client.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify({ jobId: job.id, cardIds: job.cardIds }),
        }),
      );
    },
  };
}
