import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  className?: string;
}

export function MetricCard({ title, value, change, icon, className }: MetricCardProps) {
  const hasIncrease = change !== undefined && change > 0;
  const hasDecrease = change !== undefined && change < 0;

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {change !== undefined && (
              <div className="flex items-center space-x-1">
                {hasIncrease && (
                  <>
                    <TrendingUp className="h-4 w-4 text-metric-increase" />
                    <span className="text-sm font-medium text-metric-increase">
                      +{Math.abs(change).toFixed(1)}%
                    </span>
                  </>
                )}
                {hasDecrease && (
                  <>
                    <TrendingDown className="h-4 w-4 text-metric-decrease" />
                    <span className="text-sm font-medium text-metric-decrease">
                      -{Math.abs(change).toFixed(1)}%
                    </span>
                  </>
                )}
                <span className="text-xs text-muted-foreground">vs last period</span>
              </div>
            )}
          </div>
          {icon && (
            <div className="p-3 bg-primary/10 rounded-lg">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}