# 베이스 이미지로 Node.js 18을 사용
FROM node:18

# 앱 디렉터리를 생성
WORKDIR /usr/src/app

# package.json과 package-lock.json을 복사
COPY package*.json ./

# 프로젝트 의존성 설치
RUN npm install

# 소스 코드를 앱 디렉터리에 복사
COPY . .

# 앱이 5000 포트에서 실행된다고 가정
EXPOSE 5000

# 애플리케이션 시작 명령어
CMD ["npm", "start"]

