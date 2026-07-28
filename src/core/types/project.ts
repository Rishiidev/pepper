export interface PepperProject {
  id: string;
  name: string;
  color: string;
  icon: string;
  description?: string;
  sessionCount: number;
  lastActive: number;
}

export const DEFAULT_PROJECTS: PepperProject[] = [
  {
    id: 'proj_bunchshop',
    name: '🛒 BunchShop',
    color: '#3B82F6',
    icon: 'ShoppingCart',
    description: 'Shopify checkout optimization & e-commerce research',
    sessionCount: 0,
    lastActive: Date.now(),
  },
  {
    id: 'proj_bruuhh',
    name: '🚀 Bruuhh Studios',
    color: '#8B5CF6',
    icon: 'Rocket',
    description: 'Design system, marketing & studio branding',
    sessionCount: 0,
    lastActive: Date.now(),
  },
  {
    id: 'proj_research',
    name: '📚 Research',
    color: '#10B981',
    icon: 'BookOpen',
    description: 'Technical docs, articles & competitive analysis',
    sessionCount: 0,
    lastActive: Date.now(),
  },
  {
    id: 'proj_finance',
    name: '💰 Finance',
    color: '#F59E0B',
    icon: 'DollarSign',
    description: 'Invoices, analytics & Stripe dashboard',
    sessionCount: 0,
    lastActive: Date.now(),
  },
];
