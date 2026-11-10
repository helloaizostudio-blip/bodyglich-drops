# FRAMEFORGE — single container with Node.js and ffmpeg (needed for video rendering).
FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
# The embedded database, uploaded files and the generated secret live here. Mount a persistent volume at /data.
ENV DATA_DIR=/data
ENV PORT=3000
EXPOSE 3000

# Database migrations are applied automatically when the app first opens the database.
CMD ["npm", "run", "start"]
