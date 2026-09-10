const bcrypt = require('bcryptjs');
const hash = '$2b$10$i1wnYMyTpJNTWPoatUDRMuc5Bp1nP4wtTcr4Ejh5wsjNSpzOvM..y';
const pass = 'demo1234';
async function test() {
  const isMatch = await bcrypt.compare(pass, hash);
  console.log('Match?', isMatch);
}
test();
