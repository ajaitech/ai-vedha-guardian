import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, Shield, Plus, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

 
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  variant?: 'default' | 'card' | 'minimal';
}

/**
 * EmptyState - Consistent empty state component for when there's no data to display
 * Use this across the application for consistent UX
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  variant = 'default'
}: EmptyStateProps) {
  const containerClasses = cn(
    'text-center py-12 px-6',
    variant === 'card' && 'bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50',
    variant === 'minimal' && 'py-8',
    className
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={containerClasses}
    >
      {/* Animated Icon Container */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
        className="relative mx-auto mb-6 w-20 h-20"
      >
        {/* Background glow */}
        <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl" />
        {/* Icon circle */}
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center">
          <Icon className="h-10 w-10 text-primary/70" aria-hidden="true" />
        </div>
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-xl font-bold text-foreground mb-2"
      >
        {title}
      </motion.h3>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-muted-foreground max-w-sm mx-auto mb-6"
      >
        {description}
      </motion.p>

      {/* Actions */}
      {(action || secondaryAction) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          {action && (
            <Button
              onClick={action.onClick}
              className="bg-gradient-to-r from-primary to-accent text-white hover:opacity-90 transition-opacity"
            >
              {action.icon && <action.icon className="h-4 w-4 mr-2" aria-hidden="true" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="outline"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * NoAuditsState - Specialized empty state for audit history
 */
export function NoAuditsState({ onStartAudit }: { onStartAudit: () => void }) {
  return (
    <EmptyState
      icon={Shield}
      title="No Security Audits Yet"
      description="Start your first security audit to discover vulnerabilities and get actionable recommendations to improve your website's security."
      action={{
        label: 'Start Your First Audit',
        onClick: onStartAudit,
        icon: Plus
      }}
      variant="card"
    />
  );
}

/**
 * NoDataState - Generic no data state
 */
export function NoDataState({
  title = "No Data Available",
  description = "There's no data to display at the moment."
}: {
  title?: string;
  description?: string;
}) {
  return (
    <EmptyState
      icon={FileQuestion}
      title={title}
      description={description}
      variant="minimal"
    />
  );
}
