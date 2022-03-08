require('dotenv').config();
const express = require('express');
const cors = require('cors');

const bodyParser = require('body-parser');
const dns = require('dns');
const {URL} = require('url');

const mongoose = require('mongoose');
const {Schema} = mongoose;

const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));
app.use(bodyParser.urlencoded({extended: "false"}));

let databaseURI = process.env.MONGO_URI;
mongoose.connect(databaseURI, { useNewUrlParser: true, useUnifiedTopology: true });

const shortURLSchema = new Schema({
  url: {type: String, required: true},
  identifier: Number
});

let shortURL = mongoose.model('Short URL', shortURLSchema);
let shortIDBegin = 1;
shortURL.find({}).sort({identifier: -1}).limit(1).exec((err, data) => {
  if (err) console.error(err);
  else if (data) {
    console.log(data);
    shortIDBegin = data[0].identifier + 1;
  }
});

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.post('/api/shorturl', (req, res) => {
  let link = (' ' + req.body.url).slice(1);
  let regex = /^https?:\/\//;
  if (!regex.test(link)) {
    res.json({error: "Invalid URL"});
  }
  else {
    let u = new URL(link);
    dns.lookup(u.hostname, err => {
      if (err) {
        console.error(err);
        res.json({error: "Invalid Hostname"});
      }
      else {
        // search for url in database
        shortURL.findOne({url: link}, (err, URLFound) => {
          if (err) {
            console.error(err);
            res.send("ERROR");
          }
          else if (!URLFound) {
            console.log("No existing entry found, creating new entry in database...");
            // Create new database entry
            let newShortURL = new shortURL({
              url: link,
              identifier: shortIDBegin
            });
            newShortURL.save();
            shortIDBegin++;
            res.json({original_url: newShortURL.url, short_url: newShortURL.identifier});
          }
          else {
            console.log(URLFound);
            res.json({original_url: URLFound.url, short_url: URLFound.identifier});
          }
        });
      }
    });
  }
});

app.get('/api/shorturl/:id', (req, res) => {
  let id = Number(req.params.id);
  if (!id) {
    res.json({error: "Wrong format"});
  }
  shortURL.findOne({identifier: id}, (err, found) => {
    if (err) console.error(err);
    else if (!found) {
      res.json({error: "No short URL found for the given input"});
    }
    else {
      res.redirect(301, found.url);
    }
  });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
