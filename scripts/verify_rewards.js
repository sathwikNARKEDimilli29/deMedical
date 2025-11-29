const axios = require('axios');

async function testBackend() {
  const API_URL = 'http://localhost:5000/api/bug-bounty';

  try {
    console.log('Testing GET /config...');
    const res = await axios.get(`${API_URL}/config`);
    console.log('Status:', res.status);
    console.log('Config count:', res.data.config.length);
    console.log('Sample item:', res.data.config[0]);

    if (res.data.config.length === 5) {
      console.log('✅ GET /config verified');
    } else {
      console.error('❌ GET /config failed: Expected 5 items');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
        console.log('Make sure the backend server is running on port 5000');
    }
  }
}

testBackend();
