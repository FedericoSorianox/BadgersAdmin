const express = require('express');
const app = express();
app.use((req, res, next) => {
    console.log('req.path:', req.path);
    next();
});
const request = require('supertest');
request(app).get('/api/auth/login').then(() => process.exit(0));
