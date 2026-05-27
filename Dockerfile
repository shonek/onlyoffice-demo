FROM node:22.13.0 AS build-frontend

WORKDIR /build

COPY frontend/package.json frontend/package-lock.json ./

RUN npm ci

COPY frontend/ ./

RUN npm run build



FROM node:22.13.0 AS production

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev

COPY index.js http.js db.js ./
COPY services/ ./services/
COPY utils/ ./utils/

COPY --from=build-frontend /build/dist ./frontend/dist

RUN mkdir -p /app/files

ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "index.js"]
