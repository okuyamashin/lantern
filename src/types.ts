export type Outcome = "success" | "failure";

export type Place = {
  id: string;
  name: string;
  blurb: string;
  imageHint: string;
};

export type Enemy = {
  id: string;
  name: string;
  blurb: string;
  imageHint: string;
  imagePath?: string;
};

export type Adventurer = {
  id: string;
  name: string;
  role: string;
  trait: string;
  portraitPrompt: string;
  portrait: string;
};

export type StoryScene = {
  caption: string;
  imagePrompt: string;
};

export type StoryDraft = {
  outcome: Outcome;
  title: string;
  scenes: StoryScene[];
};

export type AdventureScene = StoryScene & {
  imagePath: string;
  audioPath?: string;
};

export type Adventure = {
  id: string;
  createdAt: string;
  outcome: Outcome;
  title: string;
  subtitle: string;
  place?: Place;
  enemy?: Enemy;
  party: Adventurer[];
  scenes: AdventureScene[];
};

export type AdventureSummary = {
  id: string;
  createdAt: string;
  title: string;
  subtitle: string;
  outcome: Outcome;
  partyNames: string[];
  coverPath: string;
  sceneCount: number;
  enemyId?: string;
  enemyName?: string;
  placeName?: string;
};

export type ProgressEvent =
  | { type: "status"; message: string }
  | { type: "scene"; index: number; total: number; caption: string; imagePath: string }
  | { type: "done"; adventure: Adventure }
  | { type: "error"; message: string };
