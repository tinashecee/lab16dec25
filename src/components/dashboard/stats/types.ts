import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  label: string;
  value: string;
  subtext: string;
  icon: LucideIcon;
  change: string;
  color: string;
  trend: 'up' | 'down';
} 