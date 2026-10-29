export function parseArgs(args: string[]): {
  backup: string;
  storage: string;
  apply: boolean;
  resolveUsernames: boolean;
} {
  const values = new Map<string, string>();
  let apply = false,
    dry = false,
    resolveUsernames = false;
  for (let index = 0; index < args.length; index++) {
    const name = args[index];
    if (name === '--resolve-usernames') {
      if (resolveUsernames) throw new Error('Duplicate username resolution flag');
      resolveUsernames = true;
    } else if (name === '--apply') {
      if (apply) throw new Error('Duplicate apply flag');
      apply = true;
    } else if (name === '--dry-run') {
      if (dry) throw new Error('Duplicate dry-run flag');
      dry = true;
    } else if (name === '--backup' || name === '--storage') {
      const value = args[++index];
      if (!value || value.startsWith('--') || values.has(name))
        throw new Error('Missing or duplicate input path');
      values.set(name, value);
    } else throw new Error('Unknown import option');
  }
  if (apply && dry) throw new Error('Contradictory apply and dry-run flags');
  if (!values.has('--backup') || !values.has('--storage'))
    throw new Error('Required: --backup PATH --storage PATH [--dry-run | --apply]');
  return {
    backup: values.get('--backup')!,
    storage: values.get('--storage')!,
    apply,
    resolveUsernames,
  };
}
