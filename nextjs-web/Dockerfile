FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
# RUN npm install --platform=linux --arch=arm64 @next/swc-linux-arm64-musl@latest --no-save
# RUN npm install --platform=linux --arch=x64
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]
