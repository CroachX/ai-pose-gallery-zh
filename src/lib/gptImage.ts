/** GPT Image 2 and 2.5 reject the optional input_fidelity parameter. */
export function omitsInputFidelity(model: string): boolean {
  return /^gpt-image-(?:2|2\.5(?:-(?:sunburst|flare))?)(?:-\d{4}-\d{2}-\d{2})?$/.test(model.trim())
}
