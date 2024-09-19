const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS 설정 (필요한 도메인만 허용하는 것이 보안에 좋습니다)
app.use(cors({
  origin: '*',  // 모든 도메인 허용. 실제 운영환경에서는 특정 도메인으로 제한하세요.
}));

// JSON 요청 본문을 파싱하는 미들웨어
app.use(express.json());

// 라우터 불러오기
const moviesRouter = require('./routes/movies'); 
const userRouter = require('./routes/user'); 
const favoritesRouter = require('./routes/favorites');

// 라우터 사용
app.use('/api/movies', moviesRouter);  // 영화 관련 API 경로
app.use('/api/user', userRouter);      // 사용자 관련 API 경로
app.use('/api/favorites', favoritesRouter); // 찜하기 관련 API 경로

// 기본 경로 테스트
app.get('/', (req, res) => {
  res.send('API 서버가 정상적으로 작동 중입니다.');
});

// Express 서버에 헬스 체크 경로 추가
app.get('/api/health', (req, res) => {
  res.status(200).send('Healthy');
});

// 404 에러 처리 (잘못된 경로 요청)
app.use((req, res, next) => {
  res.status(404).json({ message: '요청하신 페이지를 찾을 수 없습니다.' });
});

// 에러 핸들러 (서버 에러 처리)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: '서버 내부 오류가 발생했습니다.' });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
