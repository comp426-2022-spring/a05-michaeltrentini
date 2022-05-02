var i = 13
// Require minimist
const args = require('minimist')(process.argv.slice(2))
// Define app using express
var express = require('express')
var app = express()
// Require fs
const fs = require('fs')
// Require morgan
const morgan = require('morgan')
// Require db file
const logdb = require('./src/services/database.js')
// Make Express use its own built-in body parser
// Allow urlencoded body messages
// Allow json body messages
app.use(express.json());
// Server port
const port = args.port || args.p || process.env.PORT || 5000


// Store help text 
const help = (`
server.js [options]
--port, -p	Set the port number for the server to listen on. Must be an integer
            between 1 and 65535.
--debug, -d If set to true, creates endlpoints /app/log/access/ which returns
            a JSON access log from the database and /app/error which throws 
            an error with the message "Error test successful." Defaults to 
            false.
--log		If set to false, no log files are written. Defaults to true.
            Logs are always written to database.
--help, -h	Return this message and exit.
`)


// If --help, echo help text and exit
if (args.help || args.h) {
    console.log(help)
    process.exit(0)
}


// If log == false, don't create a log file
if (args.log == 'false') {
    console.log("NOTICE: not creating file access.log")
} else {
    const logdir = './log/';
    if (!fs.existsSync(logdir)){
        fs.mkdirSync(logdir);
    }
// Write stream
    const accessLog = fs.createWriteStream( logdir+'access.log', { flags: 'a' })
// Loggin middleware
    app.use(morgan('combined', { stream: accessLog }))
}


// Log to db
app.use((req, res, next) => {
    let logdata = {
        remoteaddr: req.ip,
        remoteuser: req.user,
        time: Date.now(),
        method: req.method,
        url: req.url,
        protocol: req.protocol,
        httpversion: req.httpVersion,
        status: res.statusCode,
        referrer: req.headers['referer'],
        useragent: req.headers['user-agent']
    };
    const stmt = logdb.prepare('INSERT INTO accesslog (remoteaddr, remoteuser, time, method, url, protocol, httpversion, status, referrer, useragent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    const info = stmt.run(logdata.remoteaddr, logdata.remoteuser, logdata.time, logdata.method, logdata.url, logdata.protocol, logdata.httpversion, logdata.status, logdata.referrer, logdata.useragent)
    next();
})


//a2 flip functions
function coinFlip() {
    var output;
    var random = Math.random();
    if (random < 0.5) {
      output = "heads";
    }
      else {
        output = "tails";
      }
      return output;
    }


function coinFlips(flips) {
    let list = [];
    let i = 0;
    while (i < flips) {
      list.push(coinFlip());
      i++;
    }
    return list;
    }
    
    
function countFlips(array) {
    var heads = 0;
    var tails = 0;
    var i = 0;
    while (i<array.length) {
      if (array[i] == "heads") {
        heads++;
      }
      else {
        tails++;
      }
      i++;
    }
    if (tails == 0) {
      return { tails: tails} ;
    }
    if (heads == 0) {
      return { heads: heads} ;
    }
    return { heads: heads , tails: tails };
    }
    
    
function flipACoin(call) {
      var flip = coinFlip(call);
      var result;
      if (call == flip) {
        result = "win";
      }
      else {
        result = "lose";
      }
      return {call: call, flip: flip, result: result}
    }


app.use(express.static('./public'))
app.get("/app/", (req, res, next) => {
    res.json({"message":"Your API works! (200)"});
	res.status(200);
});

// Endpoints
app.get('/app/flip/', (req, res) => {
    const flip = coinFlip()
    res.status(200).json({ "flip" : flip })
});

app.post('/app/flip/coins/', (req, res, next) => {
    const flips = coinFlips(req.body.number)
    const count = countFlips(flips)
    res.status(200).json({"raw":flips,"summary":count})
})

app.get('/app/flips/:number', (req, res, next) => {
    const flips = coinFlips(req.params.number)
    const count = countFlips(flips)
    res.status(200).json({"raw":flips,"summary":count})
});

app.post('/app/flip/call/', (req, res, next) => {
    const game = flipACoin(req.body.guess)
    res.status(200).json(game)
})

app.get('/app/flip/call/:guess(heads|tails)/', (req, res, next) => {
    const game = flipACoin(req.params.guess)
    res.status(200).json(game)
})

if (args.debug || args.d) {
    app.get('/app/log/access/', (req, res, next) => {
        const stmt = logdb.prepare("SELECT * FROM accesslog").all();
	    res.status(200).json(stmt);
    })

    app.get('/app/error/', (req, res, next) => {
        throw new Error('Error test works.')
    })
}

// 404 not found
app.use(function(req, res){
    const statusCode = 404
    const statusMessage = 'NOT FOUND'
    res.status(statusCode).end(statusCode+ ' ' +statusMessage)
});

// Start server
const server = app.listen(port, () => {
    console.log("Server running on port %PORT%".replace("%PORT%",port))
});
// Server stopped
process.on('SIGINT', () => {
    server.close(() => {
		console.log('\nApp stopped.');
	});
});