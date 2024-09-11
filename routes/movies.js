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

// 영화 데이터 가져오기 (로그인 여부와 상관없이 접근 가능)
router.get('/', async (req, res) => {
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.query('SELECT * FROM movies');
    res.json(rows);  // 영화 데이터를 반환
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Failed to retrieve movies' });
  } finally {
    if (connection) await connection.end();
  }
});

// 찜한 영화 목록 가져오기 (로그인한 사용자만 접근 가능)
router.get('/favorites', async (req, res) => {
  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [favorites] = await connection.query('SELECT * FROM favorites WHERE user_id = ?', [userId]);
    res.json({ favorites });
  } catch (error) {
    console.error('Failed to retrieve favorites:', error);
    res.status(500).json({ error: 'Failed to retrieve favorites' });
  } finally {
    if (connection) await connection.end();
  }
});

// JWT 토큰에서 사용자 ID 추출 함수
function getUserIdFromToken(authHeader) {
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.sub;  // Cognito 토큰에서 사용자 ID 추출
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

module.exports = router;
