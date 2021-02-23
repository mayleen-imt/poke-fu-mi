export interface User {
  id: number;
  name: string;
  score: number;
}

export type MatchStatus = "CREATED" | "IN_PROGRESS" | "FINISHED"

export interface Match {
  id: number,
  idPlayer1: number,
  idPlayer2 ?: number,
  pokemonsPlayer1 ?: Array<string>,
  pokemonsPlayer2 ?: Array<string>,
  status : MatchStatus,
  winner ?: number,
  rounds : Round[]
}

export interface MatchUpdateInput {
  idPlayer2 ?: number,
  pokemonsPlayer1 ?: Array<string>,
  pokemonsPlayer2 ?: Array<string>,
  status ?: string
}

export type RoundStatus = "STARTED" | "FINISHED"

export interface RoundInput {
  matchId: number,
  roundNumber: 1 | 2 | 3 | 4 | 5 | 6,
  pokemonPlayer1 ?: string,
  pokemonPlayer2 ?: string,
  status ?: string  
}

export type RoundNumber = 1 | 2 | 3 | 4 | 5 | 6;

export interface Round {
  matchId: number,
  roundNumber: RoundNumber,
  pokemonPlayer1 : string,
  pokemonPlayer2 : string,
  status : RoundStatus,
  winner: number
}
