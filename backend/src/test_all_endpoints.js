const baseUrl = 'http://localhost:5000/api';

async function testAll() {
  console.log('🚀 Testing All API Endpoints...\n');

  // 1. Login
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin@tailoring.com', password: 'Admin@123' })
  });
  const loginData = await loginRes.json();
  if (!loginData.token) {
    console.error('❌ Login failed:', loginData);
    return;
  }
  const token = loginData.token;
  console.log('✅ Auth /login: 200 OK (Token received)');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const endpoints = [
    { name: 'Auth /me', path: '/auth/me' },
    { name: 'Dashboard /', path: '/dashboard' },
    { name: 'Dashboard /stats', path: '/dashboard/stats' },
    { name: 'Customers List', path: '/customers' },
    { name: 'Categories List', path: '/categories' },
    { name: 'Products List', path: '/products' },
    { name: 'Add-Ons List', path: '/add-ons' },
    { name: 'Orders List', path: '/orders' },
    { name: 'Attendance Today', path: '/attendance/today' },
    { name: 'Attendance Status', path: '/attendance/status' },
    { name: 'Inventory Items', path: '/items' },
    { name: 'Inventory Units', path: '/units' },
    { name: 'Expenses List', path: '/expenses' },
    { name: 'Students List', path: '/students' },
    { name: 'Courses List', path: '/courses' },
    { name: 'Enquiries List', path: '/enquiries' },
    { name: 'Gallery List', path: '/gallery' },
    { name: 'Measurements List', path: '/measurements' },
    { name: 'Work Assignments', path: '/work-assignments' },
    { name: 'Reports /revenue', path: '/reports/revenue' },
  ];

  let passed = 0;
  let failed = 0;

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${baseUrl}${ep.path}`, { headers });
      if (res.ok) {
        console.log(`✅ [${res.status}] ${ep.name} (${ep.path})`);
        passed++;
      } else {
        const text = await res.text();
        console.error(`❌ [${res.status}] ${ep.name} (${ep.path}): ${text.substring(0, 100)}`);
        failed++;
      }
    } catch (err) {
      console.error(`❌ [Network Error] ${ep.name} (${ep.path}):`, err.message);
      failed++;
    }
  }

  console.log(`\n========================================`);
  console.log(`Summary: ${passed} Passed | ${failed} Failed`);
  console.log(`========================================`);
}

testAll();
