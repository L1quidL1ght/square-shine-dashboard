import { useState, useEffect } from "react";
import { DollarSign, Users, Calculator, Clock, Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { MetricCard } from "@/components/MetricCard";
import { PerformanceChart } from "@/components/PerformanceChart";
import { TopItemsChart } from "@/components/TopItemsChart";
import { squareApi } from "@/services/squareApi";
import { TeamMember, PerformanceMetrics } from "@/types/square";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedTeamMember, setSelectedTeamMember] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() - 7)));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadTeamMembers = async () => {
    try {
      const members = await squareApi.getTeamMembers();
      setTeamMembers(members);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load team members",
        variant: "destructive",
      });
    }
  };

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const teamMemberId = selectedTeamMember === "all" ? undefined : selectedTeamMember;
      const orders = await squareApi.getOrdersForPeriod(startDate, endDate, teamMemberId);
      const performanceMetrics = squareApi.calculatePerformanceMetrics(orders, startDate, endDate);
      setMetrics(performanceMetrics);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load performance data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeamMembers();
    loadMetrics();
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [selectedTeamMember, startDate, endDate]);

  const handleExport = () => {
    if (!metrics) return;

    const exportData = {
      period: `${startDate.toDateString()} to ${endDate.toDateString()}`,
      teamMember: selectedTeamMember === "all" ? "All Team Members" : 
        teamMembers.find(m => m.id === selectedTeamMember)?.given_name + " " + 
        teamMembers.find(m => m.id === selectedTeamMember)?.family_name,
      metrics: {
        netSales: metrics.netSales,
        coverCount: metrics.coverCount,
        ppa: metrics.ppa,
        salesPerHour: metrics.salesPerHour,
      },
      dailyPerformance: metrics.dailyPerformance,
      topItems: metrics.topItems,
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `restaurant-performance-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    toast({
      title: "Success",
      description: "Performance report exported successfully",
    });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            Performance Dashboard
          </h1>
          <p className="text-lg text-muted-foreground">
            Monitor team member performance and restaurant metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="lg"
            className="shadow-sm hover:shadow-md transition-all duration-200"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={!metrics}
            size="lg"
            className="shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-primary to-primary/90"
          >
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card/50 backdrop-blur-sm border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap gap-6">
          <div className="space-y-2 min-w-[200px]">
            <label className="text-sm font-semibold text-foreground">Team Member</label>
            <Select value={selectedTeamMember} onValueChange={setSelectedTeamMember}>
              <SelectTrigger className="h-11 border-2 focus:border-primary/50 transition-colors">
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent className="bg-background/95 backdrop-blur-sm">
                <SelectItem value="all">All Team Members</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.given_name} {member.family_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Start Date</label>
            <DatePicker
              date={startDate}
              onDateChange={(date) => date && setStartDate(date)}
              placeholder="Select start date"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">End Date</label>
            <DatePicker
              date={endDate}
              onDateChange={(date) => date && setEndDate(date)}
              placeholder="Select end date"
            />
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 bg-muted/50 animate-pulse rounded-2xl shadow-sm" />
          ))}
        </div>
      ) : metrics ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Net Sales"
            value={`$${metrics.netSales.toFixed(2)}`}
            change={12.5}
            icon={<DollarSign className="h-5 w-5 text-chart-green" />}
          />
          <MetricCard
            title="Cover Count"
            value={metrics.coverCount}
            change={8.2}
            icon={<Users className="h-5 w-5 text-chart-blue" />}
          />
          <MetricCard
            title="PPA (Per Person Average)"
            value={`$${metrics.ppa.toFixed(2)}`}
            change={5.1}
            icon={<Calculator className="h-5 w-5 text-chart-orange" />}
          />
          <MetricCard
            title="Sales per Hour"
            value={`$${metrics.salesPerHour.toFixed(2)}`}
            change={-2.3}
            icon={<Clock className="h-5 w-5 text-chart-purple" />}
          />
        </div>
      ) : null}

      {/* Charts */}
      {metrics && (
        <div className="grid gap-8 lg:grid-cols-2">
          <PerformanceChart data={metrics.dailyPerformance} />
          <TopItemsChart data={metrics.topItems} />
        </div>
      )}
    </div>
  );
}
