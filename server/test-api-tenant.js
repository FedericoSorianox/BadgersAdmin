const jwt = require('jsonwebtoken');
const token = jwt.sign({ user: { id: "123", role: "admin", tenantId: "5f8d0d55b54764421b7156d9" }, tenantId: "5f8d0d55b54764421b7156d9" }, 'secret', { expiresIn: '1h' });
const http = require('http');
const req = http.request('http://localhost:5001/api/settings', {
  headers: { 'Authorization': 'Bearer ' + token }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(res.statusCode, data));
});
req.end();
