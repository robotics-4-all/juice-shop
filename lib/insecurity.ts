/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import fs from 'fs'
import crypto from 'crypto'
import { type Request, type Response, type NextFunction } from 'express'
import { type UserModel } from 'models/user'
import expressJwt from 'express-jwt'
import jwt from 'jsonwebtoken'
import jws from 'jws'
import sanitizeHtmlLib from 'sanitize-html'
import sanitizeFilenameLib from 'sanitize-filename'
// import * as utils from './utils'
import config from 'config'
import dotenv from 'dotenv'

dotenv.config()

/* jslint node: true */
// eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
// ts-expect-error FIXME no typescript definitions for z85 :(
// import * as z85 from 'z85'

export const publicKey = fs ? fs.readFileSync('encryptionkeys/jwt.pub', 'utf8') : 'placeholder-public-key'
// const privateKey = '-----BEGIN RSA PRIVATE KEY-----\r\nMIICXAIBAAKBgQDNwqLEe9wgTXCbC7+RPdDbBbeqjdbs4kOPOIGzqLpXvJXlxxW8iMz0EaM4BKUqYsIa+ndv3NAn2RxCd5ubVdJJcX43zO6Ko0TFEZx/65gY3BE0O6syCEmUP4qbSd6exou/F+WTISzbQ5FBVPVmhnYhG/kpwt/cIxK5iUn5hm+4tQIDAQABAoGBAI+8xiPoOrA+KMnG/T4jJsG6TsHQcDHvJi7o1IKC/hnIXha0atTX5AUkRRce95qSfvKFweXdJXSQ0JMGJyfuXgU6dI0TcseFRfewXAa/ssxAC+iUVR6KUMh1PE2wXLitfeI6JLvVtrBYswm2I7CtY0q8n5AGimHWVXJPLfGV7m0BAkEA+fqFt2LXbLtyg6wZyxMA/cnmt5Nt3U2dAu77MzFJvibANUNHE4HPLZxjGNXN+a6m0K6TD4kDdh5HfUYLWWRBYQJBANK3carmulBwqzcDBjsJ0YrIONBpCAsXxk8idXb8jL9aNIg15Wumm2enqqObahDHB5jnGOLmbasizvSVqypfM9UCQCQl8xIqy+YgURXzXCN+kwUgHinrutZms87Jyi+D8Br8NY0+Nlf+zHvXAomD2W5CsEK7C+8SLBr3k/TsnRWHJuECQHFE9RA2OP8WoaLPuGCyFXaxzICThSRZYluVnWkZtxsBhW2W8z1b8PvWUE7kMy7TnkzeJS2LSnaNHoyxi7IaPQUCQCwWU4U+v4lD7uYBw00Ga/xt+7+UqFPlPVdz1yyr4q24Zxaw0LgmuEvgU5dycq8N7JxjTubX0MIRR+G9fmDBBl8=\r\n-----END RSA PRIVATE KEY-----'
const privateKey = process.env.JWT_PRIVATE_KEY ?? 'default-private-key'
// interface ResponseWithUser {
//   status: string
//   data: UserModel
//   iat: number
//   exp: number
// }

export const sanitizeHtml = (html: string): string => {
  return sanitizeHtmlLib(html)
}

export const sanitizeFilename = (filename: string): string => {
  return sanitizeFilenameLib(filename)
}

export const verify = (token: string): boolean => {
  try {
    return jws.verify(token, 'HS256', publicKey)
  } catch (err) {
    return false
  }
}

export const authorize = (req: Request, res: Response, next: NextFunction): void => {
  expressJwt({ secret: publicKey, algorithms: ['RS256'] })(req, res, next)
}

export const generateToken = (user: UserModel): string => {
  return jwt.sign({ data: user }, privateKey, { expiresIn: '1h', algorithm: 'RS256' })
}

export const decode = (token: string): string | object | null => {
  return jwt.decode(token)
}

export const hash = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('hex')
}

export const verifyPassword = (password: string, hash: string): boolean => {
  return crypto.timingSafeEqual(Buffer.from(password), Buffer.from(hash))
}

// Removed duplicate generateCoupon function

interface ProductConfig {
  blueprint?: string
}

export const getBlueprint = (): string | null => {
  for (const product of config.get<ProductConfig[]>('products')) {
    if (product.blueprint) {
      return product.blueprint
    }
  }
  return null
}

export const generateCoupon = (discount: number): string => {
  const couponCode = `DISCOUNT-${discount}-${Date.now()}`
  return couponCode
}

export default module.exports
