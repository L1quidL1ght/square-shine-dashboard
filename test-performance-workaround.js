// Test script to simulate performance metrics calculation
const performanceData = {
  "orders": [
    {
      "id": "lExpRhMnHDfMCymiwNbud2XtL4FZY",
      "location_id": "R8PT23330JWKX",
      "line_items": [
        {
          "uid": "oh0DVLuuzbS4E6OS1PyvSD",
          "quantity": "1",
          "name": "eGift Card",
          "total_money": {
            "amount": 10000,
            "currency": "USD"
          }
        }
      ],
      "created_at": "2024-01-22T19:49:43.181Z",
      "total_money": {
        "amount": 10000,
        "currency": "USD"
      }
    }
  ]
};

// Calculate performance metrics like the frontend should
const orders = performanceData.orders;
const netSales = orders.reduce((sum, order) => 
  sum + (order.total_money?.amount || 0), 0) / 100;
const coverCount = orders.length;
const ppa = coverCount > 0 ? netSales / coverCount : 0;

console.log('Expected performance metrics:');
console.log({
  netSales: netSales,
  coverCount: coverCount,
  ppa: ppa,
  salesPerHour: 0 // Would be calculated based on time period
});