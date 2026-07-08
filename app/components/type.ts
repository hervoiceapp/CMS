// types.ts (or directly in your component file)
export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface NavSection {
  category: string;
  items: NavItem[];
}
