/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import chai = require('chai')
import sinonChai = require('sinon-chai')
import validateConfig from '../../lib/startup/validateConfig'

const expect = chai.expect
chai.use(sinonChai)

const { checkUnambiguousMandatorySpecialProducts, checkUniqueSpecialOnProducts, checkYamlSchema, checkMinimumRequiredNumberOfProducts, checkUnambiguousMandatorySpecialMemories, checkMinimumRequiredNumberOfMemories, checkUniqueSpecialOnMemories, checkSpecialMemoriesHaveNoUserAssociated, checkNecessaryExtraKeysOnSpecialProducts } = require('../../lib/startup/validateConfig')

const validProductsConfig = [
  {
    name: 'Apple Juice',
    useForChristmasSpecialChallenge: true
  },
  {
    name: 'Orange Juice',
    urlForProductTamperingChallenge: 'foobar'
  },
  {
    name: 'Melon Juice',
    fileForRetrieveBlueprintChallenge: 'foobar',
    exifForBlueprintChallenge: ['OpenSCAD']
  },
  {
    name: 'Rippertuer Special Juice',
    keywordsForPastebinDataLeakChallenge: ['bla', 'blubb']
  }
];

describe('configValidation', () => {
  describe('checkUnambiguousMandatorySpecialProducts', () => {
    it('should accept a valid config', () => {
      const products = validProductsConfig;
      // ...existing code...
    });

    it('should accept another valid config', () => {
      const products = validProductsConfig;
      // ...existing code...
    });

    it('should accept yet another valid config', () => {
      const products = validProductsConfig;
      // ...existing code...
    });
  });
});