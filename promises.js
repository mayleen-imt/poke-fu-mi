const users = [
  {"id": 1, "name": "John", "email": "john.doe@mail.com"},
  {"id": 2, "name": "Mary", "email": "mary.janne@mail.com"},
  {"id": 3, "name": "Mary", "email": "mary.janne@mail.com"},
]

function getJson(url){
  const parsedUrl = new URL(url)
  const path = parsedUrl.pathname
  const userId = path.split('/users/')[1]

  return new Promise((resolve, reject) => {
    if (path == "/users") {
      resolve(users)
    } else if (userId && userId == 1) {
      resolve({"language": "EN"})
    } else if (userId && userId == 2) {
      resolve({"language": "FR"})
    } else reject("Address not found: " + url)
  })
}

function getUsers(){
  return getJson("http://localhost:8000/users")
}

function getUserPreferences(userId){
  return getJson(`http://localhost:8000/users/${userId}`)
}

function completeUser(user){
  return getUserPreferences(user.id)
  .then( pref => {
      return {...user, preferences: pref }
    }
  )
}

getUsers()
.then(users => 
   Promise.all(users.map(completeUser))
)
.then( result =>
  console.log('Result ', result)
).catch( reason =>
  console.error('Ooops: ' + reason)
)
