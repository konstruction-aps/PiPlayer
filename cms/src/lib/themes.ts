export type Theme = {
  id: string;
  name: string;
  backgroundColor: string;
  preview: string;
  elements: Array<{
    type: "text" | "image";
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
    content?: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    textAlign?: string;
  }>;
};

export const THEMES: Theme[] = [
  {
    id: "blank",
    name: "Blank",
    backgroundColor: "#111827",
    preview: "linear-gradient(160deg,#111827,#1f2937)",
    elements: [],
  },
  {
    id: "welcome",
    name: "Welcome",
    backgroundColor: "#10241C",
    preview: "linear-gradient(160deg,#10241C,#1a3a2e)",
    elements: [
      {
        type: "text",
        x: 160,
        y: 340,
        width: 1600,
        height: 140,
        zIndex: 2,
        content: "Welcome",
        fontFamily: "Georgia, serif",
        fontSize: 120,
        fontWeight: "700",
        color: "#F4F0E6",
        textAlign: "center",
      },
      {
        type: "text",
        x: 280,
        y: 520,
        width: 1360,
        height: 80,
        zIndex: 2,
        content: "Add your message here",
        fontFamily: "Helvetica Neue, Arial, sans-serif",
        fontSize: 40,
        fontWeight: "400",
        color: "#B7C7BE",
        textAlign: "center",
      },
    ],
  },
  {
    id: "poster",
    name: "Poster",
    backgroundColor: "#1A120B",
    preview: "linear-gradient(160deg,#1A120B,#3b2416)",
    elements: [
      {
        type: "text",
        x: 120,
        y: 160,
        width: 1680,
        height: 100,
        zIndex: 2,
        content: "TODAY",
        fontFamily: "Impact, Haettenschweiler, sans-serif",
        fontSize: 72,
        fontWeight: "700",
        color: "#F5A623",
        textAlign: "left",
      },
      {
        type: "text",
        x: 120,
        y: 280,
        width: 1680,
        height: 220,
        zIndex: 2,
        content: "Big headline goes here",
        fontFamily: "Georgia, serif",
        fontSize: 96,
        fontWeight: "700",
        color: "#FFF8EE",
        textAlign: "left",
      },
      {
        type: "text",
        x: 120,
        y: 860,
        width: 1680,
        height: 80,
        zIndex: 2,
        content: "A short line of supporting text",
        fontFamily: "Helvetica Neue, Arial, sans-serif",
        fontSize: 36,
        fontWeight: "400",
        color: "#D9C4A5",
        textAlign: "left",
      },
    ],
  },
  {
    id: "menu",
    name: "Menu board",
    backgroundColor: "#F7F1E5",
    preview: "linear-gradient(160deg,#F7F1E5,#e8dcc8)",
    elements: [
      {
        type: "text",
        x: 160,
        y: 120,
        width: 1600,
        height: 100,
        zIndex: 2,
        content: "Menu",
        fontFamily: "Georgia, serif",
        fontSize: 80,
        fontWeight: "700",
        color: "#2A1F14",
        textAlign: "center",
      },
      {
        type: "text",
        x: 280,
        y: 320,
        width: 1360,
        height: 480,
        zIndex: 2,
        content: "Item one .............. 12\nItem two .............. 15\nItem three ............ 18",
        fontFamily: "Courier New, monospace",
        fontSize: 44,
        fontWeight: "400",
        color: "#3D2E20",
        textAlign: "left",
      },
    ],
  },
  {
    id: "photo",
    name: "Photo frame",
    backgroundColor: "#0A0A0A",
    preview: "linear-gradient(160deg,#0A0A0A,#222)",
    elements: [
      {
        type: "text",
        x: 160,
        y: 900,
        width: 1600,
        height: 80,
        zIndex: 3,
        content: "Caption your photo",
        fontFamily: "Helvetica Neue, Arial, sans-serif",
        fontSize: 36,
        fontWeight: "500",
        color: "#FFFFFF",
        textAlign: "center",
      },
    ],
  },
];
