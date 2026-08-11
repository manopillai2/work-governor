export function splitApplicationName(
  name: string
): { appName: string; context: string | null } {
  const [appName, ...rest] = name.split(" - ");
  return {
    appName: appName.trim(),
    context: rest.length
      ? rest.join(" - ").trim()
      : null,
  };
}
