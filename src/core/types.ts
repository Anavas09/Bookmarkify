export interface Bookmark {
  id: string;
  title: string;
  url: string;
  addedAt?: number;      // unix ms, from ADD_DATE attribute
  tags?: string[];       // from TAGS attribute
  folderPath?: string[]; // ancestor <H3> folder names, root-first; undefined = root level
  icon?: string;         // ICON attribute — usually a data: URL (base64 PNG/SVG)
}
