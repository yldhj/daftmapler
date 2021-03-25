import fs from 'fs';
import path from 'path';

import { ApiClient } from 'twitch';
import {
  InvalidTokenError,
  RefreshableAuthProvider,
  StaticAuthProvider,
} from 'twitch-auth';
import {
  BasicPubSubClient,
  PubSubClient,
  PubSubRedemptionMessage,
} from 'twitch-pubsub-client';

/**
 * Delay execution of the next line with the provided time. Must be awaited
 * @param sec Time in seconds
 */
function sleep(sec: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, sec * 1000);
  });
}

type Token = {
  accessToken: string;
  refreshToken: string;
  expiryTimestamp: number | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isToken(f: any): f is Token {
  const access =
    f.accessToken !== undefined && typeof f.accessToken === 'string';
  const refresh =
    f.refreshToken !== undefined && typeof f.refreshToken === 'string';
  const expiry =
    f.expiryTimestamp !== undefined &&
    (f.expiryTimestamp === null || typeof f.expiryTimestamp === 'number');
  return access && refresh && expiry;
}

/**
 * Validate if the token file exists with the correct key-value type (does not need to be a valid token)
 * If retry count reaches 0, app will delay check to wait for another 5 minutes
 * @param retryCount How many times the app needs to check the tokens file
 */
async function tokenValidation(retryCount: number): Promise<void> {
  if (retryCount === 0) {
    console.log('Ran out of retry, wait for 5 minutes');
    await sleep(5 * 60);
    return tokenValidation(3);
  }

  const clientSecret = process.env.CLIENT_SECRET;
  const clientId = process.env.CLIENT_ID;

  if (!clientId || !clientSecret) {
    console.error('Environment CLIENT_ID or CLIENT_SECRET is not set');
    process.exit(1);
  }

  try {
    fs.accessSync(
      path.join(process.cwd(), '.config', 'tokens.json'),
      fs.constants.R_OK
    );
  } catch (e) {
    console.error(
      'Token file is not set properly. Copy example file to the tokens file'
    );
    await sleep(60);
    return tokenValidation(retryCount - 1);
  }

  const tokenFile = fs.readFileSync(
    path.join(process.cwd(), '.config', 'tokens.json'),
    'utf8'
  );

  const token = JSON.parse(tokenFile);

  if (!isToken(token)) {
    console.error(
      'Token file is not set properly. Copy example file to the tokens file'
    );
    await sleep(60);
    return tokenValidation(retryCount - 1);
  }
}

async function pubSub(): Promise<void> {
  const clientSecret = process.env.CLIENT_SECRET;
  const clientId = process.env.CLIENT_ID;

  if (!clientId || !clientSecret) {
    console.error('Environment CLIENT_ID or CLIENT_SECRET is not set');
    process.exit(1);
  }

  try {
    fs.accessSync(
      path.join(process.cwd(), '.config', 'tokens.json'),
      fs.constants.R_OK
    );
  } catch (e) {
    console.error(`Failed to access tokens file`);
    process.exit(1);
  }

  const tokenFile = fs.readFileSync(
    path.join(process.cwd(), '.config', 'tokens.json'),
    'utf8'
  );

  const token = JSON.parse(tokenFile);

  if (!isToken(token)) {
    console.error('Token file is not set properly');
    process.exit(1);
  }

  try {
    console.log('Creating pubsub instance');
    const authProvider = new RefreshableAuthProvider(
      new StaticAuthProvider(clientId, token.accessToken),
      {
        clientSecret,
        refreshToken: token.refreshToken,
        expiry: token.expiryTimestamp ? new Date(token.expiryTimestamp) : null,
        onRefresh: (token) => {
          const storedToken: Token = {
            accessToken: token.accessToken,
            refreshToken: token.refreshToken,
            expiryTimestamp:
              token.expiryDate !== null ? token.expiryDate.getTime() : null,
          };
          const payload = JSON.stringify(storedToken);
          fs.writeFileSync(
            path.join(process.cwd(), '.config', 'tokens.json'),
            payload
          );
        },
      }
    );

    const apiClient = new ApiClient({ authProvider });
    const baseClient = new BasicPubSubClient();
    const pubSubClient = new PubSubClient(baseClient);
    const userId = await pubSubClient.registerUserListener(apiClient);

    baseClient.onConnect(() => {
      console.log('Pubsub client connected');
    });

    // Pure message. Use pubSubClient event listener
    // baseClient.onMessage((topic: string, message: PubSubMessageData) => {
    //   console.log(`${topic} => ${JSON.stringify(message)}`);
    // });

    // Needs to await onRedemption because it is possible for this module to throw ERR_BADAUTH
    // because the provided token doesn't have the required scope
    const handler = await pubSubClient.onRedemption(
      userId,
      (message: PubSubRedemptionMessage) => {
        console.log(
          `Redemption: ${JSON.stringify(message)} ${message.rewardName}`
        );
      }
    );

    const onDisconnectListener = async (isError: boolean) => {
      handler.remove();
      if (isError) {
        console.log(
          'PubSub disconnected from error. Reconnecting in 5 seconds'
        );
        await sleep(5);
        baseClient.removeListener(onDisconnectListener);
        return await pubSub();
      } else {
        console.log('PubSub forcefully disconnected ');
        return;
      }
    };

    baseClient.onDisconnect(onDisconnectListener);
  } catch (e) {
    console.error('error: ', e);

    if (e instanceof InvalidTokenError) {
      console.log(
        `Current token is invalid. Supply your token by validating. Go to ${process.env.BASE_URL}/api/verify`
      );
      console.log('PubSub instance will sleep for 5 minutes');
      await sleep(5 * 60);
      return await pubSub();
    }
  }
}

export { Token, tokenValidation, pubSub };
