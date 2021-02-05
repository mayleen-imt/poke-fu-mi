const express = require('express')
const app = express()
const port = 8000

// Middleware used to interpret json content in requests
app.use(express.json())

app.get('/users', (request, response) => {
  response.send("List of users")
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

app.listen(port, () => {
  console.log(`Listening on ${port}`)
})
