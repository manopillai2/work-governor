import IdeThemePreview from "../_ideTheme";

export default function NordPreview() {
  return (
    <IdeThemePreview
      title="Nord"
      colors={{
        bg: "#2e3440",
        sidebarBg: "#3b4252",
        activityBarBg: "#272c36",
        border: "#4c566a",
        text: "#e5e9f0",
        textMuted: "#e5e9f0cc",
        textDim: "#7b88a1",
        tabActiveBg: "#434c5e",
        keyword: "#b48ead",
        identifier: "#88c0d0",
        string: "#a3be8c",
        comment: "#7b88a1",
        statusCompleted: "#a3be8c",
        statusInProgress: "#ebcb8b",
        statusNotStarted: "#7b88a1",
        statusNeedsAttention: "#bf616a",
        statusBarBg: "#5e81ac",
        chatUserBg: "#434c5e",
      }}
    />
  );
}
