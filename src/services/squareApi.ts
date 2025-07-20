import { TeamMember, Order, PerformanceMetrics, DailyPerformance, TopItem } from '@/types/square';
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
    // Edge Function wraps Square API response in { data: ... }
    const locations = result.data?.locations || result.locations || [];
    console.log(`✅ Square API: Loaded ${locations.length} locations`);
    return locations;
  }

  async getTeamMembers(): Promise<TeamMember[]> {
    const result = await this.callEdgeFunction('/team-members');
    // Edge Function wraps Square API response in { data: ... }
    const teamMembers = result.data?.team_members || result.teamMembers || [];
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
    const orders = result.orders || [];
    const duration = Date.now() - startTime;
    console.log(`✅ Square API: Loaded ${orders.length} orders in ${duration}ms`);
    return orders;
  }

  async getPerformanceMetrics(startDate: Date, endDate: Date, teamMemberId?: string): Promise<PerformanceMetrics> {
    const startTime = Date.now();
    const result = await this.callEdgeFunction('/performance', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      teamMemberId
    });
    
    const duration = Date.now() - startTime;
    const metrics = {
      netSales: result.netSales || 0,
      coverCount: result.coverCount || 0,
      ppa: result.ppa || 0,
      salesPerHour: result.salesPerHour || 0,
      totalHours: result.totalHours || 0,
      totalShifts: result.totalShifts || 0,
      dailyPerformance: result.dailyPerformance || [],
      topItems: result.topItems || []
    };
    
    console.log(`✅ Square API: Generated performance metrics in ${duration}ms - $${metrics.netSales.toFixed(2)} sales, ${metrics.coverCount} covers`);
    return metrics;
  }

  // Legacy method for compatibility - client-side calculation

  calculatePerformanceMetrics(orders: Order[], startDate: Date, endDate: Date): PerformanceMetrics {
    // This method is kept for compatibility but real calculation now happens server-side
    console.warn('Using legacy client-side calculation. Consider using calculatePerformanceMetrics() instead.');
    
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
      topItems
    };
  }
}

export const squareApi = new SquareApiService();