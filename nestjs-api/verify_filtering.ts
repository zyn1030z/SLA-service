
import axios from 'axios';

const API_URL = 'http://localhost:3000/sla/action-logs';

async function testFilters() {
  console.log('Testing SLA Action Logs API Filters...');

  try {
    // 1. Test isSuccess=true
    console.log('\n1. Testing isSuccess=true...');
    const resSuccess = await axios.get(API_URL, { params: { isSuccess: 'true' } });
    const successItems = resSuccess.data.items;
    console.log(`Received ${successItems.length} items.`);
    if (successItems.every((i: any) => i.isSuccess === true)) {
        console.log('PASS: All items have isSuccess=true');
    } else {
        console.log('FAIL: Some items have isSuccess=false');
    }

    // 2. Test isSuccess=false
    console.log('\n2. Testing isSuccess=false...');
    const resFail = await axios.get(API_URL, { params: { isSuccess: 'false' } });
    const failItems = resFail.data.items;
    console.log(`Received ${failItems.length} items.`);
    if (failItems.every((i: any) => i.isSuccess === false)) {
        console.log('PASS: All items have isSuccess=false');
    } else {
        console.log('FAIL: Some items have isSuccess=true');
    }

    // 3. Test Assignee Search
    // First get a user from the list
    const all = await axios.get(API_URL);
    if (all.data.items.length > 0) {
        // Find a log with assignees
        const logWithUser = all.data.items.find((i: any) => i.record && i.record.userApprove && i.record.userApprove.length > 0);
        
        // Logic note: The API returns flat log, but assignee info is inside record? 
        // Wait, the API response shape in page.tsx is: { assignees: [...] }
        // Let's check the transformed response or raw response.
        // The Service listActionLogs returns items with LEFT JOIN record.
        // The Controller returns the result directly.
        // The Service actually maps items? No, looking at code it returns entity.
        // But SlaActionLogEntity does NOT have 'assignees' field mapped from record.userApprove.
        // Wait, the page.tsx expects `assignees`.
        // I need to check if I updated SlaTrackingService to map `record.userApprove` to `assignees` in the response?
        // I DID NOT see that in the edits. I only touched filtering.
        // CHECK: Does SlaActionLogEntity have relation to Record and does the API return record?
        // The query builder does `leftJoin(RecordEntity, "record", ...)`
        // But does it select it? `qb.getManyAndCount()` returns `SlaActionLogEntity` array.
        // Unless `SlaActionLogEntity` has `record` relation loaded.
        // And `RecordEntity` has `userApprove`.
        
        // Let's check if the API response actually contains `record` with `userApprove`.
        // If not, the Frontend change to show assignees might fail or be empty.
    }

  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.response) {
        console.log('Response Status:', error.response.status);
        console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
        console.log('No response received from server.');
    }
  }
}

testFilters();
