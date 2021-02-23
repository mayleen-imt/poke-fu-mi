import cors from 'cors'
import express, { request, response } from 'express'
import * as bodyParser from 'body-parser'
import * as db from './db'
import * as gameRules from './game'
import { Match, Round, RoundInput } from './models'

const app = express();

app.use(cors());
app.use(bodyParser.json({
    limit: '50mb',
    verify(req: any, res, buf, encoding) {
        req.rawBody = buf;
    }
}));
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/', (req, res) => res.send('Welcome to Poke-Fu-Mi!!'));

app.get('/users', (request, response) => {
  db.getUsers().then( users =>
    response.status(200).json(users)
  ).catch( error =>
    response.status(500).send(error)
  )
})

app.post('/users', (request, response) => {
  db.addUser(request.body.name).then( () => {
    response.status(200).send()
  }).catch( error =>
    response.status(500).send(error)
  );
})

// app.get('/users/:id', (request, response) => {
//   const id = parseInt(request.params.id)
//   response.send("The user " + id)
// })

app.post('/match', (request, response) => {
  db.addMatch(request.body.idPlayer1).then( result => {
    response.status(200).send({match_id: result, match_url: '/'})
  }).catch( error =>
    response.status(500).send(error)
  );
})

app.get('/match', (request, response) => {
  db.getMatches()
  .then(matches => response.status(200).send(matches))
  .catch( error =>
    response.status(500).send(error)
  );
})

app.get('/match/:id', (request, response) => {
  const id = parseInt(request.params.id);
  getMatch(id)
  .then(match => db.getMatchRounds(match.id).then(rounds => ({...match, rounds})))
  .then(match => response.status(200).send(match))
  .catch( handleError(response) );
})

app.put('/match/:id', (request, response) => {
  const matchId = parseInt(request.params.id);

  getMatch(matchId)
  .then(match => gameRules.validateMatchUpdateInput(match, request.body))
  .then(() => db.updateMatch(matchId, request.body))
  .then(() => db.getMatch(matchId))
  .then(match => response.status(200).send(match))
  .catch( handleError(response) );
})

app.post('/round', (request, response) => {
  getMatchWithRounds(request.body.matchId)
  .then(matchWithRounds => gameRules.validateRoundInput(matchWithRounds, request.body))
  .then(input => db.createRound(input))
  .then(() => db.getRound(request.body.matchId, request.body.roundNumber ))
  .then( round => response.status(200).send(round))
  .catch( handleError(response) );
})

app.put('/round', (request, response) => {
  getMatchWithRounds(request.body.matchId)
  .then(matchWithRounds => gameRules.validateRoundInput(matchWithRounds, request.body).then(input => ([input, matchWithRounds.idPlayer1, matchWithRounds.idPlayer2])))
  .then(([input, idPlayer1, idPlayer2]) => updateRound(input as RoundInput, idPlayer1 as number, idPlayer2 as number))
  .then(round => updateMatchState(request.body.matchId)
    .then(match => updateMatchPlayersScore(match))
    .then(() => round)
  )
  .then(round => response.status(200).send(round))
  .catch( handleError(response) );
})

function handleError(response: any) {
  return (error: Error) => {
    if (error.message === "not_found")
      response.status(404).send()
    else {
      console.log('oops', error)
      response.status(500).send(error)
    }
  }
}

async function getMatch(matchId: number) {
  return db.getMatch(matchId)
    .then(matches => {
      if (matches.length === 0) {
        throw new Error("not_found")
      } else
        return matches[0]
    })
}

async function getMatchWithRounds(matchId: number) {
  return getMatch(matchId)
    .then(match => db.getMatchRounds(match.id).then(rounds => ({...match, rounds})))
}

async function getRound(matchId: number, roundNumber: number) {
  return db.getRound(matchId, roundNumber)
    .then(rounds => {
      if (rounds.length === 0) {
        throw new Error("not_found")
      } else
        return rounds[0]
    })
}

async function updateRound(input: RoundInput, idPlayer1: number, idPlayer2: number): Promise<Round> {
  return db.updateRound(input)
    .then(() => getRound(input.matchId, input.roundNumber))
    .then(round => gameRules.computeRoundUpdate(round, idPlayer1, idPlayer2))
    .then(round => db.updateRoundStatusAndWinner(input.matchId, input.roundNumber, round.status, round.winner))
    .then(() => getRound(input.matchId, input.roundNumber))
}

async function updateMatchState(matchId: number): Promise<Match> {
  return getMatchWithRounds(matchId)
    .then(match => gameRules.computeMatchUpdate(match))
    .then(match => db.updateMatchStatusAndWinner(matchId, match.status, match.winner))
    .then(() => getMatchWithRounds(matchId))
}

async function updateMatchPlayersScore(match: Match) {
  const player1Promise = db.getUser(match.idPlayer1).then(users => users[0]) //very optimistic ^^'
  const player2Promise = db.getUser(match.idPlayer2).then(users => users[0])

  Promise.all([player1Promise, player2Promise])
    .then(([player1, player2]) => [
      [player1.id, gameRules.computePlayerScore(player1.id, player1.score, match.winner)],
      [player2.id, gameRules.computePlayerScore(player2.id, player2.score, match.winner)]
    ]).then(
      ([player1WithScore, player2WithScore]) => Promise.all([
        db.updateUserScore(player1WithScore[0], player1WithScore[1]),
        db.updateUserScore(player2WithScore[0], player2WithScore[1])
      ])
    )
}

export {app};
