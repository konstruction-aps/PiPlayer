/** @type {LayoutElement shape used by the editor} */
export type EditorElement = {
  id: string;
  type: "text" | "image";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  content: string | null;
  fontFamily: string | null;
  fontSize: number | null;
  fontWeight: string | null;
  color: string | null;
  textAlign: string | null;
  imageUrl: string | null;
  objectFit: string | null;
};

export type EditorLayout = {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundColor: string;
  backgroundImage: string | null;
  theme: string;
  elements: EditorElement[];
};
