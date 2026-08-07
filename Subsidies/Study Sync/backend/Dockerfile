FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ ./
COPY frontend/ ../frontend/

EXPOSE 4000

# JWT_SECRET MUST be set at runtime (docker-compose or -e flag)
ENV NODE_ENV=production
ENV PORT=4000

CMD ["node", "src/index.js"]
