import axios from 'axios';
import qs from 'qs';

type Exchange = {
  client_id: string;
  client_secret: string;
  code: string | qs.ParsedQs | string[] | qs.ParsedQs[];
  grant_type: string;
  redirect_uri: string;
  scope: string[];
};

type Token = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string[];
  token_type: 'bearer';
};

async function getAccessToken(exchange: Exchange): Promise<Token> {
  try {
    const response = await axios.post<Token>(
      `https://id.twitch.tv/oauth2/token`,
      qs.stringify(exchange),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return response.data;
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.stack);
    }
    throw e;
  }
}

type ValidateResponse = {
  client_id: string;
  login: string;
  scopes: string[];
  user_id: string;
  expires_in: number;
};

async function validateUser(token: string): Promise<ValidateResponse> {
  console.log('Validating access token. Check if user matches login');
  const auth = 'OAuth ' + token;

  try {
    const response = await axios.get<ValidateResponse>(
      `https://id.twitch.tv/oauth2/validate`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: auth,
        },
      }
    );

    return response.data;
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.stack);
    }
    throw e;
  }
}

export { Exchange, getAccessToken, validateUser };
