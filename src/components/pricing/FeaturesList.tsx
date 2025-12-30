import React from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Lock,
  FileCheck,
  BarChart3,
  FileText,
  Award,
  Cpu,
  Globe,
  Gauge,
  ShieldOff,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { type Feature } from '@/constants/features';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield,
  Lock,
  FileCheck,
  BarChart3,
  FileText,
  Award,
  Cpu,
  Globe,
  Gauge,
  ShieldOff,
};

interface FeaturesListProps {
  features: Feature[];
}

export function FeaturesList({ features }: FeaturesListProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {features.map((feature, index) => {
        const Icon = ICON_MAP[feature.icon] || Shield;
        return (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="p-4 h-full bg-card/50 border-border/50 hover:border-primary/30 transition-colors">
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-sm font-medium text-foreground mb-1">{feature.title}</h3>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
