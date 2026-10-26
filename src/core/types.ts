export interface Bookmark {
  id: string;
  title: string;
  url: string;
  addedAt?: number;      // unix ms, from Chrome's dateAdded
  folderPath?: string[]; // folder names, root-first, starting with the browser's (bookmarks bar…)
}

export interface BookmarkDocument {
  bookmarks: Bookmark[];
}
