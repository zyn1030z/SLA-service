FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production=false
COPY . .
RUN npx nest -v >/dev/null 2>&1 || npm i -g @nestjs/cli
EXPOSE 3000 9229
CMD ["sh", "-c", "npm install --production=false && npm run start:debug"]
# CMD ["npm", "run", "start:dev"]
