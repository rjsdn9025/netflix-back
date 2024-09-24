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
      const movie = rows[0];
      // 영화 정보를 반환, watch_url을 추가
      res.json({
        id: movie.id,
        title: movie.title,
        description: movie.description,
        poster_url: movie.poster_url,
        trailer_url: movie.trailer_url,  // YouTube 트레일러 URL
        watch_url: movie.watch_url       // S3에 저장된 영상 URL
      });
    } else {
      res.status(404).json({ error: '해당 영화를 찾을 수 없습니다.' });
    }
    await connection.end();
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: '영화 정보를 불러오는 중 오류 발생했습니다.' });
  }
});

// 특정 영화 시청 페이지를 위한 S3 URL 제공 (watch_url 사용)
router.get('/:movieId/watch', async (req, res) => {
  const movieId = req.params.movieId;
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.query('SELECT * FROM movies WHERE id = ?', [movieId]);
    if (rows.length > 0) {
      const movie = rows[0];
      // 시청을 위한 S3 버킷에서 가져온 URL (watch_url 필드) 반환
      res.json({
        id: movie.id,
        title: movie.title,
        watch_url: movie.watch_url,  // S3에 저장된 영화 시청 URL
      });
    } else {
      res.status(404).json({ error: '해당 영화를 찾을 수 없습니다.' });
    }
    await connection.end();
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: '영화 시청 정보를 불러오는 중 오류 발생했습니다.' });
  }
});

module.exports = router;
