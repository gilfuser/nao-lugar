const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const errorHandler = require('errorhandler');

const PORT = process.env.PORT || 5000;


// --------------------------------------------------------------
// SET UP PUSHER
// --------------------------------------------------------------

const Pusher = require('pusher');

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_APP_KEY,
  secret: process.env.PUSHER_APP_SECRET,
  cluster: process.env.PUSHER_APP_CLUSTER,
});

const pusherCallback = (err, req, res) => {
  if (err) {
    console.log('Pusher error:', err.message);
    console.log(err.stack);
  }
};


// ---------------------------------------------
// SET UP EXPRESS
// ---------------------------------------------

express()
  .use(express.static(path.join(__dirname, 'public')))
  .use(bodyParser.urlencoded({ extended: true }))
  .use(bodyParser.json())
  .use((req, res, next) => { // simple logger
    console.log('%s %s', req.method, req.url);
    console.log(req.body);
    next();
  })
  .use(errorHandler({
    dumpExceptions: true,
    showStack: true,
  }))
  .post('/message', (req, res) => {
  // TODO: Check for valid POST data
    const { socketId, channel, message } = req.body;
    pusher.trigger(channel, 'message', message, socketId, pusherCallback);
    res.send(200);
  })
  // .set('views', path.join(__dirname, 'views'))
  // .set('view engine', 'ejs')
  // .get('/', (req, res) => res.render('pages/index'))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));
