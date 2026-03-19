FROM node:22-bookworm

WORKDIR /app

# Install LibreOffice runtime (provides `soffice`) for office->PDF previews.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-core \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-impress \
    libreoffice-common \
    fonts-dejavu \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production

# Render injects PORT at runtime.
EXPOSE 10000

CMD ["npm", "start"]
