import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { MetricCard } from '@/components/MetricCard';
import { PerformanceChart } from '@/components/PerformanceChart';
import { TopItemsChart } from '@/components/TopItemsChart';
import { Download } from 'lucide-react';
import { subDays } from 'date-fns';
import { squareApi } from '@/services/squareApi';
import { TeamMember, PerformanceMetrics } from '@/types/square';
import { useToast } from '@/hooks/use-toast';

const Dashboard = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedTeamMember, setSelectedTeamMember] = useState<string>('all');
  const [startDate] = useState(subDays(new Date(), 7));
  const [endDate] = useState(new Date());
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadTeamMembers = async () => {
    try {
      const members = await squareApi.getTeamMembers();
      setTeamMembers(members);
    } catch (error) {
      console.error('Failed to load team members:', error);
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
      const teamMemberId = selectedTeamMember === 'all' ? undefined : selectedTeamMember;
      const orders = await squareApi.getOrdersForPeriod(
        startDate,
        endDate,
        teamMemberId
      );
      
      const calculatedMetrics = squareApi.calculatePerformanceMetrics(
        orders,
        startDate,
        endDate
      );
      
      setMetrics(calculatedMetrics);
    } catch (error) {
      console.error('Failed to load metrics:', error);
      toast({
        title: "Error",
        description: "Failed to load performance metrics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeamMembers();
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [selectedTeamMember, startDate, endDate]);

  const handleExport = () => {
    if (!metrics) return;

    const exportData = {
      teamMember: selectedTeamMember === 'all' ? 'All Team Members' : 
        teamMembers.find(tm => tm.id === selectedTeamMember)?.given_name || 'Unknown',
      dateRange: {
        from: startDate.toISOString(),
        to: endDate.toISOString()
      },
      metrics
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `performance-report-${new Date().toISOString().split('T')[0]}.json`;
    
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
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Performance Dashboard</h2>
          <p className="text-muted-foreground">
            Track team member performance and sales metrics
          </p>
        </div>
        <Button onClick={handleExport} disabled={!metrics} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Select team member to view performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Team Member</label>
            <Select value={selectedTeamMember} onValueChange={setSelectedTeamMember}>
              <SelectTrigger>
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
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : metrics ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Net Sales"
            value={`$${metrics.netSales.toFixed(2)}`}
          />
          <MetricCard
            title="Cover Count"
            value={metrics.coverCount.toString()}
          />
          <MetricCard
            title="PPA"
            value={`$${metrics.ppa.toFixed(2)}`}
          />
          <MetricCard
            title="Sales/Hour"
            value={`$${metrics.salesPerHour.toFixed(2)}`}
          />
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Loading performance metrics...
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      {metrics && (
        <div className="grid gap-6 md:grid-cols-2">
          <PerformanceChart data={metrics.dailyPerformance} />
          <TopItemsChart data={metrics.topItems} />
        </div>
      )}
    </div>
  );
};

export default Dashboard;