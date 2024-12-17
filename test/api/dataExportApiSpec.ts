/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import frisby = require('frisby')
import { expect } from '@jest/globals'
import config from 'config'
import path from 'path'
const fs = require('fs')

const jsonHeader = { 'content-type': 'application/json' }
const REST_URL = 'http://localhost:3000/rest'

// Helper function: Logs in a user and returns the authentication token
const loginUser = (email: string, password: string) => {
  return frisby.post(REST_URL + '/user/login', {
    headers: jsonHeader,
    body: { email, password }
  })
    .expect('status', 200)
    .then(({ json }) => json.authentication.token)
}

// Helper function: Retrieves CAPTCHA and returns the answer
const fetchCaptcha = (token: string) => {
  return frisby.get(REST_URL + '/image-captcha', {
    headers: { Authorization: `Bearer ${token}`, ...jsonHeader }
  })
    .expect('status', 200)
    .then(({ json }) => json.answer)
}

// Helper function: Exports user data
const exportUserData = (token: string, answer?: string) => {
  const body: any = { format: '1' }
  if (answer) body.answer = answer

  return frisby.post(REST_URL + '/user/data-export', {
    headers: { Authorization: `Bearer ${token}`, ...jsonHeader },
    body
  })
    .expect('status', 200)
    .expect('header', 'content-type', /application\/json/)
}

// Helper function: Checks user data content
const checkUserData = (data: any, expectations: any) => {
  const parsedData = JSON.parse(data.userData)
  Object.entries(expectations).forEach(([key, value]) => {
    expect(parsedData[key]).toEqual(value)
  })
}

describe('/rest/user/data-export', () => {
  it('Export data without use of CAPTCHA', () => {
    return loginUser('bjoern.kimminich@gmail.com', 'bW9jLmxpYW1nQGhjaW5pbW1pay5ucmVvamI=').then((token) =>
      exportUserData(token).then(({ json }) =>
        checkUserData(json, { username: 'bkimminich', email: 'bjoern.kimminich@gmail.com' })
      )
    )
  })

  it('Export data when CAPTCHA requested needs right answer', () => {
    return loginUser('bjoern.kimminich@gmail.com', 'bW9jLmxpYW1nQGhjaW5pbW1pay5ucmVvamI=').then((token) =>
      fetchCaptcha(token).then(() =>
        frisby.post(REST_URL + '/user/data-export', {
          headers: { Authorization: `Bearer ${token}`, ...jsonHeader },
          body: { answer: 'AAAAAA', format: 1 }
        })
          .expect('status', 401)
          .expect('bodyContains', 'Wrong answer to CAPTCHA. Please try again.')
      )
    )
  })

  it('Export data using right answer to CAPTCHA', () => {
    return loginUser('bjoern.kimminich@gmail.com', 'bW9jLmxpYW1nQGhjaW5pbW1pay5ucmVvamI=').then((token) =>
      fetchCaptcha(token).then((answer) =>
        exportUserData(token, answer).then(({ json }) =>
          checkUserData(json, { username: 'bkimminich', email: 'bjoern.kimminich@gmail.com' })
        )
      )
    )
  })

  it('Export data including orders without use of CAPTCHA', () => {
    return loginUser('amy@' + config.get<string>('application.domain'), 'K1f.....................').then((token) =>
      frisby.post(REST_URL + '/basket/4/checkout', {
        headers: { Authorization: `Bearer ${token}`, ...jsonHeader }
      })
        .expect('status', 200)
        .then(() =>
          exportUserData(token).then(({ json }) =>
            checkUserData(json, {
              username: '',
              email: 'amy@' + config.get<string>('application.domain'),
              orders: [
                {
                  totalPrice: 9.98,
                  bonus: 0,
                  products: [
                    {
                      quantity: 2,
                      name: 'Raspberry Juice (1000ml)',
                      price: 4.99,
                      total: 9.98,
                      bonus: 0
                    }
                  ]
                }
              ]
            })
          )
        )
    )
  })

  it('Export data including reviews without use of CAPTCHA', () => {
    return loginUser('jim@' + config.get<string>('application.domain'), 'ncc-1701').then((token) =>
      exportUserData(token).then(({ json }) =>
        checkUserData(json, {
          username: '',
          email: 'jim@' + config.get<string>('application.domain'),
          reviews: [
            {
              message: 'Looks so much better on my uniform than the boring Starfleet symbol.',
              author: 'jim@' + config.get<string>('application.domain'),
              productId: 20,
              likesCount: 0
            },
            {
              message: 'Fresh out of a replicator.',
              author: 'jim@' + config.get<string>('application.domain'),
              productId: 22,
              likesCount: 0
            }
          ]
        })
      )
    )
  })

  it('Export data including memories without use of CAPTCHA', () => {
    const file = path.resolve(__dirname, '../files/validProfileImage.jpg')
    const form = frisby.formData()
    form.append('image', fs.createReadStream(file), 'Valid Image')
    form.append('caption', 'Valid Image')

    return loginUser('jim@' + config.get<string>('application.domain'), 'ncc-1701').then((token) =>
      frisby.post(REST_URL + '/memories', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': form.getHeaders()['content-type']
        },
        body: form
      })
        .expect('status', 200)
        .then(() =>
          exportUserData(token).then(({ json }) =>
            checkUserData(json, {
              username: '',
              email: 'jim@' + config.get<string>('application.domain'),
              memories: [{ caption: 'Valid Image', imageUrl: expect.stringContaining('valid-image') }]
            })
          )
        )
    )
  })
})
