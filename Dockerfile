# Base image
FROM node:18-slim

# Install dependencies for Playwright
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libxkbcommon0 \
    libxcomposite1 \
    libxrandr2 \
    libxdamage1 \
    libpango-1.0-0 \
    libxss1 \
    libasound2 \
    libxshmfence1 \
    libcairo2 \
    libexpat1 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY index.js ./

EXPOSE 3000
CMD ["node", "index.js"]
