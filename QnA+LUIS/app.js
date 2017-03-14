var restify = require('restify')
var builder = require('botbuilder')
var request = require('request')
var querystring = require('querystring')

var connector = new builder.ChatConnector()
var bot = new builder.UniversalBot(connector)

// Set up restify server
var server = restify.createServer()
server.listen(process.env.port || process.env.PORT || 3977, function () {
  console.log('listening to: ', server.name, server.url)
})
server.post('/api/messages', connector.listen())

var faqURL = 'https://www.coachella.com/faq/'

// Luis Setup
var luisEndpoint = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/f1b517de-3835-4fec-8a93-480fb8bd9a24?subscription-key=1009a010556d42ffb7b3b202f3c15ec7&verbose=true&q='
var luisRecognizer = new builder.LuisRecognizer(luisEndpoint)

var intents = new builder.IntentDialog(
  {
    recognizers: [
      luisRecognizer],
    intentThreshold: 0.2,
    recognizeOrder: builder.RecognizeOrder.series
  })

// Dialogs
bot.dialog('/', intents)
   .matches('Greeting', [
     session => {
       session.send(`Hello and welcome to CoachellaBot! I can help you with general questions about Coachella 2017 from their FAQ: ${faqURL}`)
     }
   ])
   .matches('Help', [
     (session, response) => {
       session.send(`We all need a little help sometimes! I can only answer questions from the Coachella 2017 FAQ, try asking something from this link instead: ${faqURL}`)
     }
   ])
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
  // Here's where we pass anything the user typed along to the QnA service.

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
