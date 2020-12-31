require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const socketIo = require('socket.io');

const needle = require('needle');
const TOKEN = process.env.TWITTER_BEARER_TOKEN;
const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../', 'client', 'index.html'))
})

const rulesURL = `https://api.twitter.com/2/tweets/search/stream/rules`;
const streamURL = `https://api.twitter.com/2/tweets/search/stream?tweet.fields=public_metrics&expansions=author_id`;

const rules = [{ value: 'new year' }, { value: 'lebanon' }];

//GET Stream rule
async function getRules() {
    const response = await needle('get', rulesURL, {
        headers: {
            Authorization: `Bearer ${TOKEN}`
        }
    });
    return response.body;
}

//SET Stream rule
async function setRules() {
    const data = {
        add: rules
    }

    const response = await needle('post', rulesURL, data, {
        headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${TOKEN}`
        }
    });
    return response.body;
}

//Delete Stream rule
async function deleteRules() {
    if (!Array.isArray(rules.data)) {
        return null;
    }

    const ids = rules.data.map(rules => rules.id);

    const data = {
        delete: {
            ids: ids
        }
    }

    const response = await needle('post', rulesURL, data, {
        headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${TOKEN}`
        }
    });
    return response.body;
}

async function streamTweets(socket) {
    const stream = needle.get(streamURL, {
        headers: {
            Authorization: `Bearer ${TOKEN}`
        }
    });

    stream.on('data', (data) => {
        try {
            const json = JSON.parse(data);
            socket.emit('tweet', json)
        } catch (error) {

        }
    })
}

io.on('connection', async () => {
    console.log('Client connected...');

    let currentRules

    try {
        // Get All Stream rules
        currentRules = await getRules();
        // Delete all stream rules
        await deleteRules(currentRules);
        // Set rules based on array above
        await setRules();
    } catch (error) {
        console.log(error);
        process.exit(1);
    }

    streamTweets(io);

})


server.listen(PORT, () => {
    console.log('LISTENING ON PORT', PORT);
})