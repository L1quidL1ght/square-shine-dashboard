import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MetricCard } from '@/components/MetricCard';
import { CategorySalesChart } from '@/components/CategorySalesChart';
import { TimeBasedChart } from '@/components/TimeBasedChart';
import { Download, TrendingUp, Clock, ShoppingCart } from 'lucide-react';
import { subDays, format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { 
  useLocations, 
  useRestaurantAnalytics,
  useGenerateRestaurantAnalytics
} from '@/hooks/useSquareData';

const RestaurantAnalytics = () => {
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [shouldFetchAnalytics, setShouldFetchAnalytics] = useState(false);
  const { toast } = useToast();

  // React Query hooks
  const { data: locations = [], isLoading: locationsLoading } = useLocations();
  
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  
  const { 
    data: analytics, 
    isLoading: analyticsLoading, 
    error: analyticsError,
    isFetching: analyticsFetching
  } = useRestaurantAnalytics(
    startDateObj,
    endDateObj,
    shouldFetchAnalytics
  );

  const generateAnalyticsMutation = useGenerateRestaurantAnalytics();

  // Auto-select location if only one available
  React.useEffect(() => {
    if (!locationsLoading && locations.length === 1 && !selectedLocation) {
      setSelectedLocation(locations[0].id);
    }
  }, [locations, locationsLoading, selectedLocation]);

  // Handle errors
  React.useEffect(() => {
    if (analyticsError) {
      console.error('Failed to load restaurant analytics:', analyticsError);
      toast({
        title: "Analytics Error",
        description: "Failed to load restaurant analytics - check date range and Square permissions",
        variant: "destructive",
      });
    }
  }, [analyticsError, toast]);

  const handleGenerateReport = async () => {
    setShouldFetchAnalytics(true);
    
    try {
      await generateAnalyticsMutation.mutateAsync({
        startDate: startDateObj,
        endDate: endDateObj
      });
    } catch (error) {
      console.error('Failed to generate analytics:', error);
    }
  };

  const handleExport = () => {
    if (!analytics) return;

    const exportData = {
      dateRange: {
        from: startDate,
        to: endDate
      },
      location: locations.find(l => l.id === selectedLocation)?.name || 'All Locations',
      analytics
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `restaurant-analytics-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    toast({
      title: "Success",
      description: "Restaurant analytics exported successfully",
    });
  };

  // Reset analytics fetch flag when filters change
  React.useEffect(() => {
    setShouldFetchAnalytics(false);
  }, [selectedLocation, startDate, endDate]);

  const isLoading = generateAnalyticsMutation.isPending || analyticsFetching;
  const canGenerateReport = selectedLocation && startDate && endDate;

  return (
    <div className="min-h-screen w-full bg-dashboard-bg">
      <header className="flex items-center justify-between p-4 bg-background border-b border-border">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-foreground">Restaurant Analytics</h1>
          <span className="text-sm text-muted-foreground">Square POS Integration</span>
        </div>
      </header>
      
      <main className="flex-1 overflow-auto">
        <div className="space-y-6 p-4 sm:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Restaurant Analytics</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">Comprehensive restaurant performance and category sales analysis</p>
            </div>
            <Button onClick={handleExport} disabled={!analytics} variant="outline" size="lg" className="w-full sm:w-auto h-12 text-sm px-6">
              <Download className="mr-2 h-4 w-4" />
              Export Analytics
            </Button>
          </div>

        {/* Filters */}
        <Card className="shadow-md border-0 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-foreground">Filters</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Select location and date range for restaurant analytics
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <label className="text-sm font-medium text-foreground">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
              
              <div className="flex items-end">
                <Button 
                  onClick={handleGenerateReport} 
                  disabled={isLoading || locationsLoading || !canGenerateReport} 
                  size="lg" 
                  className="h-10 text-sm px-6 w-full"
                >
                  {isLoading ? 'Generating...' : 'Generate Report'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overall Metrics */}
        {locationsLoading ? (
          <div className="text-center text-lg text-muted-foreground py-12">
            Loading locations...
          </div>
        ) : isLoading ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse shadow-md border-0 bg-card/50 backdrop-blur-sm h-32">
                <CardContent className="p-6">
                  <div className="h-6 bg-muted rounded mb-3"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : analytics ? (
          <>
            {/* Overall Restaurant Metrics */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center text-foreground">
                <TrendingUp className="mr-2 h-5 w-5" />
                Overall Performance
              </h2>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  title="Net Sales"
                  value={`$${analytics.netSales?.toFixed(2) || '0.00'}`}
                />
                <MetricCard
                  title="Total Covers"
                  value={analytics.totalCovers?.toString() || '0'}
                />
                <MetricCard
                  title="Average Order Value"
                  value={`$${analytics.averageOrderValue?.toFixed(2) || '0.00'}`}
                />
                <MetricCard
                  title="Total Transactions"
                  value={analytics.totalTransactions?.toString() || '0'}
                />
              </div>
            </div>

            {/* Time-Based Metrics */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center text-foreground">
                <Clock className="mr-2 h-5 w-5" />
                Time-Based Performance
              </h2>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="shadow-md border-0 bg-card/50 backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Lunch (11AM - 3PM)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Covers:</span>
                        <span className="font-semibold">{analytics.lunchCovers || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Sales:</span>
                        <span className="font-semibold">${analytics.lunchSales?.toFixed(2) || '0.00'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-md border-0 bg-card/50 backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Happy Hour (3PM - 6PM)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Covers:</span>
                        <span className="font-semibold">{analytics.happyHourCovers || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Sales:</span>
                        <span className="font-semibold">${analytics.happyHourSales?.toFixed(2) || '0.00'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-md border-0 bg-card/50 backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Dinner (6PM - Close)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Covers:</span>
                        <span className="font-semibold">{analytics.dinnerCovers || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Sales:</span>
                        <span className="font-semibold">${analytics.dinnerSales?.toFixed(2) || '0.00'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Category Sales */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center text-foreground">
                <ShoppingCart className="mr-2 h-5 w-5" />
                Category Sales
              </h2>
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                <MetricCard
                  title="Kickstarters"
                  value={`$${analytics.categorySales?.kickstarters?.toFixed(2) || '0.00'}`}
                />
                <MetricCard
                  title="Beer"
                  value={`$${analytics.categorySales?.beer?.toFixed(2) || '0.00'}`}
                />
                <MetricCard
                  title="Drinks"
                  value={`$${analytics.categorySales?.drinks?.toFixed(2) || '0.00'}`}
                />
                <MetricCard
                  title="Merch"
                  value={`$${analytics.categorySales?.merch?.toFixed(2) || '0.00'}`}
                />
                <MetricCard
                  title="Desserts"
                  value={`$${analytics.categorySales?.desserts?.toFixed(2) || '0.00'}`}
                />
                <MetricCard
                  title="Spirits"
                  value={`$${analytics.categorySales?.spirits?.toFixed(2) || '0.00'}`}
                />
                <MetricCard
                  title="Square Online"
                  value={`$${analytics.channelSales?.squareOnline?.toFixed(2) || '0.00'}`}
                />
                <MetricCard
                  title="DoorDash"
                  value={`$${analytics.channelSales?.doorDash?.toFixed(2) || '0.00'}`}
                />
              </div>
            </div>

            {/* Charts */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
              <CategorySalesChart data={analytics.categorySales || {}} />
              <TimeBasedChart data={{
                lunch: analytics.lunchSales || 0,
                happyHour: analytics.happyHourSales || 0,
                dinner: analytics.dinnerSales || 0
              }} />
            </div>
          </>
        ) : (
          <Card className="shadow-md border-0 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              {locations.length === 0 
                ? "⚠️ No Square locations found! Check your API credentials and permissions."
                : !selectedLocation
                ? "Select a location to continue"
                : "Select filters and click 'Generate Report' to view restaurant analytics"
              }
            </CardContent>
          </Card>
        )}
        </div>
      </main>
    </div>
  );
};

export default RestaurantAnalytics;