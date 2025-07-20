import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MetricCard } from '@/components/MetricCard';
import { PerformanceChart } from '@/components/PerformanceChart';
import { TopItemsChart } from '@/components/TopItemsChart';
import { Download, Calendar } from 'lucide-react';
import { subDays, format } from 'date-fns';
import { squareApi } from '@/services/squareApi';
import { TeamMember, PerformanceMetrics } from '@/types/square';
import { useToast } from '@/hooks/use-toast';

const Dashboard = () => {
  const [locations, setLocations] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedTeamMember, setSelectedTeamMember] = useState<string>('all');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const { toast } = useToast();

  const loadInitialData = async () => {
    setLoadingInitial(true);
    try {
      // Load locations and team members in parallel
      const [locationsData, teamMembersData] = await Promise.all([
        squareApi.getLocations(),
        squareApi.getTeamMembers()
      ]);
      
      setLocations(locationsData);
      setTeamMembers(teamMembersData);
      
      if (locationsData.length > 0) {
        console.log('Available locations:', locationsData);
      }
      if (teamMembersData.length === 0) {
        toast({
          title: "Info",
          description: "No team members found. This is normal if you don't use Square's team member feature.",
        });
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
      toast({
        title: "Error",
        description: "Failed to load locations and team members",
        variant: "destructive",
      });
    } finally {
      setLoadingInitial(false);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const teamMemberId = selectedTeamMember === 'all' ? undefined : selectedTeamMember;
      const startDateTime = new Date(startDate);
      const endDateTime = new Date(endDate);
      
      // Use the new server-side performance calculation
      const calculatedMetrics = await squareApi.getPerformanceMetrics(
        startDateTime,
        endDateTime,
        teamMemberId
      );
      
      setMetrics(calculatedMetrics);
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast({
        title: "Error",
        description: "Failed to generate performance report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Remove automatic loading on filter changes - now manual with Generate Report button

  const handleExport = () => {
    if (!metrics) return;

    const exportData = {
      teamMember: selectedTeamMember === 'all' ? 'All Team Members' : 
        teamMembers.find(tm => tm.id === selectedTeamMember)?.given_name || 'Unknown',
      dateRange: {
        from: startDate,
        to: endDate
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
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">Performance Dashboard</h2>
          <p className="text-xs text-muted-foreground">Track team member performance and sales metrics</p>
        </div>
        <Button onClick={handleExport} disabled={!metrics} variant="outline" size="sm" className="h-8 text-xs">
          <Download className="mr-1 h-3 w-3" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-sm border">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-foreground">Filters</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Select team member and date range to view performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 pb-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block text-foreground">Team Member</label>
              <Select value={selectedTeamMember} onValueChange={setSelectedTeamMember}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">All Team Members</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.given_name} {member.family_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block text-foreground">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block text-foreground">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={generateReport} 
                disabled={loading || loadingInitial} 
                size="sm" 
                className="h-8 text-xs"
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      {loadingInitial ? (
        <div className="text-center text-sm text-muted-foreground py-8">
          Loading locations and team members...
        </div>
      ) : loading ? (
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse shadow-sm border h-20">
              <CardContent className="p-3">
                <div className="h-4 bg-muted rounded mb-1"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : metrics ? (
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
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
        <Card className="shadow-sm border">
          <CardContent className="p-3 text-center text-muted-foreground text-xs">
            {teamMembers.length === 0 && locations.length > 0 
              ? "No team members found. Select dates and click 'Generate Report' to view performance metrics."
              : "Select filters and click 'Generate Report' to view performance metrics"
            }
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      {metrics && (
        <div className="grid gap-3 md:grid-cols-2">
          <PerformanceChart data={metrics.dailyPerformance} />
          <TopItemsChart data={metrics.topItems} />
        </div>
      )}
    </div>
  );
};

export default Dashboard;