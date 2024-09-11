const express = require('express');
const cors = require('cors');
require('dotenv').config(); // .env 파일에서 환경 변수 로드

const app = express();
const PORT = process.env.PORT || 5000;  // 기본 포트는 5000

// CORS 설정
app.use(cors());

// JSON 요청 본문을 파싱하는 미들웨어
app.use(express.json());

// 라우터 불러오기
const moviesRouter = require('./routes/movies');
const userRouter = require('./routes/user');

// 라우터 사용
app.use('/api/movies', moviesRouter);  // 영화 관련 API 라우트
app.use('/api/user', userRouter);      // 사용자 관련 API 라우트

// 서버 시작
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
