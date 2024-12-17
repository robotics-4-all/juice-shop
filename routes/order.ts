/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import path = require("path");
import { type Request, type Response, type NextFunction } from "express";
import { BasketModel } from "../models/basket";
import { ProductModel } from "../models/product";
import { QuantityModel } from "../models/quantity";
import { DeliveryModel } from "../models/delivery";
import { WalletModel } from "../models/wallet";
import challengeUtils = require("../lib/challengeUtils");
import config from "config";
import * as utils from "../lib/utils";
import * as db from "../data/mongodb";
import { challenges, products } from "../data/datacache";
import { jsPDF } from "jspdf";

const security = require("../lib/insecurity");

interface Product {
  quantity: number;
  id?: number;
  name: string;
  price: number;
  total: number;
  bonus: number;
}

module.exports = function placeOrder() {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id;

    BasketModel.findOne({
      where: { id },
      include: [{ model: ProductModel, paranoid: false, as: "Products" }]
    })
      .then(async (basket: BasketModel | null) => {
        if (basket != null) {
          const customer = security.authenticatedUsers.from(req);
          const email = customer ? (customer.data ? customer.data.email : "") : "";
          const orderId = security.hash(email).slice(0, 4) + "-" + utils.randomHexString(16);
          const pdfFile = `order_${orderId}.pdf`;
          const doc = new jsPDF();

          const date = new Date().toJSON().slice(0, 10);

          // Generate PDF content
          doc.setFont("Times-Roman");
          doc.setFontSize(40);
          doc.text(config.get<string>("application.name"), 105, 50, { align: "center" });
          doc.setLineWidth(0.5);
          doc.line(70, 115, 540, 115);
          doc.line(70, 120, 540, 120);

          doc.setFontSize(20);
          doc.text(req.__("Order Confirmation"), 105, 150, { align: "center" });

          doc.setFontSize(15);
          doc.text(`${req.__("Customer")}: ${email}`, 20, 180);
          doc.text(`${req.__("Order")} #: ${orderId}`, 20, 200);
          doc.text(`${req.__("Date")}: ${date}`, 20, 220);

          doc.setFontSize(12);
          doc.text(" ", 20, 250); // Empty line

          let totalPrice = 0;
          const basketProducts: Product[] = [];
          let totalPoints = 0;

          // List products in the basket
          basket.Products?.forEach(({ BasketItem, price, deluxePrice, name, id }) => {
            if (BasketItem != null) {
              challengeUtils.solveIf(challenges.christmasSpecialChallenge, () => {
                return BasketItem.ProductId === products.christmasSpecial.id;
              });

              QuantityModel.findOne({ where: { ProductId: BasketItem.ProductId } })
                .then((product: any) => {
                  const newQuantity = product.quantity - BasketItem.quantity;
                  QuantityModel.update(
                    { quantity: newQuantity },
                    { where: { ProductId: BasketItem?.ProductId } }
                  ).catch(next);
                })
                .catch(next);

              let itemPrice = security.isDeluxe(req) ? deluxePrice : price;
              const itemTotal = itemPrice * BasketItem.quantity;
              const itemBonus = Math.round(itemPrice / 10) * BasketItem.quantity;

              const product = {
                quantity: BasketItem.quantity,
                id,
                name: req.__(name),
                price: itemPrice,
                total: itemTotal,
                bonus: itemBonus
              };

              basketProducts.push(product);

              doc.text(
                `${BasketItem.quantity}x ${req.__(name)} ${req.__("ea.")} ${itemPrice} = ${itemTotal}¤`,
                20,
                270 + basketProducts.length * 10
              );
              totalPrice += itemTotal;
              totalPoints += itemBonus;
            }
          });

          doc.text(" ", 20, 300); // Empty line

          const discount = calculateApplicableDiscount(basket, req);
          let discountAmount = "0";
          if (discount > 0) {
            discountAmount = (totalPrice * (discount / 100)).toFixed(2);
            doc.text(`${discount}% discount from coupon: -${discountAmount}¤`, 20, 320);
            totalPrice -= parseFloat(discountAmount);
          }

          const deliveryMethod = {
            deluxePrice: 0,
            price: 0,
            eta: 5
          };

          if (req.body.orderDetails?.deliveryMethodId) {
            const deliveryMethodFromModel = await DeliveryModel.findOne({
              where: { id: req.body.orderDetails.deliveryMethodId }
            });

            if (deliveryMethodFromModel != null) {
              deliveryMethod.deluxePrice = deliveryMethodFromModel.deluxePrice;
              deliveryMethod.price = deliveryMethodFromModel.price;
              deliveryMethod.eta = deliveryMethodFromModel.eta;
            }
          }

          const deliveryAmount = security.isDeluxe(req) ? deliveryMethod.deluxePrice : deliveryMethod.price;
          totalPrice += deliveryAmount;
          doc.text(`${req.__("Delivery Price")}: ${deliveryAmount.toFixed(2)}¤`, 20, 340);
          doc.text(`${req.__("Total Price")}: ${totalPrice.toFixed(2)}¤`, 20, 360);

          doc.text(`${req.__("Bonus Points Earned")}: ${totalPoints}`, 20, 380);
          doc.text(
            `(${req.__(
              "The bonus points from this order will be added 1:1 to your wallet ¤-fund for future purchases!"
            )}`,
            20,
            400
          );

          doc.text(`${req.__("Thank you for your order!")}`, 20, 420);

          challengeUtils.solveIf(challenges.negativeOrderChallenge, () => {
            return totalPrice < 0;
          });

          // Wallet transaction logic
          if (req.body.UserId) {
            if (req.body.orderDetails && req.body.orderDetails.paymentId === "wallet") {
              const wallet = await WalletModel.findOne({ where: { UserId: req.body.UserId } });
              if (wallet && wallet.balance >= totalPrice) {
                await WalletModel.decrement({ balance: totalPrice }, { where: { UserId: req.body.UserId } });
              } else {
                next(new Error("Insufficient wallet balance."));
              }
            }

            WalletModel.increment({ balance: totalPoints }, { where: { UserId: req.body.UserId } }).catch(next);
          }

          db.ordersCollection
            .insert({
              promotionalAmount: discountAmount,
              paymentId: req.body.orderDetails ? req.body.orderDetails.paymentId : null,
              addressId: req.body.orderDetails ? req.body.orderDetails.addressId : null,
              orderId,
              delivered: false,
              email: email ? email.replace(/[aeiou]/gi, "*") : undefined,
              totalPrice,
              products: basketProducts,
              bonus: totalPoints,
              deliveryPrice: deliveryAmount,
              eta: deliveryMethod.eta.toString()
            })
            .then(() => {
              // Save the PDF
              const filePath = path.join("ftp/", path.basename(pdfFile));
              doc.save(filePath); // Save PDF file
              res.json({ orderConfirmation: orderId });
            });
        } else {
          next(new Error(`Basket with id=${id} does not exist.`));
        }
      })
      .catch((error: unknown) => {
        next(error);
      });
  };
};

