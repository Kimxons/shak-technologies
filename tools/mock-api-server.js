/**
 * Mock API Server for Testing Frontend
 * Simulates the backend API on port 8080
 */

const http = require('http');

const PORT = 8080;

// Mock data for different stored procedures
const mockResponses = {
  'dbo.p_GetRecBankStatement': {
    status: 'success',
    message: 'Bank statement retrieved successfully',
    data: {
      BankID: 'BNK001',
      OurBranchID: '0603',
      BatchNo: '1333',
      FormatID: 'FMT001',
      ClosingBalance: '150000.50',
      BatchStatus: 'Completed',
      StmtFromDate: '2026-01-01',
      StmtToDate: '2026-01-21',
      StatementDate: '2026-01-21',
      OpeningBalance: '100000.00',
      TotalDebits: '25000.50',
      TotalCredits: '75000.00'
    }
  },
  // Bill Discounting: Add/Edit Bill Application (save)
  'dbo.p_AddEditBillApplication': {
    status: 'success',
    message: 'Bill application saved successfully',
    data: {
      ApplicationID: 'APP-TEST-001',
      SerialID: 1001,
      ResponseCode: '00',
      ResponseMessage: 'Success'
    }
  },
  'dbo.p_SaveBankStatement': {
    status: 'success',
    message: 'Bank statement saved successfully',
    data: null
  },
  'dbo.p_DeleteBankStatement': {
    status: 'success',
    message: 'Bank statement deleted successfully',
    data: null
  },
  'dbo.p_UploadBankStatement': {
    status: 'success',
    message: 'Bank statement uploaded successfully',
    data: null
  }
};

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Only handle POST requests to /api/OldAPI
  if (req.method === 'POST' && req.url === '/api/OldAPI') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const request = JSON.parse(body);
        const requestId = request.RequestID;

        console.log('\n📨 Received API Request:');
        console.log('  RequestID:', requestId);
        console.log('  FormId:', request.FormId);
        console.log('  RequestData:', JSON.stringify(request.RequestData, null, 2));

        // Get mock response for this procedure
        const mockResponse = mockResponses[requestId] || {
          status: 'error',
          message: `No mock data configured for ${requestId}`,
          data: null
        };

        console.log('📤 Sending Response:');
        console.log('  Status:', mockResponse.status);
        console.log('  Message:', mockResponse.message);
        if (mockResponse.data) {
          console.log('  Data:', JSON.stringify(mockResponse.data, null, 2));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(mockResponse));
      } catch (error) {
        console.error('❌ Error processing request:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'error',
          message: 'Invalid request format',
          data: null
        }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'error',
      message: 'Endpoint not found',
      data: null
    }));
  }
});

server.listen(PORT, () => {
  console.log('🚀 Mock API Server started');
  console.log(`📡 Listening on http://localhost:${PORT}`);
  console.log('📋 Available endpoints:');
  console.log('  POST /api/OldAPI');
  console.log('\n✅ Configured mock procedures:');
  Object.keys(mockResponses).forEach(proc => {
    console.log(`  - ${proc}`);
  });
  console.log('\n⏳ Waiting for requests...\n');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Error: Port ${PORT} is already in use`);
    console.error('Please stop the other process using this port or change the PORT variable');
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});
