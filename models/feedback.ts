/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

/* jslint node: true */
import {
  utils,
  challengeUtils,
  Model,
  DataTypes
} from './commonImports'
import type {
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  Sequelize
} from './commonImports'
import { challenges } from '../data/datacache'
import * as security from '../lib/insecurity'

class Feedback extends Model<
InferAttributes<Feedback>,
InferCreationAttributes<Feedback>
> {
  declare UserId: number | null
  declare id: CreationOptional<number>
  declare comment: string
  declare rating: number
}
const FeedbackModelInit = (sequelize: Sequelize) => {
  Feedback.init(
    {
      UserId: {
        type: DataTypes.INTEGER
      },
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      comment: {
        type: DataTypes.STRING,
        set (comment: string) {
          let sanitizedComment: string
          if (utils.isChallengeEnabled(challenges.persistedXssFeedbackChallenge)) {
            sanitizedComment = security.sanitizeHtml(comment)
            challengeUtils.solveIf(challenges.persistedXssFeedbackChallenge, () => {
              return utils.contains(
                sanitizedComment,
                '<iframe src="javascript:alert(`xss`)">'
              )
            })
          } else {
            sanitizedComment = security.sanitizeHtml(comment)
          }
          this.setDataValue('comment', sanitizedComment)
        }
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        set (rating: number) {
          this.setDataValue('rating', rating)
          challengeUtils.solveIf(challenges.zeroStarsChallenge, () => {
            return rating === 0
          })
        }
      }
    },
    {
      tableName: 'Feedbacks',
      sequelize
    }
  )
}

export { Feedback as FeedbackModel, FeedbackModelInit }
