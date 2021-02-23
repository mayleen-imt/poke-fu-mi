import {app} from './app'
import * as db from './db';
import {AddressInfo} from 'net'
import dotenv from 'dotenv';
// const waitPort = require('wait-port');

if (process.env.NODE_ENV === 'dev') {
  console.log('loading config from .env file ...', dotenv.config());
}

db
.init()
.then( () => {
  const { PORT } = process.env;

  app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
}).catch((err) => {
  console.error(err);
  process.exit(1);
});

const gracefulShutdown = () => {
  process.exit()
  // db.teardown()
  //     .catch(() => {})
  //     .then(() => process.exit());
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown); // Sent by nodemon
