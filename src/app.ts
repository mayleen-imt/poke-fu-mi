import express from 'express';
import * as bodyParser from 'body-parser';
import users from './users.json';
const app = express();

app.use(bodyParser.json({
    limit: '50mb',
    verify(req: any, res, buf, encoding) {
        req.rawBody = buf;
    }
}));

app.get('/', (req, res) => res.send('Hello World!'));

app.get('/users', (request, response) => {
  response.status(200).json(users)
})

app.post('/users', (request, response) => {
  users.push(request.body)
  response.status(200).json(users)
})

app.get('/users/:id', (request, response) => {
  const id = parseInt(request.params.id)
  response.send("The user " + id)
})

app.get('/users/:id/playlist', (request, response) => {
  const id = parseInt(request.params.id)
  response.send("The playlist of user " + id)
})

app.get('/users/:id/suggestions', (request, response) => {
  const id = parseInt(request.params.id)
  response.send("Already suggested for user " + id)
})

app.post('/users/:id/suggestions', (request, response) => {
  const id = parseInt(request.params.id)
  const newSuggestion = request.body
  response.status(200)
})

export {app};
