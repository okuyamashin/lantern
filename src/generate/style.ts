export const SCENE_STYLE =
  "Japanese kamishibai paper theater, watercolor on washi paper, ink outlines, warm lantern light, cinematic wide illustration, no text, no letters, no watermark, no caption";

export const PORTRAIT_STYLE =
  "tarot card style character illustration, ornate gold filigree border, vintage Rider-Waite tarot card composition, vertical card frame, painterly illustration, no text, no letters, no watermark";

export function withSceneStyle(prompt: string): string {
  return `${prompt.trim()}. ${SCENE_STYLE}`;
}

export function withPortraitStyle(prompt: string): string {
  return `${prompt.trim()}. ${PORTRAIT_STYLE}`;
}

export const ENEMY_SKETCH_STYLE =
  "rough handwritten field sketch on scrap paper, messy ink and pencil doodle for a guild quest memo, sepia charcoal, coffee stains, no ornate frame, no tarot border, no text, no letters, no watermark";

export function withEnemySketchStyle(prompt: string): string {
  return `${prompt.trim()}. ${ENEMY_SKETCH_STYLE}`;
}
