export interface TeamMember {
  id: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  phone_number?: string;
  status?: string;
}

export interface Order {
  id: string;
  created_at: string;
  total_money?: {
    amount: number;
    currency: string;
  };
  line_items?: LineItem[];
  fulfillments?: Fulfillment[];
}

export interface LineItem {
  name: string;
  quantity: string;
  total_money?: {
    amount: number;
    currency: string;
  };
}

export interface Fulfillment {
  type: string;
  state: string;
  fulfillment_entries?: FulfillmentEntry[];
}

export interface FulfillmentEntry {
  team_member_id?: string;
}

export interface PerformanceMetrics {
  netSales: number;
  coverCount: number;
  ppa: number;
  salesPerHour: number;
  totalHours?: number;
  totalShifts?: number;
  dailyPerformance: DailyPerformance[];
  topItems: TopItem[];
}

export interface DailyPerformance {
  date: string;
  sales: number;
  covers: number;
}

export interface TopItem {
  name: string;
  quantity: number;
  revenue: number;
}