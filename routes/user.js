const express = require('express');
const { CognitoIdentityProviderClient, SignUpCommand, InitiateAuthCommand, AdminGetUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
const jwt = require('jsonwebtoken');
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

// AWS Cognito 클라이언트 생성
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

// JWT 토큰 생성 함수
function generateToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: '6h' });
}

// 회원가입 API (영구 비밀번호 방식으로 변경)
router.post('/signup', async (req, res) => {
  const { email, password, name } = req.body;

  const params = {
    ClientId: process.env.COGNITO_CLIENT_ID, // Cognito 앱 클라이언트 ID
    Username: email,
    Password: password, // 영구 비밀번호 설정
    UserAttributes: [
      { Name: 'email', Value: email },
      { Name: 'name', Value: name },
    ],
  };

  try {
    // AWS Cognito에 사용자 생성
    const data = await cognitoClient.send(new SignUpCommand(params));

    // MySQL DB에 사용자 정보 저장
    const connection = await mysql.createConnection(dbConfig);
    const insertQuery = 'INSERT INTO users (name, email) VALUES (?, ?)';
    await connection.execute(insertQuery, [name, email]);
    await connection.end(); // DB 연결 종료

    res.json({ message: 'User signed up successfully', data });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({ error: error.message });
  }
});

// 로그인 API
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const params = {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: process.env.COGNITO_CLIENT_ID,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  };

  try {
    const data = await cognitoClient.send(new InitiateAuthCommand(params));

    // JWT 토큰 생성
    const token = generateToken(data.AuthenticationResult.AccessToken);

    // MySQL에서 사용자 정보 가져오기 (필요한 경우)
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);
    await connection.end();

    if (rows.length === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    // 로그인 성공, 토큰과 사용자 정보 반환
    res.json({
      token,
      message: '로그인 성공',
    });
  } catch (error) {
    console.error('Error during Cognito login:', error);
    res.status(401).json({ error: '로그인에 실패했습니다.' });
  }
});

// JWT 토큰에서 사용자 ID 추출 함수 (토큰 검증 추가)
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

// 사용자 정보 조회 API
router.get('/me', async (req, res) => {
  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const params = {
    UserPoolId: process.env.COGNITO_USER_POOL_ID,
    Username: userId,
  };

  try {
    const userData = await cognitoClient.send(new AdminGetUserCommand(params));
    res.json({
      email: userData.UserAttributes.find((attr) => attr.Name === 'email').Value,
      name: userData.UserAttributes.find((attr) => attr.Name === 'name').Value,
    });
  } catch (error) {
    console.error('Failed to get user data from Cognito:', error);
    res.status(500).json({ error: 'Failed to retrieve user data' });
  }
});

// 찜한 영화 목록을 가져오는 API
router.get('/movies/favorites', async (req, res) => {
  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const query = `SELECT movies.id, movies.title, movies.poster_url 
                 FROM favorites 
                 INNER JOIN movies ON favorites.movie_id = movies.id 
                 WHERE favorites.user_id = ?`;

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(query, [userId]);
    await connection.end(); // DB 연결 종료
    res.json(rows); // 찜한 영화 목록 응답
  } catch (error) {
    console.error('Error fetching favorite movies:', error);
    res.status(500).json({ error: 'Failed to fetch favorite movies' });
  }
});

// 찜하기 API (중복 방지 처리 추가)
router.post('/movies/favorite', async (req, res) => {
  const userId = getUserIdFromToken(req.headers.authorization);
  const { movieId } = req.body;

  if (!userId || !movieId) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const checkQuery = 'SELECT * FROM favorites WHERE user_id = ? AND movie_id = ?';
  const insertQuery = 'INSERT INTO favorites (user_id, movie_id) VALUES (?, ?)';

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [existing] = await connection.execute(checkQuery, [userId, movieId]);
    if (existing.length > 0) {
      await connection.end(); // DB 연결 종료
      return res.status(409).json({ message: 'Movie already in favorites' });
    }

    await connection.execute(insertQuery, [userId, movieId]);
    await connection.end(); // DB 연결 종료
    res.json({ message: 'Movie added to favorites' });
  } catch (error) {
    console.error('Error adding movie to favorites:', error);
    res.status(500).json({ error: 'Failed to add movie to favorites' });
  }
});

// 찜한 영화 삭제 API
router.delete('/movies/favorite/:movieId', async (req, res) => {
  const userId = getUserIdFromToken(req.headers.authorization);
  const { movieId } = req.params;

  if (!userId || !movieId) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const query = 'DELETE FROM favorites WHERE user_id = ? AND movie_id = ?';

  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute(query, [userId, movieId]);
    await connection.end(); // DB 연결 종료
    res.json({ message: 'Movie removed from favorites' });
  } catch (error) {
    console.error('Error removing movie from favorites:', error);
    res.status(500).json({ error: 'Failed to remove movie from favorites' });
  }
});

module.exports = router;
