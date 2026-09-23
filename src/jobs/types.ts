import type { Adventure } from "../types.ts";

export type JobStatus = "queued" | "writing" | "drawing" | "done" | "error";

export type JobKind = "adventure" | "narrate";

export type JobDraft = {
  kind?: JobKind;
  cardIds?: string[];
  adventureIds?: string[];
};

export type Job = {
  id: string;
  kind: JobKind;
  status: JobStatus;
  message: string;
  cardIds: string[];
  adventureIds?: string[];
  sceneIndex?: number;
  sceneTotal?: number;
  adventure?: Adventure;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type JobStore = {
  create(draft: JobDraft): Promise<Job>;
  get(id: string): Promise<Job | null>;
  update(id: string, patch: Partial<Job>): Promise<Job>;
  listDone(): Promise<Job[]>;
};

export function makeJob(draft: JobDraft, now = new Date().toISOString()): Job {
  const kind = draft.kind ?? "adventure";
  const cardIds = draft.cardIds ?? [];
  const adventureIds = draft.adventureIds?.filter(Boolean) ?? [];
  const suffix =
    kind === "narrate" ? `narrate-${adventureIds[0] || "batch"}` : cardIds.join("-") || "random";
  return {
    id: `${Date.now()}-${suffix}`,
    kind,
    status: "queued",
    message: kind === "narrate" ? "読み上げの順番待ちです" : "順番待ちです",
    cardIds,
    adventureIds: kind === "narrate" ? adventureIds : undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export type JobQueue = {
  enqueue(job: Job): Promise<void>;
};

export type AssetPut = (
  relativePath: string,
  data: Buffer | string,
  contentType: string,
) => Promise<string>;
