import mysql from 'mysql';
import fs from 'fs';
import { User, Match, MatchUpdateInput, RoundInput, Round, RoundStatus, MatchStatus } from './models';
import { query } from 'express';
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

    return Promise.all([createUserTable(), createMatchTable(), createRoundTable()])
    .then(() => 
      console.log(`Connected to mysql db at host ${HOST}`)
    );
}

async function createUserTable() {
  return new Promise((accept: Function, reject) => {
    pool.query(
      `
        CREATE TABLE IF NOT EXISTS user (
          id bigint(20) unsigned NOT NULL AUTO_INCREMENT, 
          name varchar(255) NOT NULL, 
          score BIGINT NOT NULL DEFAULT 0, 
          PRIMARY KEY (id),
          UNIQUE KEY name (name)
        );
      `,
      error => {
        if (error) return reject(error);
        accept();
      }
    )
  })
}

/**
 * Match status: "CREATED", "IN_PROGRESS", "FINISHED"
 */
async function createMatchTable() {
  return new Promise((accept: Function, reject) => {
    pool.query(
      `
        CREATE TABLE IF NOT EXISTS pokemon_match (
          id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
          player1 bigint(20) unsigned,
          player2 bigint(20) unsigned,
          pokemons_player1 varchar(255),
          pokemons_player2 varchar(255),
          status varchar(255) NOT NULL DEFAULT "CREATED",
          winner bigint(20),
          PRIMARY KEY (id),
          FOREIGN KEY (player1) REFERENCES user(id) ON DELETE CASCADE,
          FOREIGN KEY (player2) REFERENCES user(id) ON DELETE CASCADE
        )
      `,
      error => {
        if (error) return reject(error);
        accept();
      }
    )
  })
}

/**
 * Round status: "STARTED", "FINISHED"
 */
async function createRoundTable() {
  return new Promise((accept: Function, reject) => {
    pool.query(
      `
        CREATE TABLE IF NOT EXISTS match_round (
          round_number integer NOT NULL,
          match_id bigint(20) unsigned NOT NULL,
          pokemon_player1 varchar(255),
          pokemon_player2 varchar(255),
          status varchar(255) NOT NULL DEFAULT "STARTED",
          winner bigint(20),
          PRIMARY KEY (round_number, match_id),
          FOREIGN KEY (match_id) REFERENCES pokemon_match(id) ON DELETE CASCADE
        )
      `,
      error => {
        if (error) return reject(error);
        accept();
      }
    )
  })
}

export async function teardown() {
  return new Promise((acc: Function, rej) => {
      pool.end(err => {
          if (err) rej(err);
          else acc();
      });
  });
}

export async function getUsers() {
  return queryMany<User>('SELECT id, name, score FROM user')
}

export async function getUser(userId: number) {
  return queryMany<User>('SELECT id, name, score FROM user WHERE id = ?', userId)
}

export async function addUser(name: string) {
  return update('INSERT INTO user (name) VALUES (?)', [name])
}

export async function addMatch(idPlayer1: number) {
  return update('INSERT INTO pokemon_match (player1) VALUES (?)', [idPlayer1])
}

export async function getMatch(matchId: number): Promise<Array<Match>> {
  return queryMany<Match>('SELECT * FROM pokemon_match WHERE id = ?', matchId)
    .then(matches => matches.map(parseMatchRow))
}

// @optimize-me
// export async function getMatchWithRounds(matchId: number): Promise<Array<Match>> {
//   return queryMany<Match>('SELECT * FROM pokemon_match LEFT JOIN  WHERE id = ?', matchId)
//     .then(matches => matches.map(parseMatchRow))
// }

export async function getMatches(): Promise<Array<Match>> {
  return queryMany<Match>('SELECT * FROM pokemon_match')
    .then(matches => matches.map(parseMatchRow))
}

export async function updateMatch(matchId: number, matchInput: MatchUpdateInput) {
  let values: Array<any> = []

  let updatePlayer2 = matchInput.idPlayer2 ? 'player2 = ?' : '';
  values = matchInput.idPlayer2 ? [... values, matchInput.idPlayer2] : values;

  let updatePokemonsPlayer1 = matchInput.pokemonsPlayer1 ? 'pokemons_player1 = ?' : '';
  values = matchInput.pokemonsPlayer1 ? [... values, mkString(matchInput.pokemonsPlayer1, ',')] : values;

  let updatePokemonsPlayer2 = matchInput.pokemonsPlayer2 ? 'pokemons_player2 = ?' : '';
  values = matchInput.pokemonsPlayer2 ? [... values, mkString(matchInput.pokemonsPlayer2, ',')] : values;

  let updateStatus = matchInput.status ? 'status = ?' : '';
  values = matchInput.status ? [... values, matchInput.status] : values;

  let updateSet = [updatePlayer2, updatePokemonsPlayer1, updatePokemonsPlayer2, updateStatus].filter(s => s.length > 0)
  let updateSetFragment = mkString(updateSet, ',')

  return update(`
    UPDATE pokemon_match SET ${updateSetFragment}
      WHERE id = ?`, [... values, matchId]
  )
}

