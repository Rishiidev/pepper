export interface ComparisonRow {
  capability: string;
  tabGroups: string;
  pepper: string;
  pepperHighlight?: boolean;
}

export const COMPARISON_DATA: ComparisonRow[] = [
  {
    capability: 'Organize tabs',
    tabGroups: 'Yes',
    pepper: 'Yes',
  },
  {
    capability: 'Save work as a workspace',
    tabGroups: 'Limited',
    pepper: 'Yes',
    pepperHighlight: true,
  },
  {
    capability: 'Close saved tabs',
    tabGroups: 'Manual',
    pepper: 'Yes',
    pepperHighlight: true,
  },
  {
    capability: 'Reduce active tab clutter',
    tabGroups: 'Partial',
    pepper: 'Yes',
    pepperHighlight: true,
  },
  {
    capability: 'Restore a full workspace',
    tabGroups: 'Limited',
    pepper: 'Yes',
    pepperHighlight: true,
  },
  {
    capability: 'Restore individual tabs',
    tabGroups: 'No',
    pepper: 'Yes',
    pepperHighlight: true,
  },
  {
    capability: 'Search saved work',
    tabGroups: 'No',
    pepper: 'Yes',
    pepperHighlight: true,
  },
  {
    capability: 'Local-first storage',
    tabGroups: '—',
    pepper: 'Yes',
  },
];
