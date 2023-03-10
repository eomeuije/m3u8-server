const fetch = require('node-fetch')
const express = require('express')

const app = express()

app.disable('etag')

app.use((request, response, next) => {
  console.log(`IP : ${request.headers['x-forwarded-for']} | Method : ${request.method} | Url : ${request.originalUrl}`)
  next()
})

app.get('/', (request, response) => {
  response.status(200).json({
    'message': "Welcome to Twitch API"
  })
})

app.get('/hls', async (request, response) => {
  let id = request.query.id
  let oauth = request.query.oauth || 'OAuth 2lflg6mbx63kz93fsnibdzngy15d7y'
  let token = await fetch(`https://gql.twitch.tv/gql`, {
    "method": 'POST',
    "headers": {
      'Client-ID': 'kimne78kx3ncx6brgo4mv6wki5h1ko',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.111 Safari/537.36',
      'X-Device-Id': 'twitch-web-wall-mason',
      'Device-ID': 'twitch-web-wall-mason',
      'Authorization': oauth
    },
    "body": JSON.stringify({
      "operationName": "PlaybackAccessToken",
      "extensions": {
        "persistedQuery": {
          "version": 1,
          "sha256Hash": "0828119ded1c13477966434e15800ff57ddacf13ba1911c129dc2200705b0712"
        }
      },
      "variables": {
        "isLive": true,
        "login": id,
        "isVod": false,
        "vodID": "",
        "playerType": "embed"
      }
    })
  })

  switch (await token.status) {
    default: //Error with connect with Twitch API
      response.status(500).json({
        'message': 'Error with Twitch API'
      })
      break
    case 200: //Channel founded
      raw = await token.json()
      if (raw.data.streamPlaybackAccessToken === null) { //Channel not found
        response.status(404).json({
          'message': 'Channel not found'
        })
      } else {
        function base64Encode(data) {
          return Buffer.from(data).toString('base64')
        }

        function cleanupAllAdStuff(data) {
          return data
            .replace(/X-TV-TWITCH-AD-URL="[^"]+"/g, 'X-TV-TWITCH-AD-URL="javascript:alert(\'pogo\')"')
            .replace(
              /X-TV-TWITCH-AD-CLICK-TRACKING-URL="[^"]+"/g,
              'X-TV-TWITCH-AD-CLICK-TRACKING-URL="javascript:alert(\'pogo\')"'
            )
            .replace(/X-TV-TWITCH-AD-ADVERIFICATIONS="[^"]+"/g, `X-TV-TWITCH-AD-ADVERIFICATIONS="${base64Encode('{}')}"`)
            .replace(/#EXT-X-DATERANGE.+CLASS=".*ad.*".+\n/g, '')
            .replace(/\n#EXTINF.+(?<!live)\nhttps:.+/g, '');
        }

        let url = `http://usher.twitch.tv/api/channel/hls/${id}.m3u8?player=twitchweb&&token=${raw.data.streamPlaybackAccessToken.value}&sig=${raw.data.streamPlaybackAccessToken.signature}&allow_audio_only=true&allow_source=true&type=any&p=${parseInt(Math.random() * 999999)}`
        let hls = await fetch(url, {
          method: 'GET',
          headers: {
            'X-Device-Id': 'twitch-web-wall-mason',
            'Device-ID': 'twitch-web-wall-mason'
          }
        })
        switch (await hls.status) {
          default: //m3u8 data doesn't exsit
            response.status(404).json({
              'message': 'm3u8 data not found'
            })
            break
          case 200: //m3u8 data exist
            hls = await hls.text()
            hls = cleanupAllAdStuff(hls)
            hls = hls.replace(/.*#.*\n?/gm, '')
            response.status(200).json(hls.split('\n'))
            break
        }
      }
  }
})

app.get('/hls-raw/:data', async (request, response) => {
  let data = request.params.data
  if (Object.keys(request.query).length !== 0) {
    data = data + '?'
    for (let key of Object.keys(request.query)) {
      data = data + encodeURIComponent(key) + '=' + encodeURIComponent(request.query[key]) + '&'
    }
  }
  let token = await fetch(`https://gql.twitch.tv/gql`, {
    "method": 'POST',
    "headers": {
      'Client-ID': 'kimne78kx3ncx6brgo4mv6wki5h1ko',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.111 Safari/537.36',
      'X-Device-Id': 'twitch-web-wall-mason',
      'Device-ID': 'twitch-web-wall-mason',
      'Authorization': oauth
    },
    "body": JSON.stringify({
      "operationName": "PlaybackAccessToken",
      "extensions": {
        "persistedQuery": {
          "version": 1,
          "sha256Hash": "0828119ded1c13477966434e15800ff57ddacf13ba1911c129dc2200705b0712"
        }
      },
      "variables": {
        "isLive": true,
        "login": data.split('.m3u8')[0],
        "isVod": false,
        "vodID": "",
        "playerType": "embed"
      }
    })
  })

  switch (await token.status) {
    default: //Error with connect with Twitch API
      response.status(500).json({
        'message': 'Error with Twitch API'
      })
      break
    case 200: //Channel founded
      raw = await token.json()
      if (raw.data.streamPlaybackAccessToken === null) { //Channel not found
        response.status(404).json({
          'message': 'Channel not found'
        })
      } else {
        let url = `http://usher.twitch.tv/api/channel/hls/${data}`
        let hls = await fetch(url, {
          method: 'GET',
          headers: {
            'X-Device-Id': 'twitch-web-wall-mason',
            'Device-ID': 'twitch-web-wall-mason'
          }
        })
        switch (await hls.status) {
          default: //m3u8 data doesn't exsit
            response.status(404).json({
              'message': 'm3u8 data not found'
            })
            break
          case 200: //m3u8 data exist
            hls = await hls.text()
            response.status(200).send(hls.split('\n').join('\n'))
            break
        }
      }
  }
})

app.listen(process.env.PORT || 5000, () => {
  console.log("API started")
})
