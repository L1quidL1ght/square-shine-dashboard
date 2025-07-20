import { TeamMember, Order, PerformanceMetrics, DailyPerformance, TopItem } from '@/types/square';
import { supabase } from '@/integrations/supabase/client';

class SquareApiService {
  private async callEndpoint(endpoint: string, options: RequestInit = {}) {
    try {
      const { data, error } = await supabase.functions.invoke('square-api', {
        body: { endpoint, ...options }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error calling Square API endpoint:', error);
      throw error;
    }
  }

  async getLocations() {
    try {
      const response = await this.callEndpoint('/locations');
      return response.locations || [];
    } catch (error) {
      console.error('Error fetching locations:', error);
      return [];
    }
  }

  async getTeamMembers(): Promise<TeamMember[]> {
    try {
      const response = await this.callEndpoint('/team-members');
      return response.teamMembers || [];
    } catch (error) {
      console.error('Error fetching team members:', error);
      return [];
    }
  }

  async getOrdersForPeriod(startDate: Date, endDate: Date, teamMemberId?: string): Promise<Order[]> {
    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ...(teamMemberId && { teamMemberId })
      });
      
      const response = await this.callEndpoint(`/orders?${params.toString()}`);
      return response.orders || [];
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  }

  async getPerformanceMetrics(startDate: Date, endDate: Date, teamMemberId?: string): Promise<PerformanceMetrics> {
    try {
      const response = await this.callEndpoint('/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamMemberId: teamMemberId || 'all',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
      });
      
      return {
        netSales: response.netSales || 0,
        coverCount: response.coverCount || 0,
        ppa: response.ppa || 0,
        salesPerHour: response.salesPerHour || 0,
        totalHours: response.totalHours || 0,
        totalShifts: response.totalShifts || 0,
        dailyPerformance: response.dailyPerformance || [],
        topItems: response.topItems || []
      };
    } catch (error) {
      console.error('Error calculating performance metrics:', error);
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