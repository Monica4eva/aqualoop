
FROM node:22-slim

WORKDIR /app

COPY package*.json ./

RUN npm ci --include=dev

COPY scripts/local-households-api.ts ./scripts/local-households-api.ts

ENV PORT=8080

EXPOSE 8080

CMD ["./node_modules/.bin/tsx", "scripts/local-households-api.ts"]
