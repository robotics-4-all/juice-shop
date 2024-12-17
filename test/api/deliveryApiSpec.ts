/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import frisby = require('frisby')
import { expect } from '@jest/globals'
import config from 'config'

const API_URL = 'http://localhost:3000/api'
const REST_URL = 'http://localhost:3000/rest'

const jsonHeader = { 'content-type': 'application/json' }
let authHeader: { Authorization: string, 'content-type': string } | undefined;

// Helper function for user authentication
const authenticateUser = (email: string, password: string) => {
  return frisby.post(REST_URL + '/user/login', {
    headers: jsonHeader,
    body: {
      email,
      password
    }
  })
  .expect('status', 200)
  .then(({ json }) => {
    authHeader = { Authorization: 'Bearer ' + json.authentication.token, 'content-type': 'application/json' };
  });
};

// Helper function to verify delivery methods
const verifyDeliveryMethods = (expectedPrice: number) => {
  return frisby.get(API_URL + '/Deliverys', { headers: authHeader })
    .expect('status', 200)
    .expect('header', 'content-type', /application\/json/)
    .then(({ json }) => {
      // Validate the structure and values of the response data
      expect(json.data.length).toBe(3); // Expect three delivery methods
      expect(json.data[0].id).toBe(1); // Validate the ID of the first delivery method
      expect(json.data[0].name).toBe('One Day Delivery'); // Validate the name of the first delivery method
      expect(json.data[0].price).toBe(expectedPrice); // Validate the price
      expect(json.data[0].eta).toBe(1); // Validate the estimated time of arrival
    });
};

describe('/api/Deliverys', () => {
  describe('for regular customer', () => {
    beforeAll(() => {
      return authenticateUser('jim@' + config.get<string>('application.domain'), 'ncc-1701');
    })

    it('GET delivery methods', () => {
      return verifyDeliveryMethods(0.99);
    })
  })

  describe('for deluxe customer', () => {
    beforeAll(() => {
      return authenticateUser('ciso@' + config.get<string>('application.domain'), 'mDLx?94T~1CfVfZMzw@sJ9f?s3L6lbMqE70FfI8^54jbNikY5fymx7c!YbJb');
    })

    it('GET delivery methods', () => {
      return verifyDeliveryMethods(0.5);
    })
  })
})

describe('/api/Deliverys/:id', () => {
  describe('for regular customer', () => {
    beforeAll(() => {
      return frisby.post(REST_URL + '/user/login', {
        headers: jsonHeader,
        body: {
          email: 'jim@' + config.get<string>('application.domain'),
          password: 'ncc-1701'
        }
      })
        .expect('status', 200)
        .then(({ json }) => {
          authHeader = { Authorization: 'Bearer ' + json.authentication.token, 'content-type': 'application/json' }
        })
    })

    it('GET delivery method', () => {
      return frisby.get(API_URL + '/Deliverys/2', { headers: authHeader })
        .expect('status', 200)
        .expect('header', 'content-type', /application\/json/)
        .then(({ json }) => {
          expect(json.data.id).toBe(2)
          expect(json.data.name).toBe('Fast Delivery')
          expect(json.data.price).toBe(0.5)
          expect(json.data.eta).toBe(3)
        })
    })
  })

  describe('for deluxe customer', () => {
    beforeAll(() => {
      return frisby.post(REST_URL + '/user/login', {
        headers: jsonHeader,
        body: {
          email: 'ciso@' + config.get<string>('application.domain'),
          password: 'mDLx?94T~1CfVfZMzw@sJ9f?s3L6lbMqE70FfI8^54jbNikY5fymx7c!YbJb'
        }
      })
        .expect('status', 200)
        .then(({ json }) => {
          authHeader = { Authorization: 'Bearer ' + json.authentication.token, 'content-type': 'application/json' }
        })
    })

    it('GET delivery method', () => {
      return frisby.get(API_URL + '/Deliverys/2', { headers: authHeader })
        .expect('status', 200)
        .expect('header', 'content-type', /application\/json/)
        .then(({ json }) => {
          expect(json.data.id).toBe(2)
          expect(json.data.name).toBe('Fast Delivery')
          expect(json.data.price).toBe(0)
          expect(json.data.eta).toBe(3)
        })
    })
  })
})
