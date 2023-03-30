/*eslint no-undef: "warn"*/
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const jwt = require('jsonwebtoken')
const expressWs = require('express-ws')

const secret = process.env.TOKEN_SECRET
const app = express()
expressWs(app)

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.post('/auth', (req, res) => {
  const buff = Buffer.from(req.body.encoded, 'base64').toString('utf8')
  const parsed = JSON.parse(buff)

  jwt.sign(
    {
      username: parsed.login
    },
    secret,
    {
      expiresIn: '10m'
    },
    (err, token) => {
      if (err) {
        return res.sendStatus(500)
      }
      res.json({ token })
    }
  )
})

app.get('/topics', verifyToken, (req, res) => {
  jwt.verify(req.token, secret, (err) => {
    if (err) {
      return res.sendStatus(403)
    }

    let topics = {}
    for (let i = 1; i < 7; i += 1) {
      topics[i] = `Topic ${i}`
    }

    res.json({ result: { topics } })
  })
})

app.get('/messages', verifyToken, (req, res) => {
  jwt.verify(req.token, secret, (err) => {
    if (err) {
      return res.sendStatus(403)
    }

    res.json({
      topics: req.query.topics,
      result: [
        { id: Date.now() + 4, login: 'fizz', message: 'fizz' },
        { id: Date.now() + 1, login: req.query.login, message: 'baz' },
        { id: Date.now() + 5, login: 'foo', message: 'foo' },
        { id: Date.now() + 3, login: 'bar', message: 'bar' }
      ]
    })
  })
})

app.ws('/chat', (ws) => {
  console.log('ws open')

  let i = 0
  const interval = setInterval(() => {
    const arr = [
      'aHR0cHM6Ly93d3cueW91dHViZS5jb20vd2F0Y2g/dj1kUXc0dzlXZ1hjUSZ0PTQzcw==',
      'TmV2ZXIgZ29ubmEgZ2l2ZSB5b3UgdXA=',
      'TmV2ZXIgZ29ubmEgbGV0IHlvdSBkb3du',
      'TmV2ZXIgZ29ubmEgcnVuIGFyb3VuZCBhbmQgZGVzZXJ0IHlvdQ==',
      'TmV2ZXIgZ29ubmEgbWFrZSB5b3UgY3J5',
      'TmV2ZXIgZ29ubmEgc2F5IGdvb2RieWU=',
      'TmV2ZXIgZ29ubmEgdGVsbCBhIGxpZSBhbmQgaHVydCB5b3U=',
      'PSk='
    ]

    ws.send(
      JSON.stringify({
        id: Date.now(),
        login: 'Stranger',
        message: Buffer.from(arr[i], 'base64').toString('utf8')
      })
    )

    if (i >= arr.length - 1) {
      i = 0
    } else {
      i += 1
    }
  }, 5000)

  ws.on('close', () => {
    clearInterval(interval)
    console.log('ws close')
  })

  ws.on('message', (msg) => {
    const rawMessage = JSON.parse(msg)

    delete rawMessage.topics
    rawMessage.id = Date.now()

    ws.send(JSON.stringify(rawMessage))
  })
})

function verifyToken(req, res, next) {
  const bearerHeader = req.headers['authorization']
  const token = bearerHeader && bearerHeader.split(' ')[1]

  if (!token) {
    return res.sendStatus(403)
  }

  req.token = token
  next()
}

const port = 3000
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
