FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production=false

COPY . .
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

EXPOSE 3001

CMD ["node", "server.js", "--production"]
