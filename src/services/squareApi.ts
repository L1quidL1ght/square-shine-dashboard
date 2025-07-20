import { TeamMember, Order, PerformanceMetrics, DailyPerformance, TopItem } from '@/types/square';

const SQUARE_BASE_URL = 'https://connect.squareup.com/v2';

// Mock data for development - replace with actual API calls
const mockTeamMembers: TeamMember[] = [
  { id: '1', given_name: 'John', family_name: 'Smith', email: 'john@restaurant.com', status: 'ACTIVE' },
  { id: '2', given_name: 'Sarah', family_name: 'Johnson', email: 'sarah@restaurant.com', status: 'ACTIVE' },
  { id: '3', given_name: 'Mike', family_name: 'Brown', email: 'mike@restaurant.com', status: 'ACTIVE' },
  { id: '4', given_name: 'Lisa', family_name: 'Davis', email: 'lisa@restaurant.com', status: 'ACTIVE' },
];

const mockOrders: Order[] = [
  {
    id: '1',
    created_at: '2024-01-15T12:30:00Z',
    total_money: { amount: 2450, currency: 'USD' },
    line_items: [
      { name: 'Chicken Caesar Salad', quantity: '2', total_money: { amount: 1600, currency: 'USD' } },
      { name: 'Iced Tea', quantity: '2', total_money: { amount: 600, currency: 'USD' } },
      { name: 'Chocolate Cake', quantity: '1', total_money: { amount: 250, currency: 'USD' } },
    ],
    fulfillments: [{ type: 'PICKUP', state: 'COMPLETED', fulfillment_entries: [{ team_member_id: '1' }] }]
  },
  // Add more mock orders...
];

class SquareApiService {
  private accessToken: string;
  private applicationId: string;

  constructor() {
    // In a real app, these would come from environment variables
    this.accessToken = process.env.SQUARE_ACCESS_TOKEN || 'mock_token';
    this.applicationId = process.env.SQUARE_APPLICATION_ID || 'mock_app_id';
  }

  async getTeamMembers(): Promise<TeamMember[]> {
    try {
      // For now, return mock data. In production, replace with actual API call:
      // const response = await fetch(`${SQUARE_BASE_URL}/team-members`, {
      //   headers: {
      //     'Authorization': `Bearer ${this.accessToken}`,
      //     'Square-Version': '2023-10-18',
      //     'Content-Type': 'application/json'
      //   }
      // });
      // const data = await response.json();
      // return data.team_members || [];
      
      return mockTeamMembers;
    } catch (error) {
      console.error('Error fetching team members:', error);
      return mockTeamMembers;
    }
  }

  async getOrdersForPeriod(startDate: Date, endDate: Date, teamMemberId?: string): Promise<Order[]> {
    try {
      // For now, return mock data. In production, replace with actual API call:
      // const response = await fetch(`${SQUARE_BASE_URL}/orders/search`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${this.accessToken}`,
      //     'Square-Version': '2023-10-18',
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({
      //     filter: {
      //       date_time_filter: {
      //         created_at: {
      //           start_at: startDate.toISOString(),
      //           end_at: endDate.toISOString()
      //         }
      //       }
      //     }
      //   })
      // });
      // const data = await response.json();
      // return data.orders || [];

      // Filter mock orders by team member if specified
      let filteredOrders = mockOrders;
      if (teamMemberId) {
        filteredOrders = mockOrders.filter(order => 
          order.fulfillments?.some(f => 
            f.fulfillment_entries?.some(e => e.team_member_id === teamMemberId)
          )
        );
      }
      
      return filteredOrders;
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  }

  calculatePerformanceMetrics(orders: Order[], startDate: Date, endDate: Date): PerformanceMetrics {
    const netSales = orders.reduce((sum, order) => 
      sum + (order.total_money?.amount || 0), 0) / 100; // Convert cents to dollars

    const coverCount = orders.length;
    const ppa = coverCount > 0 ? netSales / coverCount : 0;
    
    const hoursInPeriod = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    const salesPerHour = hoursInPeriod > 0 ? netSales / hoursInPeriod : 0;

    // Calculate daily performance
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

    // Calculate top items
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