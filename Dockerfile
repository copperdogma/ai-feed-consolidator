FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build frontend
RUN npm run build

EXPOSE 3000
EXPOSE 5173

# Start both frontend and backend in development
CMD ["sh", "-c", "npm run dev & node src/server/index.js"] 