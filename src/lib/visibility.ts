export function placeholdersAllowed(env: NodeJS.ProcessEnv = process.env) {
  return env.NODE_ENV !== 'production' || env.ALLOW_PLACEHOLDERS === 'true';
}

export function isPubliclyVisible(
  row: { published: boolean; isPlaceholder: boolean },
  env: NodeJS.ProcessEnv = process.env,
) {
  return row.published && (placeholdersAllowed(env) || !row.isPlaceholder);
}

export function isSettingsVisible(
  row: { isPlaceholder: boolean } | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
) {
  return Boolean(row && (placeholdersAllowed(env) || !row.isPlaceholder));
}
