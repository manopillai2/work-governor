import IdeThemePreview from "../_ideTheme";

export default function DraculaPreview() {
  return (
    <IdeThemePreview
      title="Dracula"
      colors={{
        bg: "#282a36",
        sidebarBg: "#21222c",
        activityBarBg: "#191a21",
        border: "#191a21",
        text: "#f8f8f2",
        textMuted: "#f8f8f2cc",
        textDim: "#6272a4",
        tabActiveBg: "#44475a",
        keyword: "#ff79c6",
        identifier: "#8be9fd",
        string: "#f1fa8c",
        comment: "#6272a4",
        statusCompleted: "#50fa7b",
        statusInProgress: "#f1fa8c",
        statusNotStarted: "#6272a4",
        statusNeedsAttention: "#ff5555",
        statusBarBg: "#bd93f9",
        chatUserBg: "#44475a",
      }}
    />
  );
}