function mkString<T>(array: Array<T>, separator: string): string {
  return array.map(i => i.toString()).reduce((prev, curr) => `${prev}${separator} ${curr}`)
}

export async function getMatchRounds(matchId: number): Promise<Array<Round>> {
  return queryMany('SELECT * FROM match_round WHERE match_id = ?', matchId)
    .then(matches => matches.map(parseMatchRoundRow))
}

export async function createRound(input: RoundInput) {
  return update('INSERT INTO match_round (round_number, match_id) VALUES (?, ?)', [input.roundNumber, input.matchId])
}

export async function updateRound(input: RoundInput) {
  let values: Array<any> = []

  let updatePokemonsPlayer1 = input.pokemonPlayer1 ? 'pokemon_player1 = ?' : '';
  values = input.pokemonPlayer1 ? [... values, input.pokemonPlayer1] : values;

  let updatePokemonsPlayer2 = input.pokemonPlayer2 ? 'pokemon_player2 = ?' : '';
  values = input.pokemonPlayer2 ? [... values, input.pokemonPlayer2] : values;

  let updateStatus = input.status ? 'status = ?' : '';
  values = input.status ? [... values, input.status] : values;

  let updateSet = [updatePokemonsPlayer1, updatePokemonsPlayer2, updateStatus].filter(s => s.length > 0)
  let updateSetFragment = mkString(updateSet, ',')

  return update(
    `UPDATE match_round SET ${updateSetFragment} WHERE round_number = ? AND match_id = ?`, 
    [... values, input.roundNumber, input.matchId]
  )
}

export async function updateRoundStatusAndWinner(matchId: number, roundNumber: number, newStatus: RoundStatus, newWinner: number) {
  return update(
    `UPDATE match_round SET status = ?, winner = ? WHERE match_id = ? AND round_number = ? `,
    [newStatus, newWinner, matchId, roundNumber]
  )
}

export async function updateMatchStatusAndWinner(matchId: number, newStatus: MatchStatus, newWinner: number) {
  return update(
    `UPDATE pokemon_match SET status = ?, winner = ? WHERE id = ?`,
    [newStatus, newWinner, matchId]
  )
}

export async function getRound(matchId: number, roundNumber: number) {
  return queryMany('SELECT * FROM match_round WHERE match_id = ? AND round_number = ?', [matchId, roundNumber])
    .then(matches => matches.map(parseMatchRoundRow))  
}

export async function updateUserScore(userId: number, newScore: number) {
  return update(
    `UPDATE user SET score = ? WHERE id = ?`,
    [newScore, userId]
  )  
}

function update<T>(statement: string, values: any) {
  return new Promise((accept: Function, reject) => {
    pool.query(statement, values, (error: any, result: any ) => {      
      if (error) 
        return reject(error)
      else
        accept(result.insertId);
    });
  });  
}

function queryMany<T>(statement: string, values: any = []): Promise<Array<T>> {
  return new Promise((accept: Function, reject) => {
    pool.query(statement, values, (error: any, result: Array<T> ) => {
      if (error)
        return reject(error);
      else accept(result)
    })
  })
}

function parseMatchRow(matchRpw: any): Match {
  return {
    id: matchRpw.id,
    idPlayer1: matchRpw.player1,
    idPlayer2: matchRpw.player2,
    pokemonsPlayer1: matchRpw.pokemons_player1 ? matchRpw.pokemons_player1.split(',').map((p: string) => p.trim()) : [],
    pokemonsPlayer2: matchRpw.pokemons_player2 ? matchRpw.pokemons_player2.split(',').map((p: string) => p.trim()) : [],
    status: matchRpw.status,
    winner: matchRpw.winner,
    rounds: []
  }
}

function parseMatchRoundRow(row: any): Round {
  return {
    matchId: row.match_id,
    roundNumber: row.round_number,
    pokemonPlayer1: row.pokemon_player1,
    pokemonPlayer2: row.pokemon_player2,
    status: row.status,
    winner: row.winner
  }
}