function calculateApplicableDiscount(basket: BasketModel, req: Request) {
  if (security.discountFromCoupon(basket.coupon)) {
    const discount = security.discountFromCoupon(basket.coupon);
    challengeUtils.solveIf(challenges.forgedCouponChallenge, () => {
      return discount >= 80;
    });
    return discount;
  } else if (req.body.couponData) {
    const couponData = Buffer.from(req.body.couponData, "base64").toString().split("-");
    const couponCode = couponData[0];
    const couponDate = Number(couponData[1]);
    const campaign = campaigns[couponCode as keyof typeof campaigns];

    if (campaign && couponDate == campaign.validOn) {
      // eslint-disable-line eqeqeq
      challengeUtils.solveIf(challenges.manipulateClockChallenge, () => {
        return campaign.validOn < new Date().getTime();
      });
      return campaign.discount;
    }
  }
  return 0;
}

const campaigns = {
  WMNSDY2019: { validOn: new Date("Mar 08, 2019 00:00:00 GMT+0100").getTime(), discount: 75 },
  WMNSDY2020: { validOn: new Date("Mar 08, 2020 00:00:00 GMT+0100").getTime(), discount: 60 },
  WMNSDY2021: { validOn: new Date("Mar 08, 2021 00:00:00 GMT+0100").getTime(), discount: 60 },
  WMNSDY2022: { validOn: new Date("Mar 08, 2022 00:00:00 GMT+0100").getTime(), discount: 60 },
  WMNSDY2023: { validOn: new Date("Mar 08, 2023 00:00:00 GMT+0100").getTime(), discount: 60 },
  ORANGE2020: { validOn: new Date("May 04, 2020 00:00:00 GMT+0100").getTime(), discount: 50 },
  ORANGE2021: { validOn: new Date("May 04, 2021 00:00:00 GMT+0100").getTime(), discount: 40 },
  ORANGE2022: { validOn: new Date("May 04, 2022 00:00:00 GMT+0100").getTime(), discount: 40 },
  ORANGE2023: { validOn: new Date("May 04, 2023 00:00:00 GMT+0100").getTime(), discount: 40 }
};
