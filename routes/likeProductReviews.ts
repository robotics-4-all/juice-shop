/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import challengeUtils = require('../lib/challengeUtils');
import { type Request, type Response, type NextFunction } from 'express';
import { type Review } from '../data/types';
import * as db from '../data/mongodb';
import { challenges } from '../data/datacache';
import * as security from '../lib/insecurity';

module.exports = function productReviews() {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.body.id;
    const user = security.authenticatedUsers.from(req);
    db.reviewsCollection.findOne({ _id: id }).then((review: Review) => {
      if (!review) {
        res.status(404).json({ error: 'Not found' });
      } else {
        const likedBy = review.likedBy;
        if (user && user.data && !likedBy.includes(user.data.email)) {
          db.reviewsCollection.update(
            { _id: id },
            { $inc: { likesCount: 1 } }
          ).then(() => {
            // Artificial wait for timing attack challenge
            setTimeout(function () {
              db.reviewsCollection.findOne({ _id: id }).then((review: Review) => {
                const likedBy = review.likedBy;
                if (user && user.data && user.data.email) {
                  likedBy.push(user.data.email);
                }
                if (user && user.data && user.data.email) {
                  let count = 0;
                  for (let i = 0; i < likedBy.length; i++) {
                    if (likedBy[i] === user.data.email) {
                      count++;
                    }
                  }
                  challengeUtils.solveIf(challenges.timingAttackChallenge, () => { return count > 2 });
                  db.reviewsCollection.update(
                    { _id: id },
                    { $set: { likedBy: likedBy } }
                  ).then(() => {
                    res.status(200).json({ likesCount: review.likesCount + 1 });
                  });
                }
              });
            }, 2000);
          }).catch(next);
        }
      }

    }).catch(next);
  };
};

    }, () => {
      res.status(400).json({ error: 'Wrong Params' })
    })
  }
}

export default module.exports

