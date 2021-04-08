import * as T from 'io-ts';
import * as Either from 'fp-ts/lib/Either';

const soundConfigurationType = T.type({
  sounds: T.array(
    T.type({
      name: T.string,
      aliases: T.array(T.string),
      file: T.string,
      volume: T.union([T.number, T.undefined]),
    })
  ),
  redeemable: T.type({
    tts: T.type({
      name: T.string,
      volume: T.union([T.number, T.undefined]),
    }),
    sfx: T.type({
      prefix: T.union([T.string, T.undefined]),
    }),
  }),
});

type SoundConfiguration = T.TypeOf<typeof soundConfigurationType>;

export function isValidSoundConfiguration(v: unknown): v is SoundConfiguration {
  return Either.isRight(soundConfigurationType.decode(v));
}

const tokenType = T.type({
  accessToken: T.string,
  refreshToken: T.string,
  expiryTimestamp: T.union([T.number, T.null]),
});

export type Token = T.TypeOf<typeof tokenType>;

export function isToken(v: unknown): v is Token {
  return Either.isRight(tokenType.decode(v));
}

const redemptionType = T.type({
  name: T.string,
  username: T.string,
  message: T.union([T.string, T.undefined]),
});

export type Redemption = T.TypeOf<typeof redemptionType>;

export function isRedemption(v: unknown): v is Redemption {
  return Either.isRight(redemptionType.decode(v));
}
