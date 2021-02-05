FROM node:12.20.1

# Create app directory
WORKDIR /usr/src/app

COPY . .

RUN npm install

CMD [ "npm", "run", "start" ]

EXPOSE 5000