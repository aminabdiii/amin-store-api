export interface OptionInput {
  name: string;
  values: string[];
}
export function signature(selection: Record<string, string>): string {
  return JSON.stringify(
    Object.fromEntries(Object.entries(selection).sort(([a], [b]) => a.localeCompare(b))),
  );
}
export function combinations(options: OptionInput[]): Record<string, string>[] {
  const names = new Set<string>();
  let result: Record<string, string>[] = [{}];
  for (const option of options) {
    if (
      names.has(option.name) ||
      !option.values.length ||
      new Set(option.values).size !== option.values.length ||
      option.values.some((x) => !x.trim())
    )
      throw new RangeError('Options require unique names and nonempty unique values');
    names.add(option.name);
    if (result.length * option.values.length > 256)
      throw new RangeError('A product supports at most 256 variants');
    result = result.flatMap((selection) =>
      option.values.map((value) => ({ ...selection, [option.name]: value })),
    );
  }
  return result;
}
