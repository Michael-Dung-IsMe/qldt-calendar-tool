# Sử dụng Node.js image chính thức
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files để tận dụng layer cache
COPY package.json package-lock.json ./
RUN npm install

# Copy toàn bộ mã nguồn
COPY . .

# Build dự án (bỏ qua lint để tránh lỗi không đáng có khi build docker)
RUN npm run build -- --no-lint

# Giai đoạn chạy (Runner) để giảm dung lượng image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy các file cần thiết từ builder
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Mở port 3000
EXPOSE 3000

# Chạy Next.js
CMD ["npm", "start"]
