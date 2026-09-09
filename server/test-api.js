const jwt = require('jsonwebtoken');
const token = jwt.sign({ user: { id: "123", role: "superadmin", tenantId: null }, tenantId: null }, 'secret', { expiresIn: '1h' });
const http = require('http');
const req = http.request('http://localhost:5001/api/settings', {
  headers: { 'Authorization': 'Bearer ' + token }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(res.statusCode, data));
});
req.end();
