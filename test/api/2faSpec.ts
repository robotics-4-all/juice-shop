import frisby = require('frisby');
import config from 'config';
import jwt from 'jsonwebtoken';
const Joi = frisby.Joi;
const expect = require('frisby').expect;
const security = require('../../lib/insecurity');
const otplib = require('otplib');

const REST_URL = 'http://localhost:3000/rest';
const API_URL = 'http://localhost:3000/api';

const jsonHeader = { 'content-type': 'application/json' };

// Helper function to get the status of 2FA setup
function getStatus(token: string) {
  return frisby.get(REST_URL + '/2fa/status', {
    headers: {
      Authorization: 'Bearer ' + token,
      'content-type': 'application/json'
    }
  });
}

// Helper function to get status and expect setup to be true
function expectSetupTrue(token: string) {
  return getStatus(token).then(response => {
    expect(response.status).toBe(200);
    expect(response.json.setup).toBe(true);
  }).promise();
}

async function login({ email, password, totpSecret }: { email: string, password: string, totpSecret?: string }) {
  let loginRes;
  try {
    loginRes = await frisby.post(REST_URL + '/user/login', {
      headers: jsonHeader,
      body: { email, password }
    }).promise();
  } catch (res: any) {
    if (res.json?.type && res.json.status === 'totp_token_required') {
      loginRes = res;
    } else {
      throw new Error(`Failed to login '${email}'`);
    }
  }

  if (loginRes.json.status === 'totp_token_required') {
    const totpRes = await frisby.post(REST_URL + '/2fa/verify', {
      headers: jsonHeader,
      body: {
        tmpToken: loginRes.json.data.tmpToken,
        totpToken: otplib.authenticator.generate(totpSecret)
      }
    }).promise();
    return totpRes;
  }

  return loginRes;
}

async function register({ email, password, totpSecret }: { email: string, password: string, totpSecret?: string }) {
  let res;
  try {
    res = await frisby.post(API_URL + '/Users/', {
      headers: jsonHeader,
      body: {
        email,
        password,
        passwordRepeat: password,
        securityQuestion: null,
        securityAnswer: null
      }
    }).promise();
  } catch {
    throw new Error(`Failed to register '${email}'`);
  }

  if (totpSecret) {
    const { token } = await login({ email, password });

    await frisby.post(REST_URL + '/2fa/setup', {
      headers: {
        Authorization: 'Bearer ' + token,
        'content-type': 'application/json'
      },
      body: {
        password,
        setupToken: security.authorize({
          secret: totpSecret,
          type: 'totp_setup_secret'
        }),
        initialToken: otplib.authenticator.generate(totpSecret)
      }
    }).promise();
  }

  return res;
}

// Example usage of the helper function to remove duplicates
(async () => {
  const email = 'test@example.com';
  const password = 'password123';
  const totpSecret = 'totpSecret';

  const loginRes = await login({ email, password, totpSecret });
  const token = loginRes.json.authentication.token;

  await expectSetupTrue(token);

  await frisby.post(
    REST_URL + '/2fa/disable',
    {
      headers: {
        Authorization: 'Bearer ' + token,
        'content-type': 'application/json'
      },
      body: {
        password: password + ' this makes the password wrong'
      }
    }
  ).expect('status', 401).promise();

  await expectSetupTrue(token);
})();