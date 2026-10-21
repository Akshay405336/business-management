export type CatalogOption = {
  readonly id: string;
  readonly label: string;
  readonly category: string;
};

export type CatalogOptionGroup = {
  readonly category: string;
  readonly options: readonly CatalogOption[];
};

export type CatalogSelection = {
  readonly id: string;
  readonly label: string;
  readonly category?: string;
  readonly custom?: boolean;
};
