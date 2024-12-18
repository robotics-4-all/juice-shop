import { Op } from 'sequelize'
import { ChallengeModel } from '../models/challenge'
import logger from './logger'
import config from 'config'
import sanitizeHtml from 'sanitize-html'
import colors from 'colors/safe'
import * as utils from './utils'
import { calculateCheatScore, calculateFindItCheatScore, calculateFixItCheatScore } from './antiCheat'
import * as webhook from './webhook'
import * as accuracy from './accuracy'
import { type Server } from 'socket.io'
import { AllHtmlEntities as Entities } from 'html-entities'
import { challenges, notifications } from '../data/datacache'

const entities = new Entities()

const globalWithSocketIO = global as typeof globalThis & {
  io: SocketIOClientStatic & Server
}

export interface Challenge {
  key: string
  name: string
  description: string
  difficulty: number
  solved: boolean
  save: () => Promise<Challenge>
  id: number
  category: string
  hint: string
  hintUrl: string
  codingChallengeStatus: 0 | 1 | 2
  // Add other properties as needed
}

export const solveIf = function (challenge: Challenge, criteria: () => boolean, isRestore: boolean = false) {
  if (notSolved(challenge) && criteria()) {
    solve(challenge, isRestore)
  }
}

function notSolved(challenge: Challenge): boolean {
  return !challenge.solved
}

export const solve = function (challenge: Challenge, isRestore = false) {
  challenge.solved = true
  challenge.save().then((solvedChallenge: Challenge) => {
    logger.info(`${isRestore ? colors.grey('Restored') : colors.green('Solved')} ${solvedChallenge.difficulty}-star ${colors.cyan(solvedChallenge.key)} (${solvedChallenge.name})`)
    sendNotification(solvedChallenge, isRestore)
    if (!isRestore) {
      const cheatScore = calculateCheatScore(challenge as unknown as ChallengeModel)
      if (process.env.SOLUTIONS_WEBHOOK) {
        webhook.notify(solvedChallenge, cheatScore).catch((error: unknown) => {
          logger.error('Webhook notification failed: ' + colors.red(utils.getErrorMessage(error)))
        })
      }
    }
  }).catch((error: unknown) => {
    logger.error('Challenge save failed: ' + colors.red(utils.getErrorMessage(error)))
  })
}

// function notifyChallenge(challenge: Challenge, isRestore: boolean) {
//   // Add logic to send notification
// }

export const someOtherFunction = function (challenge: Challenge, data: string) {
  if (notSolved(challenge)) {
    // Add logic to handle some other function
  }
}

export const sendNotification = function (challenge: Challenge, isRestore: boolean) {
  if (!notSolved(challenge)) {
    const flag = utils.ctfFlag(challenge.name)
    const notification = {
      key: challenge.key,
      name: challenge.name,
      challenge: challenge.name + ' (' + entities.decode(sanitizeHtml(challenge.description, { allowedTags: [], allowedAttributes: {} })) + ')',
      flag,
      hidden: !config.get('challenges.showSolvedNotifications'),
      isRestore
    }
    const wasPreviouslyShown = notifications.some(({ key }) => key === challenge.key)
    notifications.push(notification)

    if (globalWithSocketIO.io && (isRestore || !wasPreviouslyShown)) {
      globalWithSocketIO.io.emit('challenge solved', notification)
    }
  }
}

export const sendCodingChallengeNotification = function (challenge: { key: string, codingChallengeStatus: 0 | 1 | 2 }) {
  if (challenge.codingChallengeStatus > 0) {
    const notification = {
      key: challenge.key,
      codingChallengeStatus: challenge.codingChallengeStatus
    }
    if (globalWithSocketIO.io) {
      globalWithSocketIO.io.emit('code challenge solved', notification)
    }
  }
}

export const findChallengeByName = (challengeName: string) => {
  for (const c in challenges) {
    if (Object.prototype.hasOwnProperty.call(challenges, c)) {
      if (challenges[c].name === challengeName) {
        return challenges[c]
      }
    }
  }
  logger.warn('Missing challenge with name: ' + challengeName)
}

export const findChallengeById = (challengeId: number) => {
  for (const c in challenges) {
    if (Object.prototype.hasOwnProperty.call(challenges, c)) {
      if (challenges[c].id === challengeId) {
        return challenges[c]
      }
    }
  }
  logger.warn('Missing challenge with id: ' + challengeId)
}

export const solveFindIt = async function (key: string, isRestore: boolean) {
  const solvedChallenge = challenges[key]
  await ChallengeModel.update({ codingChallengeStatus: 1 }, { where: { key, codingChallengeStatus: { [Op.lt]: 2 } } })
  logger.info(`${isRestore ? colors.grey('Restored') : colors.green('Solved')} 'Find It' phase of coding challenge ${colors.cyan(solvedChallenge.key)} (${solvedChallenge.name})`)
  if (!isRestore) {
    accuracy.storeFindItVerdict(solvedChallenge.key, true)
    accuracy.calculateFindItAccuracy(solvedChallenge.key)
    await calculateFindItCheatScore(solvedChallenge)
    sendCodingChallengeNotification({ key, codingChallengeStatus: 1 })
  }
}

export const solveFixIt = async function (key: string, isRestore: boolean) {
  const solvedChallenge = challenges[key]
  await ChallengeModel.update({ codingChallengeStatus: 2 }, { where: { key } })
  logger.info(`${isRestore ? colors.grey('Restored') : colors.green('Solved')} 'Fix It' phase of coding challenge ${colors.cyan(solvedChallenge.key)} (${solvedChallenge.name})`)
  if (!isRestore) {
    accuracy.storeFixItVerdict(solvedChallenge.key, true)
    accuracy.calculateFixItAccuracy(solvedChallenge.key)
    await calculateFixItCheatScore(solvedChallenge)
    sendCodingChallengeNotification({ key, codingChallengeStatus: 2 })
  }
}


export interface Challenge {

  key: string

  name: string

  description: string

  difficulty: number

  solved: boolean

  save: () => Promise<Challenge>

  id: number

  category: string

  hint: string

  hintUrl: string

  codingChallengeStatus: 0 | 1 | 2

  // Add other properties as needed

}
