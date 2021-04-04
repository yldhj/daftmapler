import fs from 'fs';
import path from 'path';
import http from 'http';

import dotenv from 'dotenv';
import express from 'express';
import Session from 'express-session';
import appendQuery from 'append-query';
import socketio from 'socket.io';
import { createProxyMiddleware } from 'http-proxy-middleware';

import { events } from './events';
import { Exchange, getAccessToken, validateUser } from './twitchapi';
import { Redemption, Token } from './pubsub';
import { isValidSoundConfiguration } from './validation';
import { filterHandler } from './filter';

dotenv.config();

const app = express();
app.set('port', process.env.PORT || 9000);

const scopes: string[] = [
  // 'bits:read',
  'channel:read:redemptions',
  // 'channel_subscriptions',
  // 'channel:moderate',
  // 'whispers:read',
];

// Setup Express and SocketIO
app.use(express.static('public', { extensions: ['html'] }));
app.use('/sound', express.static('sound-effects'));

const httpServer = http.createServer(app);
const io = new socketio.Server(httpServer);

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const baseUrl = process.env.BASE_URL;
const username = process.env.CHANNEL_LOGIN;

if (!clientId || !clientSecret) {
  console.error('Environment CLIENT_ID or CLIENT_SECRET is not set');
  process.exit(1);
}

if (!baseUrl) {
  console.error('Environment BASE_URL is not set');
  process.exit(1);
}

if (!process.env.COOKIE_SECRET) {
  console.log('Missing COOKIE_SECRET in env');
  process.exit(1);
}

if (!username) {
  console.log('Missing CHANNEL_LOGIN in env');
  process.exit(1);
}

// Handlers
const redirectUri = baseUrl + '/oauth2/twitch';

app.use(
  Session({
    cookie: {
      secure: !!process.env.SECURE_COOKIE,
      maxAge: 6 * 60 * 1000,
    },
    secret: process.env.COOKIE_SECRET,
    proxy: true,
    resave: false,
    saveUninitialized: true,
  })
);

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });

  socket.on('skip', () => io.emit('skip'));
});

const soundConfig = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), '.config', 'sound-config.json'),
    'utf-8'
  )
);

if (!isValidSoundConfiguration(soundConfig)) {
  console.log('Invalid sound configuration file');
  process.exit(1);
}

console.log('Sound configuration is valid');

const filter: string[] = [];

try {
  const filterString = fs
    .readFileSync(path.join(process.cwd(), '.config', 'filter.txt'), 'utf-8')
    .replace(/(\r\n|\n|\r)/gm, '\n')
    .split('\n');
  filterString.forEach((v) => filter.push(v));
} catch (e) {
  console.log('No filter file');
}

events.on('twitchEvent', (redemption: Redemption) => {
  const sfxPrefix: string = soundConfig.redeemable.sfx.prefix || '';
  const ttsName: string = soundConfig.redeemable.tts.name;

  if (redemption.name === ttsName && redemption.message) {
    io.emit('tts', {
      text: redemption.message,
      volume: soundConfig.redeemable.tts.volume,
    });
  }

  const sounds = soundConfig.sounds;
  for (const sound of sounds) {
    const name = `${sfxPrefix}${sound.name}`;
    if (redemption.name === name) {
      io.emit('sfx', {
        file: sound.file,
        volume: sound.volume,
      });
    }
  }
});

// Use request sessionID as state
app.get('/api/verify', async (req, res) => {
  const twitchOAuthUrl = appendQuery(
    'https://id.twitch.tv/oauth2/authorize?',
    {
      client_id: clientId,
      redirect_uri: decodeURIComponent(redirectUri),
      response_type: 'code',
      scope: scopes.join('+'),
      state: req.sessionID,
    },
    { encodeComponents: false }
  );

  res.redirect(302, twitchOAuthUrl);
});

app.get('/oauth2/twitch', async (req, res) => {
  // This chunk of code is only available if key is generated
  // if (req.query.state !== req.sessionID) {
  //   console.log(`State: ${req.query.state}, SessionID: ${req.sessionID}`);
  //   console.log('Session ID mismatch');
  //   res.redirect(302, baseUrl + '/error');
  // } else

  if (req.query.error) {
    console.log('Error on query');
    res.redirect(302, baseUrl + '/error');
  } else if (!req.query.code) {
    console.log('Error on authorization code');
    res.redirect(302, baseUrl + '/error');
  } else {
    const e: Exchange = {
      client_id: clientId,
      client_secret: clientSecret,
      code: req.query.code,
      grant_type: 'authorization_code',
      redirect_uri: decodeURIComponent(redirectUri),
      scope: scopes,
    };

    try {
      const token = await getAccessToken(e);
      const response = await validateUser(token.access_token);

      if (response.login === username) {
        // Check if user is matching
        console.log('Matched login. Store token');
      } else {
        res.status(400).send('User mismatch');
      }

      const tokenStore: Token = {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiryTimestamp: token.expires_in,
      };

      fs.writeFileSync(
        path.join(process.cwd(), '.config', 'tokens.json'),
        JSON.stringify(tokenStore)
      );
      res
        .status(200)
        .send('Matching user_id. Wait for 5 minutes or restart your app.');
    } catch (e) {
      console.error(e);
      res.status(500).send('Error');
    }
  }
});

if (process.env.TTS_URL) {
  // Act as proxy to the TTS engine
  // Use filter middleware
  const ttsProxy = createProxyMiddleware({
    target: process.env.TTS_URL,
    changeOrigin: true,
  });

  app.use('/api/tts', filterHandler(filter), ttsProxy);
}

export const server = httpServer;
