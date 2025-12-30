import React from 'react';
import { Check, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PLAN_COMPARISON } from '@/constants/features';
import { PLANS } from '@/constants/plans';

interface PlanComparisonProps {
  currency?: 'USD'; // USD only globally
}

export function PlanComparison({ currency }: PlanComparisonProps) {
  // USD only globally - no filtering needed
  const filteredComparison = PLAN_COMPARISON;

  const renderValue = (value: string | boolean) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="h-5 w-5 text-green-500 mx-auto" />
      ) : (
        <X className="h-5 w-5 text-muted-foreground/50 mx-auto" />
      );
    }
    return value;
  };

  return (
    <Card className="overflow-hidden rounded-2xl border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left p-4 text-foreground font-semibold min-w-[150px]">
                Feature
              </th>
              {PLANS.map((plan) => (
                <th
                  key={plan.id}
                  className="text-center p-4 text-foreground font-semibold min-w-[100px] table-cell-bg"
                  style={{ '--cell-bg': `${plan.color}05` } as React.CSSProperties}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="dynamic-color" style={{ '--dynamic-color': plan.color } as React.CSSProperties}>{plan.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {plan.nameHindi}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredComparison.map((row, index) => (
              <tr key={index} className="border-b border-border/30 last:border-0">
                <td className="p-4 text-foreground text-sm">{row.feature}</td>
                {['aarambh', 'raksha', 'suraksha', 'vajra', 'chakra'].map((planId) => {
                  const plan = PLANS.find((p) => p.id === planId);
                  const value = row[planId as keyof typeof row];
                  return (
                    <td
                      key={planId}
                      className="p-4 text-center text-sm table-cell-bg"
                      style={{ '--cell-bg': plan ? `${plan.color}05` : 'transparent' } as React.CSSProperties}
                    >
                      {typeof value === 'boolean' ? (
                        renderValue(value)
                      ) : (
                        <span
                          className={
                            plan?.recommended
                              ? 'font-semibold text-purple-600 dark:text-purple-400'
                              : 'text-foreground'
                          }
                        >
                          {value}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
