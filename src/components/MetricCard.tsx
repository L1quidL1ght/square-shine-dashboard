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
    <Card className={cn(
      "relative overflow-hidden border shadow-sm hover:shadow-md transition-all duration-200",
      "bg-background",
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <p className="text-xl font-bold text-foreground">{value}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1">
                {hasIncrease && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-metric-increase/10 text-metric-increase">
                    <TrendingUp className="h-2.5 w-2.5" />
                    <span className="text-xs font-medium">
                      +{Math.abs(change).toFixed(1)}%
                    </span>
                  </div>
                )}
                {hasDecrease && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-metric-decrease/10 text-metric-decrease">
                    <TrendingDown className="h-2.5 w-2.5" />
                    <span className="text-xs font-medium">
                      -{Math.abs(change).toFixed(1)}%
                    </span>
                  </div>
                )}
                <span className="text-xs text-muted-foreground ml-1">vs last period</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}