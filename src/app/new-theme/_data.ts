// Shared mock data for the /new-theme design previews. Not real data.

export type MockControl = {
  code: string;
  title: string;
  status: "Not Started" | "In Progress" | "Completed" | "Needs Attention";
};

export type MockApplication = {
  name: string;
  framework: string;
  controls: number;
  completed: number;
  needsAttention: number;
  owner: string;
  updated: string;
  controlList: MockControl[];
};

export const APPLICATIONS: MockApplication[] = [
  {
    name: "Payment Gateway Service",
    framework: "SOX",
    controls: 14,
    completed: 9,
    needsAttention: 1,
    owner: "M. Pillai",
    updated: "2h ago",
    controlList: [
      {
        code: "CC-04.02",
        title: "Access reviews are performed quarterly for production systems",
        status: "In Progress",
      },
      {
        code: "CC-06.01",
        title: "Encryption at rest is enabled for all data stores",
        status: "Completed",
      },
      {
        code: "CC-07.03",
        title: "Change requests require documented approval before deploy",
        status: "Not Started",
      },
    ],
  },
  {
    name: "Customer Data Platform",
    framework: "PCI DSS",
    controls: 21,
    completed: 6,
    needsAttention: 3,
    owner: "R. Chen",
    updated: "1d ago",
    controlList: [],
  },
  {
    name: "Internal Reporting Suite",
    framework: "SOX",
    controls: 8,
    completed: 8,
    needsAttention: 0,
    owner: "M. Pillai",
    updated: "5d ago",
    controlList: [],
  },
];

export const CHAT_MESSAGES = [
  {
    from: "ai" as const,
    text: "Ask me to update evidence, regenerate a checklist, or explain a control.",
  },
  {
    from: "user" as const,
    text: "What's blocking Payment Gateway Service?",
  },
  {
    from: "ai" as const,
    text: "One control needs attention: CC-04.02 (access reviews) is still in progress.",
  },
];
