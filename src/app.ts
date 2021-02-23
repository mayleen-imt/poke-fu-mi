import express from 'express';
import * as bodyParser from 'body-parser';
import users from './users.json';
// import {db} from './db'
import { User } from './models';

const app = express();

app.use(bodyParser.json({
    limit: '50mb',
    verify(req: any, res, buf, encoding) {
        req.rawBody = buf;
    }
}));

app.get('/', (req, res) => res.send('Welcome to Poke-Fu-Mi!!'));

// app.get('/users', (request, response) => {
//   db.query('SELECT id, name FROM user', (error: any, result: Array<User> ) => { 
//     if (error){
//       response.status(500)  
//     } else {
//       response.status(200).json(result);
//     }    
//   })
// })

// app.post('/users', (request, response) => {
//   db.query(`INSERT (name) INTO user VALUES (${request.body.name})`, (error: any, result: Array<User> ) => {
//     if (error){
//       response.status(500)  
//     } else {
//       response.status(200).json(users)
//     }    
//   })  
// })

// app.get('/users/:id', (request, response) => {
//   const id = parseInt(request.params.id)
//   response.send("The user " + id)
// })

export {app};
