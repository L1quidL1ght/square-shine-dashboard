
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MetricCard } from '@/components/MetricCard';
import { TeamMemberRanking } from '@/components/TeamMemberRanking';
import { TopItemsChart } from '@/components/TopItemsChart';
import { DatePresetSelector } from '@/components/DatePresetSelector';
import { Download } from 'lucide-react';
import { subDays, format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { 
  useLocations, 
  useTeamMembers, 
  usePerformanceMetrics,
  useGeneratePerformanceMetrics 
} from '@/hooks/useSquareData';

const Dashboard = () => {
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedTeamMember, setSelectedTeamMember] = useState<string>('all');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [shouldFetchMetrics, setShouldFetchMetrics] = useState(false);
  const { toast } = useToast();

  // React Query hooks
  const { data: locations = [], isLoading: locationsLoading, error: locationsError } = useLocations();
  const { data: teamMembers = [], isLoading: teamMembersLoading, error: teamMembersError } = useTeamMembers();
  
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  const teamMemberId = selectedTeamMember === 'all' ? undefined : selectedTeamMember;
  
  const { 
    data: metrics, 
    isLoading: metricsLoading, 
    error: metricsError,
    isFetching: metricsFetching
  } = usePerformanceMetrics(
    startDateObj,
    endDateObj,
    teamMemberId,
    shouldFetchMetrics
  );

  const generateMetricsMutation = useGeneratePerformanceMetrics();

  // Handle initial loading state
  const isInitialLoading = locationsLoading || teamMembersLoading;

  // Handle errors
  React.useEffect(() => {
    if (locationsError) {
      console.error('Failed to load locations:', locationsError);
      toast({
        title: "Square API Error",
        description: "Failed to load Square locations - check API credentials",
        variant: "destructive",
      });
    }
    
    if (teamMembersError) {
      console.error('Failed to load team members:', teamMembersError);
      toast({
        title: "Team Members Error",
        description: "Failed to load team members - report generation will still work",
        variant: "destructive",
      });
    }
    
    if (metricsError) {
      console.error('Failed to load performance metrics:', metricsError);
      toast({
        title: "Sales Data Error",
        description: "Failed to load sales data - check date range and Square permissions",
        variant: "destructive",
      });
    }
  }, [locationsError, teamMembersError, metricsError, toast]);

  // Auto-select location if only one available
  React.useEffect(() => {
    if (!locationsLoading && locations.length === 1 && !selectedLocation) {
      setSelectedLocation(locations[0].id);
    }
  }, [locations, locationsLoading, selectedLocation]);

  // Show info toast for empty team members
  React.useEffect(() => {
    if (!teamMembersLoading && teamMembers.length === 0 && locations.length > 0) {
      toast({
        title: "Info",
        description: "No team members found. This is normal if you don't use Square's team member feature.",
      });
    }
  }, [teamMembers.length, teamMembersLoading, locations.length, toast]);

  const handleGenerateReport = async () => {
    setShouldFetchMetrics(true);
    
    try {
      await generateMetricsMutation.mutateAsync({
        startDate: startDateObj,
        endDate: endDateObj,
        teamMemberId
      });
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

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

  // Reset metrics fetch flag when filters change
  React.useEffect(() => {
    setShouldFetchMetrics(false);
  }, [selectedLocation, selectedTeamMember, startDate, endDate]);

  const isLoading = generateMetricsMutation.isPending || metricsFetching;
  const canGenerateReport = selectedLocation && startDate && endDate;

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden">
      <div className="space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Performance Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Track team member performance and sales metrics</p>
          </div>
          <Button onClick={handleExport} disabled={!metrics} variant="outline" size="lg" className="w-full sm:w-auto h-12 text-sm px-6">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>

        {/* Filters */}
        <Card className="shadow-md border-0 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-foreground">Filters</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Select location, team member and date range to view performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Location</label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger className="h-10 text-sm w-full">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Team Member</label>
                <Select value={selectedTeamMember} onValueChange={setSelectedTeamMember}>
                  <SelectTrigger className="h-10 text-sm w-full">
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
              
              <DatePresetSelector
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
              />
              
              <div className="flex items-end sm:col-span-2 lg:col-span-1">
                <Button 
                  onClick={handleGenerateReport} 
                  disabled={isLoading || isInitialLoading || !canGenerateReport} 
                  size="lg" 
                  className="h-10 text-sm px-6 w-full"
                >
                  {isLoading ? 'Generating...' : 'Generate Report'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metrics Cards */}
        {isInitialLoading ? (
          <div className="text-center text-lg text-muted-foreground py-12">
            Loading locations and team members...
          </div>
        ) : isLoading ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse shadow-md border-0 bg-card/50 backdrop-blur-sm h-32">
                <CardContent className="p-6">
                  <div className="h-6 bg-muted rounded mb-3"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : metrics ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <MetricCard
              title="Net Sales"
              value={`$${metrics.netSales.toFixed(2)}`}
            />
            <MetricCard
              title="Cover Count"
              value={metrics.coverCount.toString()}
            />
            <MetricCard
              title="Desserts Sold"
              value={metrics.dessertsSold?.toString() || '0'}
            />
            <MetricCard
              title="Beer Sold"
              value={metrics.beerSold?.toString() || '0'}
            />
            <MetricCard
              title="Cocktails Sold"
              value={metrics.cocktailsSold?.toString() || '0'}
            />
            <MetricCard
              title="Avg Order Value"
              value={`$${metrics.averageOrderValue?.toFixed(2) || '0.00'}`}
            />
          </div>
        ) : (
          <Card className="shadow-md border-0 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              {locations.length === 0 
                ? "⚠️ No Square locations found! Check your API credentials and permissions."
                : !selectedLocation
                ? "Select a location to continue"
                : teamMembers.length === 0 && locations.length > 0 
                ? "No team members found. Select dates and click 'Generate Report' to view performance metrics."
                : "Select filters and click 'Generate Report' to view performance metrics"
              }
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        {metrics && (
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <TeamMemberRanking data={metrics.teamMemberSales || []} />
            <TopItemsChart data={metrics.topItems} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
