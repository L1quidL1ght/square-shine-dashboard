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
  return (
    <Card className={cn(
      "border-0 shadow-md bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 animate-scale-in",
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-3">
          <div className="text-sm font-medium text-muted-foreground">
            {title}
          </div>
          {icon && (
            <div className="h-5 w-5 text-muted-foreground">
              {icon}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <div className="text-3xl font-bold text-foreground">
            {value}
          </div>
          {change !== undefined && (
            <div className="flex items-center space-x-1">
              {change > 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : change < 0 ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : null}
              <span className={cn(
                "text-sm font-medium",
                change > 0 ? "text-emerald-500" : change < 0 ? "text-red-500" : "text-muted-foreground"
              )}>
                {change > 0 ? '+' : ''}{change}%
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}