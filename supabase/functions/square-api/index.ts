import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  console.log('=== Edge Function Called ===');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('CORS preflight request');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Processing POST request');
    
    const squareToken = Deno.env.get('SQUARE_ACCESS_TOKEN');
    const locationId = Deno.env.get('SQUARE_LOCATION_ID');
    
    if (!squareToken || !locationId) {
      throw new Error('Missing required environment variables');
    }

    const { endpoint, body: requestBody } = await req.json();
    console.log('Request:', { endpoint, body: requestBody });

    let squareApiUrl = '';
    let requestOptions: RequestInit = {
      headers: {
        'Authorization': `Bearer ${squareToken}`,
        'Square-Version': '2023-10-18',
        'Content-Type': 'application/json'
      }
    };

    // Handle different endpoints with proper parameter extraction
    switch (endpoint) {
      case '/orders':
        const { startDate, endDate, teamMemberId } = requestBody || {};
        squareApiUrl = 'https://connect.squareup.com/v2/orders/search';
        requestOptions.method = 'POST';
        requestOptions.body = JSON.stringify({
          location_ids: [locationId],
          query: {
            filter: {
              date_time_filter: {
                created_at: {
                  start_at: startDate,
                  end_at: endDate
                }
              },
              ...(teamMemberId && {
                fulfillment_filter: {
                  fulfillment_types: ['PICKUP', 'SHIPMENT'],
                  fulfillment_states: ['PROPOSED', 'RESERVED', 'PREPARED', 'COMPLETED']
                }
              })
            }
          }
        });
        break;
        
      case '/performance':
        const { startDate: perfStartDate, endDate: perfEndDate, teamMemberId: perfTeamMemberId } = requestBody || {};
        squareApiUrl = 'https://connect.squareup.com/v2/orders/search';
        requestOptions.method = 'POST';
        requestOptions.body = JSON.stringify({
          location_ids: [locationId],
          query: {
            filter: {
              date_time_filter: {
                created_at: {
                  start_at: perfStartDate,
                  end_at: perfEndDate
                }
              }
            },
            sort: {
              sort_field: 'CREATED_AT',
              sort_order: 'ASC'
            }
          }
        });
        break;
        
      case '/restaurant-analytics':
        const { startDate: analyticsStartDate, endDate: analyticsEndDate } = requestBody || {};
        squareApiUrl = 'https://connect.squareup.com/v2/orders/search';
        requestOptions.method = 'POST';
        requestOptions.body = JSON.stringify({
          location_ids: [locationId],
          query: {
            filter: {
              date_time_filter: {
                created_at: {
                  start_at: analyticsStartDate,
                  end_at: analyticsEndDate
                }
              }
            },
            sort: {
              sort_field: 'CREATED_AT',
              sort_order: 'ASC'
            }
          }
        });
        break;

      case '/team-members':
        squareApiUrl = 'https://connect.squareup.com/v2/team-members/search';
        requestOptions.method = 'POST';
        requestOptions.body = JSON.stringify({
          query: {
            filter: {
              location_ids: [locationId],
              status: 'ACTIVE'
            }
          }
        });
        break;
        
      case '/payments':
        const { startDate: paymentsStartDate, endDate: paymentsEndDate } = requestBody || {};
        squareApiUrl = 'https://connect.squareup.com/v2/payments';
        requestOptions.method = 'GET';
        
        // Add query parameters for filtering payments
        const paymentsParams = new URLSearchParams({
          location_id: locationId,
          ...(paymentsStartDate && { begin_time: paymentsStartDate }),
          ...(paymentsEndDate && { end_time: paymentsEndDate }),
          limit: '200' // Get more payments per request
        });
        squareApiUrl += '?' + paymentsParams.toString();
        break;
        
      case '/payment':
        const { paymentId } = requestBody || {};
        if (!paymentId) {
          throw new Error('Payment ID is required');
        }
        squareApiUrl = `https://connect.squareup.com/v2/payments/${paymentId}`;
        requestOptions.method = 'GET';
        break;
        
      case '/locations':
        console.log('=== LOCATIONS DEBUG ===');
        console.log('Access token exists:', !!squareToken);
        console.log('Access token preview:', squareToken?.substring(0, 15) + '...');
        console.log('Making request to:', 'https://connect.squareup.com/v2/locations');
        
        squareApiUrl = 'https://connect.squareup.com/v2/locations';
        requestOptions.method = 'GET';
        break;
        
      default:
        throw new Error(`Unsupported endpoint: ${endpoint}`);
    }

    console.log('Making Square API call to:', squareApiUrl);
    const response = await fetch(squareApiUrl, requestOptions);
    
    // Add detailed response logging for locations endpoint
    if (endpoint === '/locations') {
      console.log('Locations response status:', response.status);
      console.log('Locations response headers:', Object.fromEntries(response.headers.entries()));
    }
    
    let data = await response.json();
    
    // Add detailed data logging for locations endpoint
    if (endpoint === '/locations') {
      console.log('Locations response data:', JSON.stringify(data, null, 2));
      if (!response.ok) {
        console.error('Locations API error:', data);
      }
    }
    
    console.log('Square API response:', { status: response.status, data });
    
    // Add detailed logging for performance endpoint
    if (endpoint === '/performance') {
      console.log('=== PERFORMANCE DEBUG ===');
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      console.log('Performance data:', JSON.stringify(data, null, 2));
      console.log('Number of orders found:', data.orders?.length || 0);
      console.log('Request body was:', JSON.stringify(requestBody, null, 2));
      console.log('==========================');
    }
    
    // Add detailed logging for locations endpoint
    if (endpoint === '/locations') {
      console.log('=== LOCATIONS DEBUG ===');
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      console.log('Locations data:', JSON.stringify(data, null, 2));
      console.log('Number of locations found:', data.locations?.length || 0);
      console.log('Environment SQUARE_LOCATION_ID:', locationId);
      console.log('=======================');
    }
    
    // Filter team members to show only servers
    if (endpoint === '/team-members' && response.ok && data.team_members) {
      console.log('=== TEAM MEMBERS FILTERING ===');
      console.log('Total team members before filtering:', data.team_members.length);
      
      const serversOnly = data.team_members.filter(member => {
        // Check if any job assignment includes "Server" in the job title
        const hasServerRole = member.wage_setting?.job_assignments?.some(job => 
          job.job_title?.toLowerCase().includes('server')
        );
        
        if (hasServerRole) {
          console.log(`✅ Server found: ${member.given_name} ${member.family_name} - Roles: ${
            member.wage_setting?.job_assignments?.map(j => j.job_title).join(', ') || 'None'
          }`);
        }
        
        return hasServerRole;
      });
      
      console.log('Servers found:', serversOnly.length);
      console.log('================================');
      
      // Create a new data object instead of modifying the existing one
      data = { ...data, team_members: serversOnly };
    }
    
    // Process payments to get team member specific performance
    if (endpoint === '/performance' && response.ok) {
      console.log('=== PERFORMANCE ENDPOINT (New Implementation) ===');
      
      const { startDate: perfStartDate, endDate: perfEndDate, teamMemberId: perfTeamMemberId } = requestBody || {};
      
      // Step 1: Get all payments for the date range
      console.log('Step 1: Getting payments for date range...');
      const paymentsUrl = 'https://connect.squareup.com/v2/payments';
      const paymentsParams = new URLSearchParams({
        location_id: locationId,
        ...(perfStartDate && { begin_time: perfStartDate }),
        ...(perfEndDate && { end_time: perfEndDate }),
        limit: '200'
      });
      
      const paymentsResponse = await fetch(paymentsUrl + '?' + paymentsParams.toString(), {
        headers: {
          'Authorization': `Bearer ${squareToken}`,
          'Square-Version': '2023-10-18',
          'Content-Type': 'application/json'
        }
      });
      
      const paymentsData = await paymentsResponse.json();
      console.log('Total payments found:', paymentsData.payments?.length || 0);
      
      // Step 2: Filter payments by team member (if specified)
      let filteredPayments = paymentsData.payments || [];
      if (perfTeamMemberId && perfTeamMemberId !== 'all') {
        filteredPayments = filteredPayments.filter(payment => 
          payment.team_member_id === perfTeamMemberId
        );
        console.log(`Payments by team member ${perfTeamMemberId}:`, filteredPayments.length);
      }
      
      // Step 3: Get order IDs from payments
      const orderIds = filteredPayments.map(payment => payment.order_id).filter(Boolean);
      console.log('Order IDs from payments:', orderIds.length);
      
      // Step 4: Get orders for those order IDs
      const orders = [];
      if (orderIds.length > 0) {
        // Get orders in batches (Square allows bulk retrieval)
        for (const orderId of orderIds) {
          try {
            const orderResponse = await fetch(`https://connect.squareup.com/v2/orders/${orderId}`, {
              headers: {
                'Authorization': `Bearer ${squareToken}`,
                'Square-Version': '2023-10-18',
                'Content-Type': 'application/json'
              }
            });
            const orderData = await orderResponse.json();
            if (orderData.order) {
              orders.push(orderData.order);
            }
          } catch (error) {
            console.error(`Error fetching order ${orderId}:`, error);
          }
        }
      }
      
      console.log('Final orders for performance calculation:', orders.length);
      
      // Replace the original data with our processed orders
      data = { orders };
      
      console.log('=================================================');
    }
    
    // Log performance endpoint data
    if (endpoint === '/performance' && response.ok) {
      console.log('=== PERFORMANCE RESULTS ===');
      console.log('Total orders found:', data.orders?.length || 0);
      if (data.orders && data.orders.length > 0) {
        console.log('First order sample:', JSON.stringify(data.orders[0], null, 2));
      } else {
        console.log('No orders found in response');
      }
      console.log('============================');
    }

    // Calculate restaurant-specific metrics for performance endpoint
    if (endpoint === '/performance' && response.ok && data.orders) {
      console.log('=== CALCULATING PERFORMANCE METRICS ===');
      const orders = data.orders || [];
      
      // Basic metrics
      const netSales = orders.reduce((sum, order) => 
        sum + (order.net_amounts?.total_money?.amount || 0), 0) / 100;
      const coverCount = orders.length;
      const ppa = coverCount > 0 ? netSales / coverCount : 0;
      
      // Calculate time period for sales per hour
      const startDate = new Date(requestBody.startDate);
      const endDate = new Date(requestBody.endDate);
      const hoursInPeriod = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
      const salesPerHour = netSales / hoursInPeriod;

      // Daily performance
      const dailyMap = new Map();
      orders.forEach(order => {
        const date = new Date(order.created_at).toISOString().split('T')[0];
        const existing = dailyMap.get(date) || { sales: 0, covers: 0 };
        existing.sales += (order.net_amounts?.total_money?.amount || 0) / 100;
        existing.covers += 1;
        dailyMap.set(date, existing);
      });

      const dailyPerformance = Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        sales: data.sales,
        covers: data.covers
      })).sort((a, b) => a.date.localeCompare(b.date));

      // Top items
      const itemMap = new Map();
      orders.forEach(order => {
        order.line_items?.forEach(item => {
          const existing = itemMap.get(item.name) || { quantity: 0, revenue: 0 };
          existing.quantity += parseInt(item.quantity);
          existing.revenue += (item.total_money?.amount || 0) / 100;
          itemMap.set(item.name, existing);
        });
      });

      const topItems = Array.from(itemMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Team member sales ranking
      const teamMemberMap = new Map();
      orders.forEach(order => {
        // Find team member from fulfillments
        const teamMemberId = order.fulfillments?.[0]?.fulfillment_entries?.[0]?.team_member_id;
        if (teamMemberId) {
          const existing = teamMemberMap.get(teamMemberId) || { sales: 0, orders: 0 };
          existing.sales += (order.net_amounts?.total_money?.amount || 0) / 100;
          existing.orders += 1;
          teamMemberMap.set(teamMemberId, existing);
        }
      });

      // We'll need team member names, but for now use IDs
      const teamMemberSales = Array.from(teamMemberMap.entries())
        .map(([teamMemberId, data]) => ({
          teamMemberId,
          name: `Team Member ${teamMemberId.substring(0, 8)}`,
          sales: data.sales
        }))
        .filter(tm => tm.sales > 0)
        .sort((a, b) => b.sales - a.sales);

      // Restaurant-specific metrics based on item names
      let dessertsSold = 0;
      let beerSold = 0;
      let cocktailsSold = 0;

      orders.forEach(order => {
        order.line_items?.forEach(item => {
          const itemName = item.name.toLowerCase();
          const quantity = parseInt(item.quantity);
          
          // Dessert keywords
          if (itemName.includes('dessert') || itemName.includes('cake') || 
              itemName.includes('pie') || itemName.includes('ice cream') ||
              itemName.includes('cookie') || itemName.includes('brownie')) {
            dessertsSold += quantity;
          }
          
          // Beer keywords  
          if (itemName.includes('beer') || itemName.includes('ale') || 
              itemName.includes('lager') || itemName.includes('ipa') ||
              itemName.includes('stout') || itemName.includes('pilsner')) {
            beerSold += quantity;
          }
          
          // Cocktail keywords
          if (itemName.includes('cocktail') || itemName.includes('martini') || 
              itemName.includes('mojito') || itemName.includes('margarita') ||
              itemName.includes('whiskey') || itemName.includes('vodka') ||
              itemName.includes('rum') || itemName.includes('gin')) {
            cocktailsSold += quantity;
          }
        });
      });

      const averageOrderValue = coverCount > 0 ? netSales / coverCount : 0;

      // Replace the orders data with calculated metrics
      data = {
        netSales,
        coverCount,
        ppa,
        salesPerHour,
        dailyPerformance,
        topItems,
        teamMemberSales,
        dessertsSold,
        beerSold,
        cocktailsSold,
        averageOrderValue,
        totalHours: hoursInPeriod,
        totalShifts: 1
      };
      
      console.log(`📊 Calculated metrics: $${netSales.toFixed(2)} sales, ${coverCount} covers, ${dessertsSold} desserts, ${beerSold} beers, ${cocktailsSold} cocktails`);
    }

    // Calculate comprehensive restaurant analytics
    if (endpoint === '/restaurant-analytics' && response.ok && data.orders) {
      console.log('=== RESTAURANT ANALYTICS CALCULATION ===');
      const orders = data.orders || [];
      
      // Overall metrics
      const netSales = orders.reduce((sum, order) => 
        sum + (order.net_amounts?.total_money?.amount || 0), 0) / 100;
      const totalCovers = orders.length;
      const averageOrderValue = totalCovers > 0 ? netSales / totalCovers : 0;
      const totalTransactions = orders.length;

      // Time-based metrics (based on created_at time)
      let lunchCovers = 0, lunchSales = 0;
      let happyHourCovers = 0, happyHourSales = 0;
      let dinnerCovers = 0, dinnerSales = 0;

      // Category sales tracking
      let kickstartersSales = 0, beerSales = 0, drinksSales = 0;
      let merchSales = 0, dessertsSales = 0, spiritsSales = 0;
      
      // Channel sales tracking
      let squareOnlineSales = 0, doorDashSales = 0, inStoreSales = 0;

      orders.forEach(order => {
        const orderValue = (order.net_amounts?.total_money?.amount || 0) / 100;
        const orderTime = new Date(order.created_at);
        const hour = orderTime.getHours();
        
        // Time-based classification
        if (hour >= 11 && hour < 15) { // 11AM - 3PM
          lunchCovers++;
          lunchSales += orderValue;
        } else if (hour >= 15 && hour < 18) { // 3PM - 6PM
          happyHourCovers++;
          happyHourSales += orderValue;
        } else if (hour >= 18 || hour < 11) { // 6PM - Close
          dinnerCovers++;
          dinnerSales += orderValue;
        }

        // Channel detection (based on order source)
        const source = order.source?.name?.toLowerCase() || '';
        if (source.includes('online') || source.includes('web')) {
          squareOnlineSales += orderValue;
        } else if (source.includes('doordash') || source.includes('door dash')) {
          doorDashSales += orderValue;
        } else {
          inStoreSales += orderValue;
        }

        // Category sales (based on item names)
        order.line_items?.forEach(item => {
          const itemName = item.name?.toLowerCase() || '';
          const itemValue = (item.total_money?.amount || 0) / 100;
          
          // Kickstarters (appetizers, starters)
          if (itemName.includes('appetizer') || itemName.includes('starter') || 
              itemName.includes('kick') || itemName.includes('wings') ||
              itemName.includes('nachos') || itemName.includes('dip')) {
            kickstartersSales += itemValue;
          }
          
          // Beer
          else if (itemName.includes('beer') || itemName.includes('ale') || 
                   itemName.includes('lager') || itemName.includes('ipa') ||
                   itemName.includes('stout') || itemName.includes('pilsner')) {
            beerSales += itemValue;
          }
          
          // Drinks (non-alcoholic)
          else if (itemName.includes('soda') || itemName.includes('coke') || 
                   itemName.includes('sprite') || itemName.includes('tea') ||
                   itemName.includes('coffee') || itemName.includes('juice')) {
            drinksSales += itemValue;
          }
          
          // Merch
          else if (itemName.includes('shirt') || itemName.includes('hat') || 
                   itemName.includes('merch') || itemName.includes('gift card') ||
                   itemName.includes('egift')) {
            merchSales += itemValue;
          }
          
          // Desserts
          else if (itemName.includes('dessert') || itemName.includes('cake') || 
                   itemName.includes('pie') || itemName.includes('ice cream') ||
                   itemName.includes('cookie') || itemName.includes('brownie')) {
            dessertsSales += itemValue;
          }
          
          // Spirits (hard liquor, cocktails)
          else if (itemName.includes('whiskey') || itemName.includes('vodka') || 
                   itemName.includes('rum') || itemName.includes('gin') ||
                   itemName.includes('cocktail') || itemName.includes('martini') ||
                   itemName.includes('shot')) {
            spiritsSales += itemValue;
          }
        });
      });

      // Replace orders data with calculated analytics
      data = {
        // Overall metrics
        netSales,
        totalCovers,
        averageOrderValue,
        totalTransactions,
        
        // Time-based metrics
        lunchCovers,
        lunchSales,
        happyHourCovers,
        happyHourSales,
        dinnerCovers,
        dinnerSales,
        
        // Category sales
        categorySales: {
          kickstarters: kickstartersSales,
          beer: beerSales,
          drinks: drinksSales,
          merch: merchSales,
          desserts: dessertsSales,
          spirits: spiritsSales
        },
        
        // Channel sales
        channelSales: {
          squareOnline: squareOnlineSales,
          doorDash: doorDashSales,
          inStore: inStoreSales
        }
      };
      
      console.log(`🏪 Restaurant Analytics: $${netSales.toFixed(2)} total | Lunch: $${lunchSales.toFixed(2)} | Dinner: $${dinnerSales.toFixed(2)} | Beer: $${beerSales.toFixed(2)}`);
      console.log('==========================================');
    }
    
    return new Response(JSON.stringify({
      success: response.ok,
      data: data,
      status: response.status
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Edge Function Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack,
      name: error.name
    }), {
      status: 200, // Return 200 so we can see the error details
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
})