var restify = require('restify')
var builder = require('botbuilder')
var request = require('request')
var querystring = require('querystring')
var cognitiveservices = require('botbuilder-cognitiveservices')

var connector = new builder.ChatConnector()
var bot = new builder.UniversalBot(connector)

// Set up restify server
var server = restify.createServer()
server.listen(process.env.port || process.env.PORT || 3977, function () {
  console.log('listening to: ', server.name, server.url)
})
server.post('/api/messages', connector.listen())

// Luis Setup
var luisEndpoint = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/d5050778-d25a-4373-9338-3e0de3270508?subscription-key=1009a010556d42ffb7b3b202f3c15ec7&verbose=true&q='
var luisRecognizer = new builder.LuisRecognizer(luisEndpoint)
var qnaRecognizer = new cognitiveservices.QnAMakerRecognizer({
  knowledgeBaseId: '6f180442-2db5-4396-93b3-0d13939f8032',
  subscriptionKey: '80ad91511f4c4f10afde83d92c69844b'})

var BasicQnAMakerDialog = new cognitiveservices.QnAMakerDialog({
  recognizers: [qnaRecognizer],
  defaultMessage: 'No good match in FAQ.',
  qnaThreshold: 0.5})

var intents = new builder.IntentDialog(
  {
    recognizers: [
      // qnaRecognizer,
      luisRecognizer],
    intentThreshold: 0.5,
    recognizeOrder: builder.RecognizeOrder.series
  })

// bot.dialog('/', BasicQnAMakerDialog)

// bot.dialog('/', intents)
//    .recognize(context, [
//      (err, result) => {
//        if (err) throw err
//        if (result.score >= 0.5) {
//          console.log(result.score)
//        }
//      }
//    ])

// Dialogs
bot.dialog('/', intents)
  //  .matches('Greeting', [
  //    session => {
  //      session.send('Hi friend')
  //    }
  //  ])
  //  .matches('MenuInquiry', [
  //    (session, response) => {
  //      var entities = extractEntities(session, response)

  //      entities.forEach(e => {
  //        session.send('I found an entity: ' + e.entity)
  //      })

  //      session.send('You want to know about the menu')
  //    }
  //  ])
  .onDefault((session, args, next) => {
    // Just throw everything into the qna service
    qna(session.message.text, (err, result) => {
      if (err) {
        console.error(err)
        session.send('Unfortunately an error occurred. Try again.')
      } else {
        // The QnA returns a JSON: { answer:XXXX, score: XXXX: }
        // where score is a confidence the answer matches the question.
        // Advanced implementations might log lower scored questions and
        // answers since they tend to indicate either gaps in the FAQ content
        // or a model that needs training
        session.send(JSON.parse(result).answer)
      }
    })
  })

// Helper functions
const qna = (q, cb) => {
  // Here's where we pass anything the user typed along to the
  // QnA service.

  q = querystring.escape(q)
  request('http://qnaservice.cloudapp.net/KBService.svc/GetAnswer?kbId=6f180442-2db5-4396-93b3-0d13939f8032&question=' + q, function (error, response, body) {
    if (error) {
      cb(error, null)
    } else if (response.statusCode !== 200) {
      // Valid response from QnA but it's an error
      // return the response for further processing
      cb(response, null)
    } else {
      // All looks OK, the answer is in the body
      cb(null, body)
    }
  })
}

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
