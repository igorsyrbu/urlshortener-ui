/** `{content, page: {...}}`: the shape `GET /shortlinks` answers (Spring Data's `PagedModel`). */
export interface PagedModel<T> {
  content: T[];
  page: PageMetadata;
}

export interface PageMetadata {
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}

/** Flat pagination fields next to `content`: the shape `GET /tags` answers (Spring Data's `Page`). */
export interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}
