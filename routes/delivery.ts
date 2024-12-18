/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { type Request, type Response } from 'express'
import { DeliveryModel } from '../models/delivery'

import {isDeluxe} from '../lib/insecurity'

export function getDeliveryMethods () {
  return async (req: Request, res: Response) => {
    const methods = await DeliveryModel.findAll()
    if (methods) {
      const sendMethods = []
      for (const method of methods) {
        sendMethods.push({
          id: method.id,
          name: method.name,
          price: isDeluxe(req) ? method.deluxePrice : method.price,
          eta: method.eta,
          icon: method.icon
        })
      }
      res.status(200).json({ status: 'success', data: sendMethods })
    } else {
      res.status(400).json({ status: 'error' })
    }
  }
}

export function getDeliveryMethod () {
  return async (req: Request, res: Response) => {
    const method = await DeliveryModel.findOne({ where: { id: req.params.id } })
    if (method != null) {
      const sendMethod = {
        id: method.id,
        name: method.name,
        price: isDeluxe(req) ? method.deluxePrice : method.price,
        eta: method.eta,
        icon: method.icon
      }
      res.status(200).json({ status: 'success', data: sendMethod })
    } else {
      res.status(400).json({ status: 'error' })
    }
  }
}
