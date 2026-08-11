import IdeThemePreview from "../_ideTheme";

export default function SolarizedDarkPreview() {
  return (
    <IdeThemePreview
      title="Solarized Dark"
      colors={{
        bg: "#002b36",
        sidebarBg: "#073642",
        activityBarBg: "#00212b",
        border: "#0a4a5a",
        text: "#93a1a1",
        textMuted: "#93a1a1cc",
        textDim: "#586e75",
        tabActiveBg: "#0a4a5a",
        keyword: "#6c71c4",
        identifier: "#268bd2",
        string: "#b58900",
        comment: "#586e75",
        statusCompleted: "#859900",
        statusInProgress: "#b58900",
        statusNotStarted: "#586e75",
        statusNeedsAttention: "#dc322f",
        statusBarBg: "#2aa198",
        chatUserBg: "#0a4a5a",
      }}
    />
  );
}
