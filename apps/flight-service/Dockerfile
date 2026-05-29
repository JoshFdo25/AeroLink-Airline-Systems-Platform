FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN DATABASE_URL="postgresql://dummy:dummy@dummy/dummy" npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

EXPOSE 3001
CMD ["npm", "run", "start:prod"]
