import mysql from 'mysql';
import fs from 'fs';
// const waitPort = require('wait-port');

let pool: mysql.Pool;

export async function init() {
    const {
      MYSQL_HOST: HOST,
      MYSQL_HOST_FILE: HOST_FILE,
      MYSQL_USER: USER,
      MYSQL_USER_FILE: USER_FILE,
      MYSQL_PASSWORD: PASSWORD,
      MYSQL_PASSWORD_FILE: PASSWORD_FILE,
      MYSQL_DB: DB,
      MYSQL_DB_FILE: DB_FILE,
    } = process.env;
  
    const host = HOST_FILE ? fs.readFileSync(HOST_FILE).toString() : HOST;
    const user = USER_FILE ? fs.readFileSync(USER_FILE).toString() : USER;
    const password = PASSWORD_FILE ? fs.readFileSync(PASSWORD_FILE).toString() : PASSWORD;
    const database = DB_FILE ? fs.readFileSync(DB_FILE).toString() : DB;

    console.log('Connecting to database... ', database);
    // mysql.createConnection(process.env.JAWSDB_MARIA_URL);
    // await waitPort({ host, port : 3306});

    pool = mysql.createPool({
        connectionLimit: 5,
        host,
        user,
        password,
        database,
    });

    return new Promise((accept: Function, reject) => {
        pool.query(
            `
              CREATE TABLE IF NOT EXISTS user (
                id bigint(20) unsigned NOT NULL AUTO_INCREMENT, 
                name varchar(255) NOT NULL, 
                score BIGINT NOT NULL DEFAULT 0, 
                PRIMARY KEY (id))
            `,
            error => {
                if (error) return reject(error);

                console.log(`Connected to mysql db at host ${HOST}`);
                accept();
            },
        );
    });
}

// module.exports = {
//   init
// }