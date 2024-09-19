const express = require('express');
const mysql = require('mysql2/promise');
require('dotenv').config();

const router = express.Router();

// MySQL RDS 데이터베이스 연결 설정
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

// 영화 데이터 가져오기
router.get('/', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.query('SELECT * FROM movies');
    res.json(rows);
    await connection.end();
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to retrieve movies' });
  }
});

// 특정 영화 데이터 가져오기
router.get('/:movieId', async (req, res) => {
  const movieId = req.params.movieId;
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.query('SELECT * FROM movies WHERE id = ?', [movieId]);
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ error: 'Movie not found' });
    }
    await connection.end();
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to retrieve movie' });
  }
});

module.exports = router;
