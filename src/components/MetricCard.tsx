
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
      "relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-fade-in",
      "bg-gradient-to-br from-background to-background/80 backdrop-blur-sm",
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {icon && (
                <div className="p-2 rounded-xl bg-primary/10 ring-1 ring-primary/20">
                  {icon}
                </div>
              )}
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                {title}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-foreground">{value}</p>
              {change !== undefined && (
                <div className="flex items-center gap-1">
                  {hasIncrease && (
                    <>
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-metric-increase/10 text-metric-increase">
                        <TrendingUp className="h-3 w-3" />
                        <span className="text-sm font-semibold">
                          +{Math.abs(change).toFixed(1)}%
                        </span>
                      </div>
                    </>
                  )}
                  {hasDecrease && (
                    <>
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-metric-decrease/10 text-metric-decrease">
                        <TrendingDown className="h-3 w-3" />
                        <span className="text-sm font-semibold">
                          -{Math.abs(change).toFixed(1)}%
                        </span>
                      </div>
                    </>
                  )}
                  <span className="text-xs text-muted-foreground ml-1">vs last period</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Decorative gradient overlay */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/5 to-transparent rounded-full -translate-y-16 translate-x-16" />
      </CardContent>
    </Card>
  );
}
