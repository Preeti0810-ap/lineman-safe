const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'lineman_safe',
  user: 'postgres',
  password: 'postgres123',
});

module.exports = pool;