import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { makeJob, type Job, type JobStore } from "./types.ts";

export function createDynamoStore(tableName: string, region: string): JobStore {
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

  return {
    async create(draft) {
      const now = new Date().toISOString();
      const job = makeJob(draft, now);
      await client.send(new PutCommand({ TableName: tableName, Item: toItem(job) }));
      return job;
    },
    async get(id) {
      const result = await client.send(new GetCommand({ TableName: tableName, Key: { id } }));
      return result.Item ? fromItem(result.Item) : null;
    },
    async update(id, patch) {
      const current = await this.get(id);
      if (!current) {
        throw new Error("ジョブが見つかりません。");
      }
      const next = { ...current, ...patch, id, updatedAt: new Date().toISOString() };
      await client.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { id },
          UpdateExpression:
            "SET #status = :status, message = :message, updatedAt = :updatedAt, sceneIndex = :sceneIndex, sceneTotal = :sceneTotal, adventureJson = :adventureJson, #error = :error",
          ExpressionAttributeNames: { "#status": "status", "#error": "error" },
          ExpressionAttributeValues: {
            ":status": next.status,
            ":message": next.message,
            ":updatedAt": next.updatedAt,
            ":sceneIndex": next.sceneIndex ?? 0,
            ":sceneTotal": next.sceneTotal ?? 0,
            ":adventureJson": next.adventure ? JSON.stringify(next.adventure) : "",
            ":error": next.error ?? "",
          },
        }),
      );
      return next;
    },
    async listDone() {
      const result = await client.send(
        new ScanCommand({
          TableName: tableName,
          FilterExpression: "#status = :done",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: { ":done": "done" },
        }),
      );
      return (result.Items ?? [])
        .map(fromItem)
        .filter((job) => job.adventure)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
  };
}

function parseIds(value: unknown): string[] | undefined {
  try {
    const ids = JSON.parse(String(value || "[]")) as unknown;
    if (!Array.isArray(ids) || ids.length === 0) {
      return undefined;
    }
    return ids.map(String);
  } catch {
    return undefined;
  }
}

function toItem(job: Job): Record<string, unknown> {
  return {
    id: job.id,
    status: job.status,
    message: job.message,
    kind: job.kind,
    cardIdsJson: JSON.stringify(job.cardIds),
    adventureIdsJson: JSON.stringify(job.adventureIds ?? []),
    sceneIndex: job.sceneIndex ?? 0,
    sceneTotal: job.sceneTotal ?? 0,
    adventureJson: job.adventure ? JSON.stringify(job.adventure) : "",
    error: job.error ?? "",
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

function fromItem(item: Record<string, unknown>): Job {
  return {
    id: String(item.id),
    kind: item.kind === "narrate" ? "narrate" : "adventure",
    status: item.status as Job["status"],
    message: String(item.message ?? ""),
    cardIds: JSON.parse(String(item.cardIdsJson || "[]")) as string[],
    adventureIds: parseIds(item.adventureIdsJson),
    sceneIndex: Number(item.sceneIndex || 0) || undefined,
    sceneTotal: Number(item.sceneTotal || 0) || undefined,
    adventure: item.adventureJson ? (JSON.parse(String(item.adventureJson)) as Job["adventure"]) : undefined,
    error: item.error ? String(item.error) : undefined,
    createdAt: String(item.createdAt),
    updatedAt: String(item.updatedAt),
  };
}
