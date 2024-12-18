/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import frisby = require('frisby')
import { expect } from '@jest/globals'
import config from 'config'

const REST_URL = 'http://localhost:3000/rest'
const API_URL = 'http://localhost:3000/api'

const jsonHeader = { 'content-type': 'application/json' }

function loginAndPerformAction(email: string, password: string, action: (token: string) => Promise<any>): Promise<any> {
  return frisby.post(`${REST_URL}/user/login`, {
    headers: jsonHeader,
    body: {
      email: email,
      password: password
    }
  })
    .expect('status', 200).promise()
    .then(({ json }) => action(json.authentication.token))
    .then((res) => res); // Ensure the returned action is a Promise
}

function loginAndUpdateQuantity(): Promise<any> {
  return loginAndPerformAction(`accountant@${config.get<string>('application.domain')}`, 'i am an awesome accountant', (token) => {
    return frisby.put(`${API_URL}/Quantitys/1`, {
      headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: {
        quantity: 100
      }
    }).promise(); // Convert to Promise
  });
}

describe('/api/Quantitys', () => {
  it('GET quantity of all items for customers', () => {
    return loginAndPerformAction(`jim@${config.get<string>('application.domain')}`, 'ncc-1701', (token) => {
      return frisby.get(`${API_URL}/Quantitys`, {
        headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' }
      })
      .expect('status', 200)
      .promise(); // Προσθήκη της .promise()
    });
  });

  it('GET quantity of all items for admin', () => {
    return loginAndPerformAction(`admin@${config.get<string>('application.domain')}`, 'admin123', (token) => {
      return frisby.get(`${API_URL}/Quantitys`, {
        headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' }
      })
      .expect('status', 200)
      .promise();
    });
  });

  it('POST quantity is forbidden for customers', () => {
    return loginAndPerformAction(`jim@${config.get<string>('application.domain')}`, 'ncc-1701', (token) => {
      return frisby.post(`${API_URL}/Quantitys`, {
        headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: { ProductId: 1, quantity: 100 }
      })
      .expect('status', 401)
      .promise();
    });
  });

  it('PUT quantity as accounting user blocked by IP filter', () => {
    return loginAndPerformAction(`accountant@${config.get<string>('application.domain')}`, 'i am an awesome accountant', (token) => {
      return frisby.put(`${API_URL}/Quantitys/1`, {
        headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: { quantity: 100 }
      })
      .expect('status', 403)
      .promise();
    });
  });
});

describe('/api/Quantitys/:ids', () => {
  it('GET quantity of all items is forbidden for customers', () => {
    return loginAndPerformAction(`jim@${config.get<string>('application.domain')}`, 'ncc-1701', (token) => {
      return frisby.get(`${API_URL}/Quantitys/1`, {
        headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' }
      })
      .expect('status', 403)
      .expect('json', 'error', 'Malicious activity detected')
      .promise();
    });
  });

  it('should update quantity after login as accountant', () => {
    return loginAndUpdateQuantity().then((res) => {
      expect(res.status).toBe(200);
    });
  });
});
