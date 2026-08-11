import IdeThemePreview from "../_ideTheme";

export default function GithubDarkPreview() {
  return (
    <IdeThemePreview
      title="GitHub Dark"
      colors={{
        bg: "#0d1117",
        sidebarBg: "#161b22",
        activityBarBg: "#010409",
        border: "#30363d",
        text: "#c9d1d9",
        textMuted: "#c9d1d9cc",
        textDim: "#8b949e",
        tabActiveBg: "#21262d",
        keyword: "#ff7b72",
        identifier: "#79c0ff",
        string: "#a5d6ff",
        comment: "#8b949e",
        statusCompleted: "#3fb950",
        statusInProgress: "#d29922",
        statusNotStarted: "#8b949e",
        statusNeedsAttention: "#f85149",
        statusBarBg: "#1f6feb",
        chatUserBg: "#21262d",
      }}
    />
  );
}
