/**
 * Created by ThanhTVSE0612 on 9/4/16.
 */
var express = require('express');
var request = require('request');
var router = express.Router();

// Init apiai
var apiai = require('apiai');
var uuid = require('node-uuid');

const pageAccessToken = 'EAAEALDcNKnIBAM5XZCxR1NCGJj5Y6eUo89uFgNgIkCZCIyOG27KcaCp9YAZAnILa0WUW7qhwfGZAYX0Q3EcSRc3R3SZBFZCzWXJAGk16qBOQHmb5SWEEdH0Gem6ZBCsrS0ZAbQf9gVn74NPJqqsWoaKTEZB9W0DecxpnMnXkQldnPfvhlgVc4q4Xm';
const apiToken = '9691abb3dc3b4ed691f6e4cd3ffaeae0';

var app_apiai = apiai(apiToken);

var userMappingObject = new Map();

module.exports = router;
router.get('/', function (req, res) {
    if (req.query['hub.verify_token'] == 'token') {
        res.send(req.query['hub.challenge']);
    } else {
        res.send('Error, wrong validation token');
    }
});

router.post('/', function (req, res) {
    try {
        var messaging_events = req.body.entry[0].messaging;

        for (var i = 0; i < messaging_events.length; i++) {
            var event = req.body.entry[0].messaging[i];
            var sender = event.sender.id;
            var session;

            if (!userMappingObject.has(sender)) {
                session = uuid.v1();
                userMappingObject.set(sender, session);
            } else {
                session = userMappingObject.get(sender);
            }

            // normal event message
            if (event.message ) {
                handleFacebookMessageText(event, sender, session);
            }
        }

        return res.status(200).json({
            status: "ok"
        });

    } catch (err) {
        console.log("ERROR: " + err);
        return res.status(400).json({
            status: "error",
            error: err
        });
    }
});

function handleFacebookMessageText(event, sender, session) {
    if (event.message.text) {
        var opt = {
            sessionId: session
        };

        sendRequestToProcessingLanguage(event.message.text, opt, function (response) {
            var intentName = response.result.metadata.intentName;
            if (intentName.indexOf('Greeting') > -1) {
                return handleWordProcessingGreeting(response, sender);
            }
        });
    }
}

function sendRequestToProcessingLanguage(statements, option, callback) {
    var request = app_apiai.textRequest(statements, option);

    request.on('response', function (response) {
        return callback(response);
    });

    request.on('error', function (error) {
        console.log(error);
    });

    request.end();
}

function handleWordProcessingGreeting(response, sender) {
    var action = response.result.action;
    var responseText = response.result.fulfillment.speech;
    var splittedText = splitResponse(responseText);

    if (action === 'greeting') {
        if (splittedText.length > 0 && splittedText.toString().trim() !== 'success') {
            for (var i = 0; i < splittedText.length; i++) {
                return sendFBMessageTypeText(splittedText[i], sender);
            }
        }
    }
}

function chunkString() {
    var curr = len, prev = 0;

    var output = [];

    while (s[curr]) {
        if (s[curr++] == ' ') {
            output.push(s.substring(prev, curr));
            prev = curr;
            curr += len;
        }
        else {
            var currReverse = curr;
            do {
                if (s.substring(currReverse - 1, currReverse) == ' ') {
                    output.push(s.substring(prev, currReverse));
                    prev = currReverse;
                    curr = currReverse + len;
                    break;
                }
                currReverse--;
            } while (currReverse > prev)
        }
    }
    output.push(s.substr(prev));
    return output;
}
function splitResponse(str) {
    if (str.length <= 320) {
        return [str];
    }

    var result = this.chunkString(str, 300);

    return result;

}

function sendFBMessageTypeText(messageText, sender) {
    console.log("do send text message");
    request({
        url: 'https://graph.facebook.com/v2.7/me/messages',
        qs: {
            access_token: pageAccessToken
        },
        method: 'POST',
        json: {
            recipient: {id: sender},
            message: {text: messageText}
        },
        timeout: 20000
    }, function (error, response, body) {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error Text: ', response.body.error);
        }
        if (response) {
            console.log('response ok successfully');
        }

    });
}


