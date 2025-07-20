import { TeamMember, Order, PerformanceMetrics, DailyPerformance, TopItem } from '@/types/square';
import { supabase } from '@/integrations/supabase/client';

class SquareApiService {
  private async callEdgeFunction(action: string, params: any = {}) {
    try {
      const { data, error } = await supabase.functions.invoke('square-api', {
        body: { action, ...params }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Unknown error from Square API');
      }

      return data.data;
    } catch (error) {
      console.error('Error calling Square API:', error);
      throw error;
    }
  }

  async getLocations() {
    try {
      return await this.callEdgeFunction('getLocations');
    } catch (error) {
      console.error('Error fetching locations:', error);
      return [];
    }
  }

  async getTeamMembers(): Promise<TeamMember[]> {
    try {
      return await this.callEdgeFunction('getTeamMembers');
    } catch (error) {
      console.error('Error fetching team members:', error);
      // Return empty array on error rather than mock data
      return [];
    }
  }

  async getOrdersForPeriod(startDate: Date, endDate: Date, teamMemberId?: string): Promise<Order[]> {
    try {
      return await this.callEdgeFunction('getOrders', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        teamMemberId
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  }

  async getPerformanceMetrics(startDate: Date, endDate: Date, teamMemberId?: string): Promise<PerformanceMetrics> {
    try {
      return await this.callEdgeFunction('calculatePerformance', {
        performanceStartDate: startDate.toISOString(),
        performanceEndDate: endDate.toISOString(),
        performanceTeamMemberId: teamMemberId
      });
    } catch (error) {
      console.error('Error calculating performance metrics:', error);
      // Return empty metrics on error
      return {
        netSales: 0,
        coverCount: 0,
        ppa: 0,
        salesPerHour: 0,
        dailyPerformance: [],
        topItems: []
      };
    }
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