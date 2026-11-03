/** GPT Image 2 always uses high input fidelity and rejects input_fidelity. */
export function isGptImage2(model: string): boolean {
  return /^gpt-image-2(?:-\d{4}-\d{2}-\d{2})?$/.test(model.trim())
}
