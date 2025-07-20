import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

const SQUARE_BASE_URL = 'https://connect.squareup.com/v2';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, ...params } = await req.json()
    
    const accessToken = Deno.env.get('SQUARE_ACCESS_TOKEN')
    const locationId = Deno.env.get('SQUARE_LOCATION_ID')
    
    if (!accessToken || !locationId) {
      throw new Error('Missing Square API credentials')
    }

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Square-Version': '2023-10-18',
      'Content-Type': 'application/json'
    }

    let result;

    switch (action) {
      case 'getLocations':
        const locationsResponse = await fetch(`${SQUARE_BASE_URL}/locations`, {
          method: 'GET',
          headers
        });
        const locationsData = await locationsResponse.json();
        result = locationsData.locations?.map(loc => ({
          id: loc.id,
          name: loc.name,
          status: loc.status,
          address: loc.address
        })) || [];
        break;

      case 'getTeamMembers':
        const teamMembersResponse = await fetch(`${SQUARE_BASE_URL}/team-members`, {
          method: 'GET',
          headers
        });
        const teamMembersData = await teamMembersResponse.json();
        // Filter active team members for the specified location
        result = teamMembersData.team_members?.filter(member => 
          member.status === 'ACTIVE' && 
          (!member.assigned_locations?.length || member.assigned_locations.includes(locationId))
        ) || [];
        break;

      case 'getOrders':
        const { startDate, endDate, teamMemberId } = params;
        const searchBody = {
          filter: {
            date_time_filter: {
              created_at: {
                start_at: startDate,
                end_at: endDate
              }
            },
            state_filter: {
              states: ['COMPLETED', 'OPEN']
            }
          },
          location_ids: [locationId],
          limit: 1000
        };

        const ordersResponse = await fetch(`${SQUARE_BASE_URL}/orders/search`, {
          method: 'POST',
          headers,
          body: JSON.stringify(searchBody)
        });
        const ordersData = await ordersResponse.json();
        let orders = ordersData.orders || [];

        // Filter by team member if specified
        if (teamMemberId) {
          orders = orders.filter(order => 
            order.fulfillments?.some(f => 
              f.fulfillment_entries?.some(e => e.team_member_id === teamMemberId)
            )
          );
        }

        result = orders;
        break;

      case 'calculatePerformance':
        const { performanceStartDate, performanceEndDate, performanceTeamMemberId } = params;
        
        // Get orders for performance calculation
        const performanceSearchBody = {
          filter: {
            date_time_filter: {
              created_at: {
                start_at: performanceStartDate,
                end_at: performanceEndDate
              }
            },
            state_filter: {
              states: ['COMPLETED', 'OPEN']
            }
          },
          location_ids: [locationId],
          limit: 1000
        };

        const performanceOrdersResponse = await fetch(`${SQUARE_BASE_URL}/orders/search`, {
          method: 'POST',
          headers,
          body: JSON.stringify(performanceSearchBody)
        });
        const performanceOrdersData = await performanceOrdersResponse.json();
        let performanceOrders = performanceOrdersData.orders || [];

        // Filter by team member if specified
        if (performanceTeamMemberId && performanceTeamMemberId !== 'all') {
          performanceOrders = performanceOrders.filter(order => 
            order.fulfillments?.some(f => 
              f.fulfillment_entries?.some(e => e.team_member_id === performanceTeamMemberId)
            )
          );
        }

        // Get timecards for actual hours worked
        let totalHours = 0;
        let totalShifts = 0;
        
        if (performanceTeamMemberId && performanceTeamMemberId !== 'all') {
          try {
            const timecardsResponse = await fetch(`${SQUARE_BASE_URL}/labor/timecards/search`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                query: {
                  filter: {
                    team_member_ids: [performanceTeamMemberId],
                    start_at: {
                      start_at: performanceStartDate,
                      end_at: performanceEndDate
                    }
                  }
                }
              })
            });
            
            if (timecardsResponse.ok) {
              const timecardsData = await timecardsResponse.json();
              const timecards = timecardsData.timecards || [];
              totalShifts = timecards.length;
              
              totalHours = timecards.reduce((sum, timecard) => {
                if (timecard.start_at && timecard.end_at) {
                  const start = new Date(timecard.start_at);
                  const end = new Date(timecard.end_at);
                  return sum + ((end.getTime() - start.getTime()) / (1000 * 60 * 60));
                }
                return sum;
              }, 0);
            }
          } catch (error) {
            console.warn('Could not fetch timecards:', error.message);
          }
        }

        // Calculate performance metrics
        const netSales = performanceOrders.reduce((sum, order) => 
          sum + (order.total_money?.amount || 0), 0) / 100; // Convert cents to dollars

        const coverCount = performanceOrders.length;
        const ppa = coverCount > 0 ? netSales / coverCount : 0;
        
        // Use actual hours worked if available, otherwise fall back to period calculation
        let salesPerHour = 0;
        if (totalHours > 0) {
          salesPerHour = netSales / totalHours;
        } else {
          const startTime = new Date(performanceStartDate);
          const endTime = new Date(performanceEndDate);
          const hoursInPeriod = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
          salesPerHour = hoursInPeriod > 0 ? netSales / hoursInPeriod : 0;
        }

        // Calculate daily performance
        const dailyPerformance = [];
        const dailyMap = new Map();

        performanceOrders.forEach(order => {
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
        const itemMap = new Map();
        performanceOrders.forEach(order => {
          order.line_items?.forEach(item => {
            const existing = itemMap.get(item.name) || { quantity: 0, revenue: 0 };
            existing.quantity += parseInt(item.quantity || '1');
            existing.revenue += (item.total_money?.amount || 0) / 100;
            itemMap.set(item.name, existing);
          });
        });

        const topItems = Array.from(itemMap.entries())
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10);

        result = {
          netSales,
          coverCount,
          ppa,
          salesPerHour,
          totalHours,
          totalShifts,
          dailyPerformance: dailyPerformance.sort((a, b) => a.date.localeCompare(b.date)),
          topItems,
          orderCount: performanceOrders.length,
          averageOrderValue: ppa
        };
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Square API Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})