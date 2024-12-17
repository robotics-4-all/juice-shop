/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import chai = require('chai')
import sinonChai = require('sinon-chai')
import validateConfig from '../../lib/startup/validateConfig'

const expect = chai.expect
chai.use(sinonChai)

const { 
  checkUnambiguousMandatorySpecialProducts,
  checkNecessaryExtraKeysOnSpecialProducts,
  checkUniqueSpecialOnProducts,
  checkMinimumRequiredNumberOfProducts,
  checkUnambiguousMandatorySpecialMemories,
  checkMinimumRequiredNumberOfMemories,
  checkUniqueSpecialOnMemories,
  checkSpecialMemoriesHaveNoUserAssociated,
  checkYamlSchema
} = require('../../lib/startup/validateConfig')

// Helper function for testing products
const testProducts = (products: any[], validationFunction: Function) => {
  expect(validationFunction(products)).to.equal(true)
}

// Helper function for testing memories
const testMemories = (memories: any[], validationFunction: Function) => {
  expect(validationFunction(memories)).to.equal(true)
}

describe('configValidation', () => {
  describe('checkUnambiguousMandatorySpecialProducts', () => {
    it('should accept a valid config', () => {
      const products = [
        { name: 'Apple Juice', useForChristmasSpecialChallenge: true },
        { name: 'Orange Juice', urlForProductTamperingChallenge: 'foobar' },
        { name: 'Melon Juice', fileForRetrieveBlueprintChallenge: 'foobar', exifForBlueprintChallenge: ['OpenSCAD'] },
        { name: 'Rippertuer Special Juice', keywordsForPastebinDataLeakChallenge: ['bla', 'blubb'] }
      ]
      testProducts(products, checkUnambiguousMandatorySpecialProducts)
    })

    it('should fail if multiple products are configured for the same challenge', () => {
      const products = [
        { name: 'Apple Juice', useForChristmasSpecialChallenge: true },
        { name: 'Melon Bike', useForChristmasSpecialChallenge: true },
        { name: 'Orange Juice', urlForProductTamperingChallenge: 'foobar' },
        { name: 'Melon Juice', fileForRetrieveBlueprintChallenge: 'foobar', exifForBlueprintChallenge: ['OpenSCAD'] }
      ]
      expect(checkUnambiguousMandatorySpecialProducts(products)).to.equal(false)
    })

    it('should fail if a required challenge product is missing', () => {
      const products = [
        { name: 'Apple Juice', useForChristmasSpecialChallenge: true },
        { name: 'Orange Juice', urlForProductTamperingChallenge: 'foobar' }
      ]
      expect(checkUnambiguousMandatorySpecialProducts(products)).to.equal(false)
    })
  })

  describe('checkNecessaryExtraKeysOnSpecialProducts', () => {
    it('should accept a valid config', () => {
      const products = [
        { name: 'Apple Juice', useForChristmasSpecialChallenge: true },
        { name: 'Orange Juice', urlForProductTamperingChallenge: 'foobar' },
        { name: 'Melon Juice', fileForRetrieveBlueprintChallenge: 'foobar', exifForBlueprintChallenge: ['OpenSCAD'] },
        { name: 'Rippertuer Special Juice', keywordsForPastebinDataLeakChallenge: ['bla', 'blubb'] }
      ]
      testProducts(products, checkNecessaryExtraKeysOnSpecialProducts)
    })

    it('should fail if product has no exifForBlueprintChallenge', () => {
      const products = [
        { name: 'Apple Juice', useForChristmasSpecialChallenge: true },
        { name: 'Orange Juice', urlForProductTamperingChallenge: 'foobar' },
        { name: 'Melon Juice', fileForRetrieveBlueprintChallenge: 'foobar' },
        { name: 'Rippertuer Special Juice', keywordsForPastebinDataLeakChallenge: ['bla', 'blubb'] }
      ]
      expect(checkNecessaryExtraKeysOnSpecialProducts(products)).to.equal(false)
    })
  })

  describe('checkUniqueSpecialOnProducts', () => {
    it('should accept a valid config', () => {
      const products = [
        { name: 'Apple Juice', useForChristmasSpecialChallenge: true },
        { name: 'Orange Juice', urlForProductTamperingChallenge: 'foobar' },
        { name: 'Melon Juice', fileForRetrieveBlueprintChallenge: 'foobar', exifForBlueprintChallenge: ['OpenSCAD'] },
        { name: 'Rippertuer Special Juice', keywordsForPastebinDataLeakChallenge: ['bla', 'blubb'] }
      ]
      testProducts(products, checkUniqueSpecialOnProducts)
    })

    it('should fail if a product is configured for multiple challenges', () => {
      const products = [
        { name: 'Apple Juice', useForChristmasSpecialChallenge: true, urlForProductTamperingChallenge: 'foobar' }
      ]
      expect(checkUniqueSpecialOnProducts(products)).to.equal(false)
    })
  })

  describe('checkMinimumRequiredNumberOfProducts', () => {
    it('should accept a valid config', () => {
      const products = [
        { name: 'Apple Juice' },
        { name: 'Orange Juice' },
        { name: 'Melon Juice' },
        { name: 'Rippertuer Special Juice' }
      ]
      testProducts(products, checkMinimumRequiredNumberOfProducts)
    })

    it('should fail if less than 4 products are configured', () => {
      const products = [
        { name: 'Apple Juice' },
        { name: 'Orange Juice' },
        { name: 'Melon Juice' }
      ]
      expect(checkMinimumRequiredNumberOfProducts(products)).to.equal(false)
    })
  })

  describe('checkUnambiguousMandatorySpecialMemories', () => {
    it('should accept a valid config', () => {
      const memories = [
        { image: 'bla.png', geoStalkingMetaSecurityQuestion: 42, geoStalkingMetaSecurityAnswer: 'foobar' },
        { image: 'blubb.png', geoStalkingVisualSecurityQuestion: 43, geoStalkingVisualSecurityAnswer: 'barfoo' }
      ]
      testMemories(memories, checkUnambiguousMandatorySpecialMemories)
    })

    it('should fail if multiple memories are configured for the same challenge', () => {
      const memories = [
        { image: 'bla.png', geoStalkingMetaSecurityQuestion: 42, geoStalkingMetaSecurityAnswer: 'foobar' },
        { image: 'blubb.png', geoStalkingVisualSecurityQuestion: 43, geoStalkingVisualSecurityAnswer: 'barfoo' },
        { image: 'lalala.png', geoStalkingMetaSecurityQuestion: 46, geoStalkingMetaSecurityAnswer: 'foobarfoo' }
      ]
      expect(checkUnambiguousMandatorySpecialMemories(memories)).to.equal(false)
    })

    it('should fail if a required challenge memory is missing', () => {
      const memories = [
        { image: 'bla.png', geoStalkingMetaSecurityQuestion: 42, geoStalkingMetaSecurityAnswer: 'foobar' }
      ]
      expect(checkUnambiguousMandatorySpecialMemories(memories)).to.equal(false)
    })

    it('should fail if memories have mixed up the required challenge keys', () => {
      const memories = [
        { image: 'bla.png', geoStalkingMetaSecurityQuestion: 42, geoStalkingVisualSecurityAnswer: 'foobar' },
        { image: 'blubb.png', geoStalkingVisualSecurityQuestion: 43, geoStalkingMetaSecurityAnswer: 'barfoo' }
      ]
      expect(checkUnambiguousMandatorySpecialMemories(memories)).to.equal(false)
    })
  })

  describe('checkThatThereIsOnlyOneMemoryPerSpecial', () => {
    it('should accept a valid config', () => {
      const memories = [
        { image: 'bla.png', geoStalkingMetaSecurityQuestion: 42, geoStalkingMetaSecurityAnswer: 'foobar' },
        { image: 'blubb.png', geoStalkingVisualSecurityQuestion: 43, geoStalkingVisualSecurityAnswer: 'barfoo' }
      ]
      testMemories(memories, checkUniqueSpecialOnMemories)
    })

    it('should fail if a memory is configured for multiple challenges', () => {
      const memories = [
        { image: 'bla.png', caption: 'Bla', geoStalkingMetaSecurityQuestion: 42, geoStalkingMetaSecurityAnswer: 'foobar', geoStalkingVisualSecurityQuestion: 43, geoStalkingVisualSecurityAnswer: 'barfoo' }
      ]
      expect(checkUniqueSpecialOnMemories(memories)).to.equal(false)
    })
  })

  describe('checkSpecialMemoriesHaveNoUserAssociated', () => {
    it('should accept a valid config', () => {
      const memories = [
        { image: 'bla.png', geoStalkingMetaSecurityQuestion: 42, geoStalkingMetaSecurityAnswer: 'foobar' },
        { image: 'blubb.png', geoStalkingVisualSecurityQuestion: 43, geoStalkingVisualSecurityAnswer: 'barfoo' }
      ]
      testMemories(memories, checkSpecialMemoriesHaveNoUserAssociated)
    })

    it('should accept a config where the default users are associated', () => {
      const memories = [
        { user: 'john', image: 'bla.png', geoStalkingMetaSecurityQuestion: 42, geoStalkingMetaSecurityAnswer: 'foobar' },
        { user: 'emma', image: 'blubb.png', geoStalkingVisualSecurityQuestion: 43, geoStalkingVisualSecurityAnswer: 'barfoo' }
      ]
      testMemories(memories, checkSpecialMemoriesHaveNoUserAssociated)
    })

    it('should fail if a memory is linked to another user', () => {
      const memories = [
        { user: 'admin', image: 'bla.png', caption: 'Bla', geoStalkingMetaSecurityQuestion: 42, geoStalkingMetaSecurityAnswer: 'foobar' }
      ]
      expect(checkSpecialMemoriesHaveNoUserAssociated(memories)).to.equal(false)
    })
  })

  describe('checkYamlSchema', () => {
    it('should validate a proper YAML schema', () => {
      const validYaml = `
        products:
          - name: 'Apple Juice'
          - name: 'Orange Juice'
        memories:
          - image: 'bla.png'
            geoStalkingMetaSecurityQuestion: 42
            geoStalkingMetaSecurityAnswer: 'foobar'
      `
      expect(checkYamlSchema(validYaml)).to.equal(true)
    })
  })
})
