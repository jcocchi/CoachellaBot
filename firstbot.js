var builder = require('botbuilder')
var restify = require('restify')

var connector = new builder.ChatConnector()
var bot = new builder.UniversalBot(connector)

// Luis Setup
var luisEndpoint = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/d5050778-d25a-4373-9338-3e0de3270508?subscription-key=1009a010556d42ffb7b3b202f3c15ec7&verbose=true&q='
var recognizer = new builder.LuisRecognizer(luisEndpoint)
var intents = new builder.IntentDialog({ recognizers: [recognizer] })

// Dialogs
bot.dialog('/', intents)
   .matches('Greeting', [
     session => {
       session.send('Hi friend')
     }
   ])
   .matches('MenuInquiry', [
     (session, response) => {
       var entities = extractEntities(session, response)

       entities.forEach(e => {
         session.send('I found an entity: ' + e.entity)
       })

       session.send('You want to know about the menu')
     }
   ])
   .matches('None', [
     session => {
       session.send('I do not understand.')
     }
   ])

// Set up restify server
var server = restify.createServer()
server.listen(process.env.port || process.env.PORT || 3977, function () {
  console.log('listening to: ', server.name, server.url)
})
server.post('/api/messages', connector.listen())

// Helper functions
const extractEntities = (session, response) => {
  var foundEntities = []

  var foodType = builder.EntityRecognizer.findEntity(response.entities, 'FoodType')
  var money = builder.EntityRecognizer.findEntity(response.entities, 'builtin.money')

  if (foodType) {
    session.userData.foodType = foodType
    foundEntities.push(foodType)
  }
  if (money) {
    session.userData.money = money
    foundEntities.push(money)
  }

  return foundEntities
}
