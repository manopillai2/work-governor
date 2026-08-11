import IdeThemePreview from "../_ideTheme";

export default function MonokaiPreview() {
  return (
    <IdeThemePreview
      title="Monokai"
      colors={{
        bg: "#272822",
        sidebarBg: "#1e1f1c",
        activityBarBg: "#161715",
        border: "#161715",
        text: "#f8f8f2",
        textMuted: "#f8f8f2cc",
        textDim: "#75715e",
        tabActiveBg: "#3e3d32",
        keyword: "#f92672",
        identifier: "#66d9ef",
        string: "#e6db74",
        comment: "#75715e",
        statusCompleted: "#a6e22e",
        statusInProgress: "#e6db74",
        statusNotStarted: "#75715e",
        statusNeedsAttention: "#f92672",
        statusBarBg: "#ae81ff",
        chatUserBg: "#3e3d32",
      }}
    />
  );
}
