export function bubbleCreationError(title: string, photoUri?: string): string | null {
  if (!title.trim()) return 'Please give your Bubble a title.';
  if (!photoUri?.trim()) return 'Choose a cover photo for your Bubble.';
  return null;
}

// Ratios are stored as height / width. Never clamp portrait photos to a crop.
export function coverHeight(width: number, ratio: number | undefined): number {
  return width * (ratio !== undefined && Number.isFinite(ratio) && ratio > 0 ? ratio : 1);
}
