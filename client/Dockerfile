FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY client.js .

CMD ["npm", "run", "dev"]
