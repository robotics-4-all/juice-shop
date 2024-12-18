/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import path from 'path'
import { type Request, type Response, type NextFunction } from 'express'
import { BasketModel } from '../models/basket'
import { ProductModel } from '../models/product'
import { BasketItemModel } from '../models/basketitem'
import { QuantityModel } from '../models/quantity'
import { DeliveryModel } from '../models/delivery'
import { WalletModel } from '../models/wallet'
import challengeUtils = require('../lib/challengeUtils')
import config from 'config'
import * as utils from '../lib/utils'
import * as db from '../data/mongodb'
import { challenges, products } from '../data/datacache'
import fs from 'fs'
import PDFDocument from 'pdfkit'
import * as security from '../lib/insecurity'

interface Product {
  quantity: number
  id?: number
  name: string
  price: number
  total: number
  bonus: number
}

module.exports = function placeOrder () {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id
      const basket = await BasketModel.findOne({
        where: { id },
        include: [{ model: ProductModel, paranoid: false, as: 'Products' }]
      })

      if (!basket) {
        return next(new Error(`Basket with id=${id} does not exist.`))
      }

      const customer = security.authenticatedUsers.from(req)
      const email = customer?.data?.email || ''
      const orderId = security.hash(email).slice(0, 4) + '-' + utils.randomHexString(16)
      const pdfFile = `order_${orderId}.pdf`
      const doc = new PDFDocument()
      const filePath = path.join('ftp/', pdfFile)
      const date = new Date().toISOString().slice(0, 10)
      const fileWriter = doc.pipe(fs.createWriteStream(filePath))

      // Basket processing
      let totalPrice = 0
      let totalPoints = 0
      const basketProducts: Product[] = []

      await Promise.all(
        basket.Products?.map(async ({ BasketItem, price, deluxePrice, name, id }) => {
          if (!BasketItem) return

          challengeUtils.solveIf(challenges.christmasSpecialChallenge, () => {
            return BasketItem.ProductId === products.christmasSpecial.id
          })

          const product = await QuantityModel.findOne({ where: { ProductId: BasketItem.ProductId } })
          if (product) {
            await QuantityModel.update(
              { quantity: product.quantity - BasketItem.quantity },
              { where: { ProductId: BasketItem.ProductId } }
            )
          }

          const itemPrice = security.isDeluxe(req) ? deluxePrice : price
          const itemTotal = itemPrice * BasketItem.quantity
          const itemBonus = Math.round(itemPrice / 10) * BasketItem.quantity

          basketProducts.push({
            quantity: BasketItem.quantity,
            id,
            name: req.__(name),
            price: itemPrice,
            total: itemTotal,
            bonus: itemBonus
          })

          doc.text(`${BasketItem.quantity}x ${req.__(name)} ${req.__('ea.')} ${itemPrice.toFixed(2)} = ${itemTotal.toFixed(2)}¤`).moveDown()

          totalPrice += itemTotal
          totalPoints += itemBonus
        }) || []
      )

      // Apply discount
      const discount = calculateApplicableDiscount(basket, req)
      let discountAmount = 0
      if (discount) {
        discountAmount = totalPrice * (discount / 100)
        doc.text(`${discount}% discount from coupon: -${discountAmount.toFixed(2)}¤`).moveDown()
        totalPrice -= discountAmount
      }

      // Delivery
      const deliveryMethod = await getDeliveryDetails(req.body.orderDetails?.deliveryMethodId)
      const deliveryAmount = security.isDeluxe(req) ? deliveryMethod.deluxePrice : deliveryMethod.price
      totalPrice += deliveryAmount

      doc.text(`${req.__('Delivery Price')}: ${deliveryAmount.toFixed(2)}¤`).moveDown()
      doc.font('Helvetica-Bold').fontSize(20).text(`${req.__('Total Price')}: ${totalPrice.toFixed(2)}¤`).moveDown()
      doc.font('Helvetica-Bold').fontSize(15).text(`${req.__('Bonus Points Earned')}: ${totalPoints.toString()}`)

      // Finalize PDF
      doc.text(req.__('Thank you for your order!')).end()

      fileWriter.on('finish', async () => {
        await basket.update({ coupon: null })
        await BasketItemModel.destroy({ where: { BasketId: id } })

        if (req.body.UserId) {
          await processWallet(req.body.UserId, totalPrice, totalPoints, req.body.orderDetails?.paymentId)
        }

        await db.ordersCollection.insert({
          promotionalAmount: discountAmount.toFixed(2),
          paymentId: req.body.orderDetails?.paymentId || null,
          addressId: req.body.orderDetails?.addressId || null,
          orderId,
          delivered: false,
          email: email.replace(/[aeiou]/gi, '*'),
          totalPrice,
          products: basketProducts,
          bonus: totalPoints,
          deliveryPrice: deliveryAmount,
          eta: deliveryMethod.eta.toString()
        })

        res.json({ orderConfirmation: orderId })
      })
    } catch (error) {
      next(error)
    }
  }
}

async function getDeliveryDetails(deliveryMethodId?: number) {
  const delivery = await DeliveryModel.findOne({ where: { id: deliveryMethodId } })
  return delivery || { deluxePrice: 0, price: 0, eta: 5 }
}

async function processWallet(userId: number, totalPrice: number, totalPoints: number, paymentId?: string) {
  const wallet = await WalletModel.findOne({ where: { UserId: userId } })
  if (paymentId === 'wallet' && wallet && wallet.balance >= totalPrice) {
    await WalletModel.decrement({ balance: totalPrice }, { where: { UserId: userId } })
  } else if (paymentId === 'wallet') {
    throw new Error('Insufficient wallet balance.')
  }
  await WalletModel.increment({ balance: totalPoints }, { where: { UserId: userId } })
}

function calculateApplicableDiscount(basket: BasketModel, req: Request) {
  if (basket.coupon && security.discountFromCoupon(basket.coupon)) {
    return security.discountFromCoupon(basket.coupon)
  }
  if (req.body.couponData) {
    const [couponCode, couponDate] = Buffer.from(req.body.couponData, 'base64').toString().split('-')
    const campaign = campaigns[couponCode as keyof typeof campaigns]
    if (campaign && +couponDate === campaign.validOn) {
      return campaign.discount
    }
  }
  return 0
}

const campaigns = {
  WMNSDY2019: { validOn: new Date('2019-03-08').getTime(), discount: 75 },
  WMNSDY2020: { validOn: new Date('2020-03-08').getTime(), discount: 60 },
  ORANGE2020: { validOn: new Date('2020-05-04').getTime(), discount: 50 }
}

export default module.exports
