export interface Bookmark {
  id: string;
  title: string;
  url: string;
  addedAt?: number; // unix ms, from ADD_DATE attribute
  tags?: string[];  // from TAGS attribute
}
