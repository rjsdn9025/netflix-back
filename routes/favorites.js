const express = require('express');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const router = express.Router();

// MySQL RDS 데이터베이스 연결 설정
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

// JWT 토큰에서 사용자 ID 추출 함수
function getUserIdFromToken(authHeader) {
  if (!authHeader) return null;
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.sub;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

// 찜한 영화 목록 가져오기
router.get('/', async (req, res) => {
  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [favorites] = await connection.query(
      'SELECT m.* FROM favorites f JOIN movies m ON f.movie_id = m.id WHERE f.user_id = ?',
      [userId]
    );
    res.json(favorites);
    await connection.end();
  } catch (error) {
    console.error('Failed to retrieve favorites:', error);
    res.status(500).json({ error: 'Failed to retrieve favorites' });
  }
});

// 찜하기 추가
router.post('/', async (req, res) => {
  const { movieId } = req.body;
  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.query('INSERT INTO favorites (user_id, movie_id) VALUES (?, ?)', [userId, movieId]);
    res.json({ message: 'Favorite added' });
    await connection.end();
  } catch (error) {
    console.error('Failed to add favorite:', error);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

// 찜하기 취소
router.delete('/:movieId', async (req, res) => {
  const movieId = req.params.movieId;
  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.query('DELETE FROM favorites WHERE user_id = ? AND movie_id = ?', [userId, movieId]);
    res.json({ message: 'Favorite removed' });
    await connection.end();
  } catch (error) {
    console.error('Failed to remove favorite:', error);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

module.exports = router;
