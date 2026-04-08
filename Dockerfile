# 使用轻量级 Node.js 镜像
FROM node:18-slim

# 创建工作目录
WORKDIR /app

# 先拷贝 package.json 提高缓存效率
COPY package*.json ./
RUN npm install --production

# 拷贝源代码
COPY . .

# 暴露 80 端口（云托管默认要求）
EXPOSE 80

# 启动服务
CMD ["node", "server.js"]