# Channel Points Soundboard v2

A rewrite of sound-trigger-channel-points app which uses Docker as base application with optional TTS providers ranging from the non-external Mozilla TTS Docker app to Amazon Polly.

This app is a Dockerized app

## Docker

Note: it is advised for user to use `docker-compose`

To run with docker-compose:

1. Make directory called `.config` and `sound-effects`
2. Copy both example files in config without the suffix

```sh
cp sound-config.json.example sound-config.json
cp tokens.json.example tokens.json
```

3. Add your desired sound files in the `sound-effects` directory

4. Modify the value in `sound-config.json` to fit your requirements:

   - There are two properties: `sounds` and `redeemable`.
   - `redeemable` contains the config for both TTS and Soundboard:
     - `tts.name` should be the name of the redeemable on the channel, and `tts.volume` should be obvious
     - `sfx.prefix` is optional. This is the prefix of the redeemable for your soundboard.
   - `sounds` contains an array of sound object. Each sound contains four properties:
     - `name` of the sound effect redemption name. If `sfx.prefix` exists, they will be joined together
       - Example: if `sfx.prefix` is `Soundboard: ` (has trailing space) and `name` is `KEKW`, the reward name should be `Soundboard: KEKW`
       - Remember that trailing space won't be ignored.
     - `aliases` array of string which does nothing at this moment
     - `file` filename of the sound inside `sound-effects` directory
     - `volume` which should be obvious

5. Copy `.env.example` to `.env.docker` and set the value.

> To register your application on Twitch developer portal, visit [Twitch developer console](https://dev.twitch.tv/console/apps) and register your application. Put OAuth redirect URL according to the base url on `.env` (if you're hosting on local machine, use the given example on the file).

6. (Optional) You can have filtering on your TTS engine by adding file `filter.txt` on `.config` directory. Each line should contain a regex.

7. Run docker-compose:

```sh
docker-compose -f docker-compose.yaml up --detach
```

8. Your app will be available in http://localhost:9000
