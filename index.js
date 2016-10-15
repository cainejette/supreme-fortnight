'use strict';

var Botkit = require('botkit');
const curl = require('curlrequest');
var google = require('google')

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.PORT || !process.env.VERIFICATION_TOKEN) {
    console.log('Error: Specify CLIENT_ID, CLIENT_SECRET, VERIFICATION_TOKEN and PORT in environment');
    process.exit(1);
}

var config = {}
if (process.env.MONGOLAB_URI) {
    var BotkitStorage = require('botkit-storage-mongo');
    config = {
        storage: BotkitStorage({mongoUri: process.env.MONGOLAB_URI}),
    };
} else {
    config = {
        json_file_store: './db_slackbutton_slash_command/',
    };
}

var controller = Botkit.slackbot(config).configureSlackApp(
    {
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        scopes: ['commands'],
    }
);

controller.setupWebserver(process.env.PORT, function (err, webserver) {
    controller.createWebhookEndpoints(controller.webserver);

    controller.createOauthEndpoints(controller.webserver, function (err, req, res) {
        if (err) {
            res.status(500).send('ERROR: ' + err);
        } else {
            res.send('Success!');
        }
    });
});

controller.on('slash_command', function (slashCommand, message) {
    switch (message.command) {
        case "/xkcd": 
            if (message.token !== process.env.VERIFICATION_TOKEN) return;

            if (message.text === "") {
                getRandomComic(slashCommand, message);
            } else if (message.text === "help") {
                slashCommand.replyPrivate(message, "I try to find a relevant xkcd for you. Try typing `/xkcd standards` to see.");
            } else {
                getRelevantComic(slashCommand, message);
            }

            break;

        default:
            slashCommand.replyPublic(message, "I'm afraid I don't know how to " + message.command + " yet.");
            break;
    }
});

var getRandomComic = (slashCommand, message) => {
    curl.request('http://xkcd.com/info.0.json', (err, data) => {
        if (err) {
            slashCommand.replyPrivate(message, 'Sorry, I failed: ' + err);
            return;
        } 

        var lastComic = JSON.parse(data).num;
        var randomComic = Math.floor(Math.random() * lastComic)

        postComic(slashCommand, message, 'http://xkcd.com/{0}/info.0.json'.replace('{0}', randomComic));
    });
};

var getRelevantComic = (slashCommand, message) => {
    google('xkcd ' + message.text, (err, data) => {
        if (err) {
            slashCommand.replyPrivate(message, 'Sorry, I failed: ' + err);
            return;
        }

        var link = data.links[0].href + '/info.0.json';
        postComic(slashCommand, message, link);
    });
};

var postComic = (slashCommand, message, link) => {
    curl.request(link, (err, data) => {
        if (err) {
            slashCommand.replyPrivate(message, 'Sorry, I failed: ' + err);
            return;
        }

        var comic = JSON.parse(data);
        var response = {
            "attachments": [
                {
                    "title": comic.title,
                    "title_link": 'http://xkcd.com/' + comic.num,
                    "image_url": comic.img,
                    "footer": comic.alt,
                }
            ]
        };

        slashCommand.replyPublic(message, response);
    });
}