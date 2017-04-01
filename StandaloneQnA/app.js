var restify = require('restify')
var builder = require('botbuilder')
var cognitiveservices = require('botbuilder-cognitiveservices')

var botConnectorOptions = {
  appId: process.env.BOTFRAMEWORK_APPID,
  appPassword: process.env.BOTFRAMEWORK_APPSECRET
}

// Create bot
var connector = new builder.ChatConnector(botConnectorOptions)
var bot = new builder.UniversalBot(connector)

// Set up restify server
var server = restify.createServer()
server.listen(process.env.port || process.env.PORT || 3977, function () {
  console.log('listening to: ', server.name, server.url)
})
server.post('/api/messages', connector.listen())

// Luis Setup
var qnaRecognizer = new cognitiveservices.QnAMakerRecognizer({
  knowledgeBaseId: '6f180442-2db5-4396-93b3-0d13939f8032',
  subscriptionKey: '80ad91511f4c4f10afde83d92c69844b'})

var BasicQnAMakerDialog = new cognitiveservices.QnAMakerDialog({
  recognizers: [qnaRecognizer],
  defaultMessage: 'No good match in FAQ.',
  qnaThreshold: 0.5})

bot.dialog('/', BasicQnAMakerDialog)
