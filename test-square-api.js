#!/usr/bin/env node

/**
 * Square API Permission Test Script
 * This script tests the Square API endpoints used by the dashboard
 * to verify permissions and debug connection issues.
 */

// Configuration - You'll need to set these environment variables
const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const SQUARE_BASE_URL = 'https://connect.squareup.com/v2';

// Test if we're using sandbox or production
const isSandbox = SQUARE_ACCESS_TOKEN?.startsWith('EAAAl') || SQUARE_ACCESS_TOKEN?.startsWith('EAAAEP');
const environment = isSandbox ? 'SANDBOX' : 'PRODUCTION';

console.log('🔧 Square API Permission Test');
console.log('================================');
console.log(`Environment: ${environment}`);
console.log(`Base URL: ${SQUARE_BASE_URL}`);
console.log(`Location ID: ${SQUARE_LOCATION_ID || 'NOT SET'}`);
console.log(`Token: ${SQUARE_ACCESS_TOKEN ? '***' + SQUARE_ACCESS_TOKEN.slice(-4) : 'NOT SET'}`);
console.log('');

if (!SQUARE_ACCESS_TOKEN) {
  console.error('❌ SQUARE_ACCESS_TOKEN not set!');
  console.log('Set it with: export SQUARE_ACCESS_TOKEN="your_token_here"');
  process.exit(1);
}

if (!SQUARE_LOCATION_ID) {
  console.error('❌ SQUARE_LOCATION_ID not set!');
  console.log('Set it with: export SQUARE_LOCATION_ID="your_location_id_here"');
  process.exit(1);
}

// Common headers for all requests
const headers = {
  'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
  'Square-Version': '2023-10-18',
  'Content-Type': 'application/json'
};

/**
 * Test helper function
 */
async function testEndpoint(name, url, method = 'GET', body = null) {
  console.log(`🧪 Testing ${name}...`);
  console.log(`   ${method} ${url}`);
  
  try {
    const options = {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) })
    };

    const response = await fetch(url, options);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`   ✅ SUCCESS (${response.status})`);
      return { success: true, data, status: response.status };
    } else {
      console.log(`   ❌ FAILED (${response.status})`);
      console.log(`   Error: ${data.errors?.[0]?.detail || data.message || 'Unknown error'}`);
      return { success: false, data, status: response.status };
    }
  } catch (error) {
    console.log(`   ❌ NETWORK ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Run all tests
 */
async function runTests() {
  const results = {};

  // Test 1: Locations (MERCHANT_PROFILE_READ)
  console.log('\n📍 TEST 1: Locations Endpoint');
  results.locations = await testEndpoint(
    'GET Locations', 
    `${SQUARE_BASE_URL}/locations`
  );
  
  if (results.locations.success) {
    const locations = results.locations.data.locations || [];
    console.log(`   Found ${locations.length} location(s)`);
    locations.forEach((loc, i) => {
      console.log(`   ${i + 1}. ${loc.name} (${loc.id})`);
    });
  }

  // Test 2: Team Members (EMPLOYEES_READ)
  console.log('\n👥 TEST 2: Team Members Endpoint');
  results.teamMembers = await testEndpoint(
    'POST Team Members Search',
    `${SQUARE_BASE_URL}/team-members/search`,
    'POST',
    {
      query: {
        filter: {
          location_ids: [SQUARE_LOCATION_ID],
          status: 'ACTIVE'
        }
      }
    }
  );

  if (results.teamMembers.success) {
    const members = results.teamMembers.data.team_members || [];
    console.log(`   Found ${members.length} team member(s)`);
    members.forEach((member, i) => {
      console.log(`   ${i + 1}. ${member.given_name} ${member.family_name} (${member.id})`);
    });
  }

  // Test 3: Orders (ORDERS_READ) - Last 7 days
  console.log('\n🛒 TEST 3: Orders Endpoint');
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  
  results.orders = await testEndpoint(
    'POST Orders Search',
    `${SQUARE_BASE_URL}/orders/search`,
    'POST',
    {
      filter: {
        date_time_filter: {
          created_at: {
            start_at: startDate.toISOString(),
            end_at: endDate.toISOString()
          }
        },
        state_filter: {
          states: ['COMPLETED', 'OPEN']
        }
      },
      location_ids: [SQUARE_LOCATION_ID],
      limit: 10
    }
  );

  if (results.orders.success) {
    const orders = results.orders.data.orders || [];
    console.log(`   Found ${orders.length} order(s) in last 7 days`);
    orders.slice(0, 3).forEach((order, i) => {
      const total = (order.total_money?.amount || 0) / 100;
      console.log(`   ${i + 1}. Order ${order.id.slice(-8)}: $${total.toFixed(2)}`);
    });
  }

  // Test 4: Timecards (EMPLOYEES_READ) - if we have team members
  if (results.teamMembers.success && results.teamMembers.data.team_members?.length > 0) {
    console.log('\n⏰ TEST 4: Timecards Endpoint');
    const firstTeamMember = results.teamMembers.data.team_members[0];
    
    results.timecards = await testEndpoint(
      'POST Timecards Search',
      `${SQUARE_BASE_URL}/labor/timecards/search`,
      'POST',
      {
        query: {
          filter: {
            team_member_ids: [firstTeamMember.id],
            start_at: {
              start_at: startDate.toISOString(),
              end_at: endDate.toISOString()
            }
          }
        }
      }
    );

    if (results.timecards.success) {
      const timecards = results.timecards.data.timecards || [];
      console.log(`   Found ${timecards.length} timecard(s) for ${firstTeamMember.given_name}`);
    }
  }

  // Summary
  console.log('\n📊 SUMMARY');
  console.log('============');
  console.log(`Locations: ${results.locations.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Team Members: ${results.teamMembers.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Orders: ${results.orders.success ? '✅ PASS' : '❌ FAIL'}`);
  if (results.timecards) {
    console.log(`Timecards: ${results.timecards.success ? '✅ PASS' : '❌ FAIL'}`);
  }

  // Permission analysis
  console.log('\n🔐 REQUIRED PERMISSIONS');
  console.log('========================');
  console.log('MERCHANT_PROFILE_READ: ' + (results.locations.success ? '✅ GRANTED' : '❌ MISSING'));
  console.log('EMPLOYEES_READ: ' + (results.teamMembers.success ? '✅ GRANTED' : '❌ MISSING'));
  console.log('ORDERS_READ: ' + (results.orders.success ? '✅ GRANTED' : '❌ MISSING'));

  console.log('\n💡 NEXT STEPS');
  console.log('===============');
  if (!results.locations.success) {
    console.log('• Enable "Merchant Profile" permissions in Square Developer Dashboard');
  }
  if (!results.teamMembers.success) {
    console.log('• Enable "Team Management" permissions in Square Developer Dashboard');
  }
  if (!results.orders.success) {
    console.log('• Enable "Orders" read permissions in Square Developer Dashboard');
  }
  if (Object.values(results).every(r => r.success)) {
    console.log('🎉 All permissions are correctly configured!');
  } else {
    console.log('• After enabling permissions, regenerate your access token');
    console.log('• Update SQUARE_ACCESS_TOKEN environment variable');
  }
}

// Run the tests
runTests().catch(console.error);