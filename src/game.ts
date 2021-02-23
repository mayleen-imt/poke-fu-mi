import PokeAPI from './wsClient';
import { Match, MatchStatus, MatchUpdateInput, Round, RoundInput, RoundStatus } from './models';

const pokeApiClient = new PokeAPI()

type PokemonTypeName = "flying" | "poison" | "ground" | "rock" | "bug" | "ghost" | "steel" | "fire" | "water" | "grass" | "electric" | "psychic" | "ice" | "dragon" | "dark" | "fairy" | "unknown" | "shadow"

interface PokemonType {
  name: PokemonTypeName,
  url: string,
  doubleDamageFrom: PokemonType[],
  doubleDamageTo: PokemonType[],
}

interface PokemonTypes {
  slot: number,
  type: PokemonType
}

interface Pokemon {
  name: string,
  types: PokemonTypes[]
}

export async function computeRoundUpdate(round: Round, idPlayer1: number, idPlayer2: number): Promise<Round> {
  const newState = computeRoundState(round)
  if (newState === "FINISHED"){
    return computeRoundWinner(round, idPlayer1, idPlayer2)
    .then( winner => {
      if (winner)
        return {... round, winner: winner, status: newState}
      else
      return {... round, status: newState}
    })
  } else {
    return new Promise((accept: Function, reject) => accept(round))
  }
}

export function computeMatchUpdate(match: Match): Match {
  const newState = computeMatchState(match)
  if (newState === "FINISHED"){
    const winner = computeMatchWinner(match);
    if (winner)
      return {...match, winner : winner, status: newState}
    else
      return {...match, status: newState}
  } else {
    match
  }
}

export function computePlayerScore(userId: number, previousScore: number, matchWinner ?: number): number {
  if (! matchWinner)
    return previousScore + 5
  else if (matchWinner && matchWinner === userId)
    return previousScore + 10
  else return previousScore
}

export function validateMatchUpdateInput(current: Match, input: MatchUpdateInput) {
  return new Promise((accept: Function, reject) => {
    if (input.status && input.status == "FINISHED") {
      reject("Cannot finish a match manually")
    } else if (current.status === "FINISHED") {
      reject("Cannot modify a finished match")
    } else if (input.idPlayer2 && input.idPlayer2 === current.idPlayer1){
      reject("You cannot play against yourself")
    } else if (input.status && input.status === "IN_PROGRESS" && current.status !== "CREATED") {
      reject("Cannot start match: already in progress")
    } else if (input.status && input.status === "IN_PROGRESS" && !current.idPlayer2){
      reject("Cannot start match: still waiting for player 2")
    } else if (input.status && input.status === "IN_PROGRESS" && !current.pokemonsPlayer1){
      reject("Cannot start match: still waiting for player 1's pokemons")
    } else if (input.status && input.status === "IN_PROGRESS" && !current.pokemonsPlayer2){
      reject("Cannot start match: still waiting for player 2's pokemons")
    } else {
      accept(input)
    }
  })
}

export function validateRoundInput(match: Match, input: RoundInput): Promise<RoundInput> {
  return new Promise((accept: Function, reject) => {
    let currentRound = match.rounds.find(r => r.roundNumber == input.roundNumber)
    let lastRoundNumber = match.rounds.map( round => round.roundNumber ).reduce((prev, curr) => prev < curr ? curr : prev, 0);
    let lastRound = match.rounds.find(r => r.roundNumber === lastRoundNumber)
    let usedPokemonsPlayer1 = match.rounds.map( r => r.pokemonPlayer1)
    let usedPokemonsPlayer2 = match.rounds.map( r => r.pokemonPlayer2)

    if (!match.idPlayer2)
      reject("cannot start the round with only one player")

    else if (match.status !== "IN_PROGRESS")
      reject("cannot modify the round if the match is not in progress")

    else if (currentRound && currentRound.status == "FINISHED")
      reject("cannot modify a finished round")

    else if (input.roundNumber !== lastRoundNumber && lastRound.status !== "FINISHED" )
      reject("you must finish previous round")

    else if (input.roundNumber !== lastRoundNumber + 1 && input.roundNumber !== lastRoundNumber)
      reject("invalid round number")

    else if (input.pokemonPlayer1 && !match.pokemonsPlayer1.find(p => p === input.pokemonPlayer1))
      reject("Use only pockemons in your deck")

    else if (input.pokemonPlayer2 && !match.pokemonsPlayer2.find(p => p === input.pokemonPlayer2))
      reject("Use only pockemons in your deck")

    else if (input.pokemonPlayer1 && usedPokemonsPlayer1.find(p => p === input.pokemonPlayer1))
      reject(`${usedPokemonsPlayer1} cannot fight twice`)
    
    else if (input.pokemonPlayer2 && usedPokemonsPlayer2.find(p => p === input.pokemonPlayer2))
      reject(`${usedPokemonsPlayer2} cannot fight twice`)      
    
    else accept(input)
  })
}

