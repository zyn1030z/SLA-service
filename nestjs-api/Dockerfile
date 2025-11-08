FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx nest -v >/dev/null 2>&1 || npm i -g @nestjs/cli
EXPOSE 3000 9229
CMD ["npm", "run", "start:dev"]
