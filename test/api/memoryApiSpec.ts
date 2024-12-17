/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import * as frisby from 'frisby';
import { expect } from '@jest/globals';
import config from 'config';
import path from 'path';
const fs = require('fs');

const jsonHeader = { 'content-type': 'application/json' };
const REST_URL = 'http://localhost:3000/rest';

// Helper function to log in and return the auth token !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
const login = async (email: string, password: string): Promise<string> => {
  const response = await frisby.post(REST_URL + '/user/login', {
    headers: jsonHeader,
    body: JSON.stringify({ email, password }),
  }).expect('status', 200).promise();
  return response.json.authentication.token;
};

describe('/rest/memories', () => {
  it('GET memories via public API', () => {
    return frisby.get(REST_URL + '/memories')
      .expect('status', 200);
  });

  it('GET memories via a valid authorization token', async () => {
    const token = await login('jim@' + config.get<string>('application.domain'), 'ncc-1701');
    await frisby.get(REST_URL + '/memories', {
      headers: { Authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    }).expect('status', 200).promise();
  });

  it('POST new memory is forbidden via public API', () => {
    const file = path.resolve(__dirname, '../files/validProfileImage.jpg');
    const form = frisby.formData();
    form.append('image', fs.createReadStream(file), 'Valid Image');
    form.append('caption', 'Valid Image');

    return frisby.post(REST_URL + '/memories', {
      headers: {
        // @ts-expect-error FIXME form.getHeaders() is not found
        'Content-Type': form.getHeaders()['content-type'],
      },
      body: form,
    }).expect('status', 401);
  });

  it('POST new memory image file invalid type', async () => {
    const file = path.resolve(__dirname, '../files/invalidProfileImageType.docx');
    const form = frisby.formData();
    form.append('image', fs.createReadStream(file), 'Valid Image');
    form.append('caption', 'Valid Image');

    const token = await login('jim@' + config.get<string>('application.domain'), 'ncc-1701');
    await frisby.post(REST_URL + '/memories', {
      headers: {
        Authorization: 'Bearer ' + token,
        // @ts-expect-error FIXME form.getHeaders() is not found
        'Content-Type': form.getHeaders()['content-type'],
      },
      body: form,
    }).expect('status', 500).promise();
  });

  it('POST new memory with valid JPG format image', async () => {
    const file = path.resolve(__dirname, '../files/validProfileImage.jpg');
    const form = frisby.formData();
    form.append('image', fs.createReadStream(file), 'Valid Image');
    form.append('caption', 'Valid Image');

    const token = await login('jim@' + config.get<string>('application.domain'), 'ncc-1701');
    const response = await frisby.post(REST_URL + '/memories', {
      headers: {
        Authorization: 'Bearer ' + token,
        // @ts-expect-error FIXME form.getHeaders() is not found
        'Content-Type': form.getHeaders()['content-type'],
      },
      body: form,
    }).expect('status', 200).promise();

    expect(response.json.data.caption).toBe('Valid Image');
    expect(response.json.data.UserId).toBe(2);
  });

  it('Should not crash the node-js server when sending invalid content like described in CVE-2022-24434', () => {
    return frisby.post(REST_URL + '/memories', {
      headers: {
        'Content-Type': 'multipart/form-data; boundary=----WebKitFormBoundaryoo6vortfDzBsDiro',
        'Content-Length': '145',
      },
      body: '------WebKitFormBoundaryoo6vortfDzBsDiro\r\n Content-Disposition: form-data; name="bildbeschreibung"\r\n\r\n\r\n------WebKitFormBoundaryoo6vortfDzBsDiro--',
    })
      .expect('status', 500)
      .expect('bodyContains', 'Error: Malformed part header');
  });
});
