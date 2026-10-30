export interface Bookmark {
  id: string;
  title: string;
  url: string;
  addedAt?: number;      // unix ms, from Chrome's dateAdded
  folderPath?: string[]; // folder names, root-first, starting with the browser's (bookmarks bar…)
  folderIds?: string[];  // the ids of those same folders, in parallel: names can repeat, ids can't
  inAccount?: boolean;   // saved in the Google account, not only on this device
}

export interface BookmarkDocument {
  bookmarks: Bookmark[];
}
