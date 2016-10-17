var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var curl = require('curlrequest');
var google = require('google');

app.get('/', function (req, res) {
  res.send('hi');
});

app.listen(process.env.PORT || 8765, function () {
  console.log('started...');
});

app.use(bodyParser());

app.post('/', function (req, res) {
  if (req.body.text == '') {
    getRandomComic(res);
  } else if (req.body.text == 'help') {
    res.send({text: 'type /xkcd for a random one, or /xkcd [query] for something relevant!'});
  } else {
    getRelevantComic(res, req.body.text);
  }
});

var getRandomComic = (res) => {
  curl.request('http://xkcd.com/info.0.json', (err, data) => {
    if (err) {
      handleError(res, err);
    }

    var lastComicNumber = JSON.parse(data).num;
    var randomComicNumber = Math.floor(Math.random() * lastComicNumber)

    curl.request('http://xkcd.com/{0}/info.0.json'.replace('{0}', randomComicNumber), (err2, data2) => {
      if (err2) {
        handleError(res, err2);
      }

      send(res, data2);
    });
  });
};

var getRelevantComic = (res, query) => {
  google('xkcd ' + query, (err, data) => {
    if (err) {
      handleError(res, err);
    }

    var link = data.links[0].href + '/info.0.json';
    curl.request(link, (err2, data2) => {
      if (err2) {
        handleError(res, err2);
      }

      send(res, data2);
    });
  });
};

var send = (res, data) => {
  var comic = JSON.parse(data);

  var response = {
    'attachments': [
      {
        'title': comic.title,
        'title_link': 'http://xkcd.com/' + comic.num,
        'image_url': comic.img,
        'footer': comic.alt,
      }
    ]
  };
  res.send(response);
}

var handleError = (res, err) => {
  res.send({text: 'error: ' + err, response_type: 'ephemeral'});  
}