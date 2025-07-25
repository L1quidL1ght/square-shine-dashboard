import { TeamMember, Order, PerformanceMetrics, DailyPerformance, TopItem, RestaurantAnalytics } from '@/types/square';
import { supabase } from '@/integrations/supabase/client';

class SquareApiService {
  private async callEdgeFunction(endpoint: string, body: any = {}) {
    try {
      const { data, error } = await supabase.functions.invoke('square-api', {
        body: { endpoint, body }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error calling Square API:', error);
      throw error;
    }
  }

  async getLocations() {
    const result = await this.callEdgeFunction('/locations');
    // Handle both wrapped (result.data.locations) and direct (result.locations) formats
    const locations = result.data?.locations || result.locations || [];
    console.log(`✅ Square API: Loaded ${locations.length} locations`);
    return locations;
  }

  async getTeamMembers(): Promise<TeamMember[]> {
    const result = await this.callEdgeFunction('/team-members');
    // Handle both wrapped (result.data.team_members) and direct (result.team_members) formats
    const teamMembers = result.data?.team_members || result.team_members || [];
    console.log(`✅ Square API: Loaded ${teamMembers.length} team members`);
    return teamMembers;
  }

  async getOrdersForPeriod(startDate: Date, endDate: Date, teamMemberId?: string): Promise<Order[]> {
    const startTime = Date.now();
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      ...(teamMemberId && { teamMemberId })
    });
    
    const result = await this.callEdgeFunction(`/orders?${params.toString()}`);
    // Handle both wrapped (result.data.orders) and direct (result.orders) formats
    const orders = result.data?.orders || result.orders || [];
    const duration = Date.now() - startTime;
    console.log(`✅ Square API: Loaded ${orders.length} orders in ${duration}ms`);
    return orders;
  }

  async getPerformanceMetrics(startDate: Date, endDate: Date, teamMemberId?: string): Promise<PerformanceMetrics> {
    const startTime = Date.now();
    
    // Use the new payments->orders approach for team member specific performance
    const result = await this.callEdgeFunction('/performance', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      teamMemberId
    });
    
    const duration = Date.now() - startTime;
    const metrics: PerformanceMetrics = {
      // Handle both wrapped (result.data.*) and direct (result.*) formats
      netSales: result.data?.netSales || result.netSales || 0,
      coverCount: result.data?.coverCount || result.coverCount || 0,
      ppa: result.data?.ppa || result.ppa || 0,
      salesPerHour: result.data?.salesPerHour || result.salesPerHour || 0,
      totalHours: result.data?.totalHours || result.totalHours || 0,
      totalShifts: result.data?.totalShifts || result.totalShifts || 0,
      dailyPerformance: result.data?.dailyPerformance || result.dailyPerformance || [],
      topItems: result.data?.topItems || result.topItems || [],
      teamMemberSales: result.data?.teamMemberSales || result.teamMemberSales || [],
      dessertsSold: result.data?.dessertsSold || result.dessertsSold || 0,
      beerSold: result.data?.beerSold || result.beerSold || 0,
      cocktailsSold: result.data?.cocktailsSold || result.cocktailsSold || 0,
      averageOrderValue: result.data?.averageOrderValue || result.averageOrderValue || 0
    };
    
    console.log(`✅ Square API: Generated performance metrics in ${duration}ms - $${metrics.netSales.toFixed(2)} sales, ${metrics.coverCount} covers`);
    return metrics;
  }

  async getRestaurantAnalytics(startDate: Date, endDate: Date): Promise<RestaurantAnalytics> {
    const startTime = Date.now();
    
    // Use restaurant analytics endpoint
    const result = await this.callEdgeFunction('/restaurant-analytics', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    
    const duration = Date.now() - startTime;
    const analytics: RestaurantAnalytics = {
      // Overall metrics
      netSales: result.data?.netSales || result.netSales || 0,
      totalCovers: result.data?.totalCovers || result.totalCovers || 0,
      averageOrderValue: result.data?.averageOrderValue || result.averageOrderValue || 0,
      totalTransactions: result.data?.totalTransactions || result.totalTransactions || 0,
      
      // Time-based metrics
      lunchCovers: result.data?.lunchCovers || result.lunchCovers || 0,
      lunchSales: result.data?.lunchSales || result.lunchSales || 0,
      happyHourCovers: result.data?.happyHourCovers || result.happyHourCovers || 0,
      happyHourSales: result.data?.happyHourSales || result.happyHourSales || 0,
      dinnerCovers: result.data?.dinnerCovers || result.dinnerCovers || 0,
      dinnerSales: result.data?.dinnerSales || result.dinnerSales || 0,
      
      // Category sales
      categorySales: result.data?.categorySales || result.categorySales || {
        kickstarters: 0,
        beer: 0,
        drinks: 0,
        merch: 0,
        desserts: 0,
        spirits: 0
      },
      
      // Channel sales
      channelSales: result.data?.channelSales || result.channelSales || {
        squareOnline: 0,
        doorDash: 0,
        inStore: 0
      }
    };
    
    console.log(`✅ Square API: Generated restaurant analytics in ${duration}ms - $${analytics.netSales.toFixed(2)} total sales`);
    return analytics;
  }

  calculatePerformanceMetrics(orders: Order[], startDate: Date, endDate: Date): PerformanceMetrics {
    
    const netSales = orders.reduce((sum, order) => 
      sum + (order.total_money?.amount || 0), 0) / 100;

    const coverCount = orders.length;
    const ppa = coverCount > 0 ? netSales / coverCount : 0;
    
    const hoursInPeriod = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    const salesPerHour = hoursInPeriod > 0 ? netSales / hoursInPeriod : 0;

    const dailyPerformance: DailyPerformance[] = [];
    const dailyMap = new Map<string, { sales: number; covers: number }>();

    orders.forEach(order => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      const existing = dailyMap.get(date) || { sales: 0, covers: 0 };
      existing.sales += (order.total_money?.amount || 0) / 100;
      existing.covers += 1;
      dailyMap.set(date, existing);
    });

    dailyMap.forEach((value, date) => {
      dailyPerformance.push({
        date,
        sales: value.sales,
        covers: value.covers
      });
    });

    const itemMap = new Map<string, { quantity: number; revenue: number }>();
    orders.forEach(order => {
      order.line_items?.forEach(item => {
        const existing = itemMap.get(item.name) || { quantity: 0, revenue: 0 };
        existing.quantity += parseInt(item.quantity);
        existing.revenue += (item.total_money?.amount || 0) / 100;
        itemMap.set(item.name, existing);
      });
    });

    const topItems: TopItem[] = Array.from(itemMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      netSales,
      coverCount,
      ppa,
      salesPerHour,
      dailyPerformance: dailyPerformance.sort((a, b) => a.date.localeCompare(b.date)),
      topItems,
      teamMemberSales: [], // Empty for legacy method
      dessertsSold: 0,
      beerSold: 0,
      cocktailsSold: 0,
      averageOrderValue: netSales / coverCount || 0
    };
  }
}

export const squareApi = new SquareApiService();