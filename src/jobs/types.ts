import type { Adventure } from "../types.ts";

export type JobStatus = "queued" | "writing" | "drawing" | "done" | "error";

export type Job = {
  id: string;
  status: JobStatus;
  message: string;
  cardIds: string[];
  sceneIndex?: number;
  sceneTotal?: number;
  adventure?: Adventure;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type JobStore = {
  create(cardIds: string[]): Promise<Job>;
  get(id: string): Promise<Job | null>;
  update(id: string, patch: Partial<Job>): Promise<Job>;
  listDone(): Promise<Job[]>;
};

export type JobQueue = {
  enqueue(job: Job): Promise<void>;
};

export type AssetPut = (
  relativePath: string,
  data: Buffer | string,
  contentType: string,
) => Promise<string>;
