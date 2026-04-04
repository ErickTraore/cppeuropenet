# Dockerfile pour user-backend (Node.js/Express)
FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 7001
CMD ["sh", "-c", "npm install && node server.dev.js"]
