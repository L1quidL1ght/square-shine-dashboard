import { useState, useEffect } from "react";
import { DollarSign, Users, Calculator, Clock, Download } from "lucide-react";
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

  useEffect(() => {
    loadTeamMembers();
    loadMetrics();
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [selectedTeamMember, startDate, endDate]);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor team member performance and restaurant metrics
          </p>
        </div>
        <Button onClick={handleExport} disabled={!metrics}>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-card rounded-lg border">
        <div className="space-y-2">
          <label className="text-sm font-medium">Team Member</label>
          <Select value={selectedTeamMember} onValueChange={setSelectedTeamMember}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select team member" />
            </SelectTrigger>
            <SelectContent>
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
          <label className="text-sm font-medium">Start Date</label>
          <DatePicker
            date={startDate}
            onDateChange={(date) => date && setStartDate(date)}
            placeholder="Select start date"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">End Date</label>
          <DatePicker
            date={endDate}
            onDateChange={(date) => date && setEndDate(date)}
            placeholder="Select end date"
          />
        </div>
      </div>

      {/* Metrics Cards */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : metrics ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Net Sales"
            value={`$${metrics.netSales.toFixed(2)}`}
            change={12.5}
            icon={<DollarSign className="h-6 w-6 text-primary" />}
            className="bg-gradient-to-br from-primary/10 to-primary/5"
          />
          <MetricCard
            title="Cover Count"
            value={metrics.coverCount}
            change={8.2}
            icon={<Users className="h-6 w-6 text-chart-green" />}
            className="bg-gradient-to-br from-chart-green/10 to-chart-green/5"
          />
          <MetricCard
            title="PPA (Per Person Average)"
            value={`$${metrics.ppa.toFixed(2)}`}
            change={5.1}
            icon={<Calculator className="h-6 w-6 text-chart-orange" />}
            className="bg-gradient-to-br from-chart-orange/10 to-chart-orange/5"
          />
          <MetricCard
            title="Sales per Hour"
            value={`$${metrics.salesPerHour.toFixed(2)}`}
            change={-2.3}
            icon={<Clock className="h-6 w-6 text-chart-purple" />}
            className="bg-gradient-to-br from-chart-purple/10 to-chart-purple/5"
          />
        </div>
      ) : null}

      {/* Charts */}
      {metrics && (
        <div className="grid gap-6 md:grid-cols-2">
          <PerformanceChart data={metrics.dailyPerformance} />
          <TopItemsChart data={metrics.topItems} />
        </div>
      )}
    </div>
  );
}