function computeRoundWinner(round: Round, idPlayer1: number, idPlayer2: number): Promise<number | null>  {
  let pokemonPlayer1 = pokeApiClient.getPokemon(round.pokemonPlayer1).then(p => p as Pokemon);
  let pokemonPlayer2 = pokeApiClient.getPokemon(round.pokemonPlayer2).then(p => p as Pokemon);

  return Promise.all([pokemonPlayer1, pokemonPlayer2])
    .then(([pokemon1, pokemon2]) => [pokemon1.types[0].type, pokemon2.types[0].type] )
    .then(([type1, type2]) => computeWinnerByType(type1, type2, idPlayer1, idPlayer2))
}

function computeMatchWinner(match: Match): number | null {
  const roundsWonPlayer1 = match.rounds.filter(r => r.winner === match.idPlayer1)
  const roundsWonPlayer2 = match.rounds.filter(r => r.winner === match.idPlayer2)

  if (roundsWonPlayer1 > roundsWonPlayer2)
    return 1
  else if (roundsWonPlayer2 > roundsWonPlayer1)
    return 2
  else
    return null
}

function computeRoundState(round: Round): RoundStatus {
  if(round.pokemonPlayer1 && round.pokemonPlayer2)
    return "FINISHED"
  else
    return "STARTED"
}

function computeMatchState(match: Match): MatchStatus {
  if (isAtLeastOneDeckEmpty(match.rounds, match.pokemonsPlayer1, match.pokemonsPlayer2) && isLastRoundFinished(match.rounds))
    return "FINISHED"
  else
    return "IN_PROGRESS"
}

function isAtLeastOneDeckEmpty(rounds: Round[], deckPlayer1: string[], deckPlayer2: string[]) {
  return rounds.length >= deckPlayer1.length || rounds.length >= deckPlayer2.length
}

function isLastRoundFinished(rounds: Round[]) {
  return rounds.length > 0 && rounds[rounds.length - 1].status === "FINISHED"
}

function computeWinnerByType(type1: PokemonType, type2: PokemonType, idPlayer1: number, idPlayer2: number): Promise<number | null> {
  const type1Details = pokeApiClient.getType(type1.name).then(result => parseType(type1, result))
  const type2Details = pokeApiClient.getType(type2.name).then(result => parseType(type2, result))

  return Promise.all([type1Details, type2Details])
    .then(([type1, type2]) => {
      const isType1Vulnerable = type1.doubleDamageFrom.find(t => t.name === type2.name)
      const isType2Vulnerable = type2.doubleDamageFrom.find(t => t.name === type1.name)

      if (isType1Vulnerable && !isType2Vulnerable)
        return idPlayer2
      else if (!isType1Vulnerable && isType2Vulnerable)
        return idPlayer1
      else
        return null
    })
}

function parseType(pokemonType: PokemonType, apiResult: any): PokemonType {
  return {
    ...pokemonType,
    name: apiResult.name,
    doubleDamageFrom: apiResult.damage_relations.double_damage_from,
    doubleDamageTo: apiResult.damage_relations.double_damage_to
  }
}