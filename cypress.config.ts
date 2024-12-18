import type { Memory as MemoryConfig, Product as ProductConfig } from './lib/config.types'
import * as appConfig from 'config'
import * as utils from './lib/utils'
import * as otplib from 'otplib'
import { defineConfig } from 'cypress'

export default defineConfig({
  projectId: '3hrkhu',
  defaultCommandTimeout: 10000,
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'test/cypress/e2e/**.spec.ts',
    downloadsFolder: 'test/cypress/downloads',
    fixturesFolder: false,
    supportFile: 'test/cypress/support/e2e.ts',
    setupNodeEvents (on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions) {
      on('before:browser:launch', (browser: Cypress.Browser, launchOptions: Cypress.BeforeBrowserLaunchOptions) => {
        if (browser.name === 'chrome' && browser.isHeadless) {
          launchOptions.args = launchOptions.args.map((arg: string) => {
            if (arg === '--headless') {
              return '--headless=new'
            }
            return arg
          })
        }
        return launchOptions
      })

      on('task', {
        GenerateCoupon (discount: number) {
          return utils.generateCoupon(discount)
        },
        GetBlueprint () {
          for (const product of appConfig.get<ProductConfig[]>('products')) {
            if (product.fileForRetrieveBlueprintChallenge) {
              const blueprint = product.fileForRetrieveBlueprintChallenge
              return blueprint
            }
          }
        },
        GetChristmasProduct () {
          return appConfig.get<ProductConfig[]>('products').filter(
            (product) => product.useForChristmasSpecialChallenge
          )[0]
        },
        GetCouponIntent () {
          const trainingData = require(`data/chatbot/${utils.extractFilename(
            appConfig.get('application.chatBot.trainingData')
          )}`)
          const couponIntent = trainingData.data.filter(
            (data: { intent: string }) => data.intent === 'queries.couponCode'
          )[0]
          return couponIntent
        },
        GetFromMemories (property: string) {
          for (const memory of appConfig.get<MemoryConfig[]>('memories') as any) {
            if (memory[property]) {
              return memory[property]
            }
          }
        },
        GetFromConfig (variable: string) {
          return appConfig.get(variable)
        },
        GetOverwriteUrl () {
          return appConfig.get('challenges.overwriteUrlForProductTamperingChallenge')
        },
        GetPastebinLeakProduct () {
          return appConfig.get<ProductConfig[]>('products').filter(
            (product) => product.keywordsForPastebinDataLeakChallenge
          )[0]
        },
        GetTamperingProductId () {
          const products = appConfig.get<ProductConfig[]>('products')
          for (let i = 0; i < products.length; i++) {
            if (products[i].urlForProductTamperingChallenge) {
              return i + 1
            }
          }
        },
        GenerateAuthenticator (inputString: string) {
          return otplib.authenticator.generate(inputString)
        },
        toISO8601 () {
          const date = new Date()
          return utils.toISO8601(date)
        },
        isDocker () {
          return utils.isDocker()
        },
        isWindows () {
          return utils.isWindows()
        }
      })
    }
  }
})
// utils.ts
export function generateCoupon(discount: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let coupon = '';
  for (let i = 0; i < 10; i++) {
    coupon += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return `${coupon}-${discount}`;
}