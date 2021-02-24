FROM node:12.20.1

# Create app directory
WORKDIR /usr/src/app

COPY . .

RUN npm install
RUN npm run build

CMD [ "npm", "start" ]

EXPOSE $APP_PORT