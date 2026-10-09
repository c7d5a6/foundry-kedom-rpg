/** Art Effort commitment durations. */
export const ART_COMMITMENTS = ["scene", "day", "concentration", "free"] as const;
export type ArtCommitment = (typeof ART_COMMITMENTS)[number];

export function isArtCommitment(value: string): value is ArtCommitment {
  return (ART_COMMITMENTS as readonly string[]).includes(value);
}
