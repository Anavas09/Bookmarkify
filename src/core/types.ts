export interface Bookmark {
  id: string;
  title: string;
  url: string;
  addedAt?: number;      // unix ms, from ADD_DATE attribute
  tags?: string[];       // from TAGS attribute
  folderPath?: string[]; // ancestor <H3> folder names, root-first; undefined = root level
  icon?: string;         // ICON attribute — usually a data: URL (base64 PNG/SVG)
}

export interface SpecialFolder {
  path: string[];                        // folder path, root-first
  attributes: Record<string, string>;    // preserved <H3> attrs (e.g. PERSONAL_TOOLBAR_FOLDER)
}

export interface DocumentMeta {
  rootTitle?: string;              // captured <H1> text (Chrome: "Bookmarks", Firefox: localized)
  specialFolders?: SpecialFolder[];
}

export interface BookmarkDocument {
  bookmarks: Bookmark[];
  meta: DocumentMeta;
}
