/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import frisby = require('frisby')
import { expect } from '@jest/globals'
import config from 'config'
import { initialize, bot } from '../../routes/chatbot'
import fs from 'fs/promises'
import * as utils from '../../lib/utils'

const URL = 'http://localhost:3000'
const REST_URL = `${URL}/rest/`
const API_URL = `${URL}/api/`
let trainingData: { data: any[] }

async function login ({ email, password }: { email: string, password: string }) {
  const loginRes = await frisby.post(REST_URL + '/user/login', {
    email,
    password
  }).catch((res: any) => {
    if (res.json?.type && res.json.status === 'totp_token_required') {
      return res
    }
    throw new Error(`Failed to login '${email}'`)
  })

  return loginRes.json.authentication
}

async function setupAuthenticatedRequest(token: string) {
  return frisby.setup({
    request: {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  }, true)
}

describe('/chatbot', () => {
  beforeAll(async () => {
    await initialize()
    trainingData = JSON.parse(await fs.readFile(`data/chatbot/${utils.extractFilename(config.get('application.chatBot.trainingData'))}`, { encoding: 'utf8' }))
  })

  describe('/status', () => {
    it('GET bot training state', () => {
      return frisby.get(REST_URL + 'chatbot/status')
        .expect('status', 200)
        .expect('json', 'status', true)
    })

    it('GET bot state for anonymous users contains log in request', () => {
      return frisby.get(REST_URL + 'chatbot/status')
        .expect('status', 200)
        .expect('json', 'body', /Sign in to talk/)
    })

    it('GET bot state for authenticated users contains request for username', async () => {
      const { token } = await login({
        email: `J12934@${config.get<string>('application.domain')}`,
        password: '0Y8rMnww$*9VFYE§59-!Fg1L6t&6lB'
      })

      await setupAuthenticatedRequest(token)
        .get(REST_URL + 'chatbot/status')
        .expect('status', 200)
        .expect('json', 'body', /What shall I call you?/)
        .promise()
    })
  })

  describe('/respond', () => {
    it('Asks for username if not defined', async () => {
      const { token } = await login({
        email: `J12934@${config.get<string>('application.domain')}`,
        password: '0Y8rMnww$*9VFYE§59-!Fg1L6t&6lB'
      })

      const testCommand = trainingData.data[0].utterances[0]

      await setupAuthenticatedRequest(token)
        .post(REST_URL + 'chatbot/respond', {
          body: {
            action: 'query',
            query: testCommand
          }
        })
        .expect('status', 200)
        .expect('json', 'action', 'namequery')
        .expect('json', 'body', 'I\'m sorry I didn\'t get your name. What shall I call you?')
        .promise()
    })

    it('Returns greeting if username is defined', async () => {
      if (bot == null) {
        throw new Error('Bot not initialized')
      }
      const { token } = await login({
        email: 'bjoern.kimminich@gmail.com',
        password: 'bW9jLmxpYW1nQGhjaW5pbW1pay5ucmVvamI='
      })

      bot.addUser('1337', 'bkimminich')
      const testCommand = trainingData.data[0].utterances[0]

      await setupAuthenticatedRequest(token)
        .post(REST_URL + 'chatbot/respond', {
          body: {
            action: 'query',
            query: testCommand
          }
        })
        .expect('status', 200)
        .expect('json', 'action', 'response')
        .expect('json', 'body', bot.greet('1337'))
        .promise()
    })

    it('Returns proper response for registered user', async () => {
      if (bot == null) {
        throw new Error('Bot not initialized')
      }
      const { token } = await login({
        email: 'bjoern.kimminich@gmail.com',
        password: 'bW9jLmxpYW1nQGhjaW5pbW1pay5ucmVvamI='
      })

      bot.addUser('12345', 'bkimminich')
      const testCommand = trainingData.data[0].utterances[0]

      await setupAuthenticatedRequest(token)
        .post(REST_URL + 'chatbot/respond', {
          body: {
            action: 'query',
            query: testCommand
          }
        })
        .post(REST_URL + 'chatbot/respond', {
          body: {
            action: 'query',
            query: testCommand
          }
        })
        .expect('status', 200)
        .promise()
        .then(({ json }) => {
          expect(trainingData.data[0].answers).toContainEqual(json)
        })
    })
  })
})