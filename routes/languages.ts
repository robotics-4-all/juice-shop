/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import locales from '../data/static/locales.json'
import fs from 'fs';
import path from 'path';
import { type Request, type Response, type NextFunction } from 'express'

interface Language {
  key: string;
  lang: Record<string, unknown>;
  icons: string[];
  shortKey: string;
  percentage: number;
  gauge: string;
}

const languages: Language[] = [];
let enContent: Record<string, unknown> = {};
const lang: Record<string, unknown> = {};

async function calcPercentage(fileContent: Record<string, unknown>, enContent: Record<string, unknown>): Promise<number> {
  const totalStrings = Object.keys(enContent).length
  let differentStrings = 0
  return await new Promise((resolve, reject) => {
    try {
      for (const key in fileContent) {
        if (Object.prototype.hasOwnProperty.call(fileContent, key) && fileContent[key] !== enContent[key]) {
          differentStrings++
        }
      }
      resolve((differentStrings / totalStrings) * 100)
    } catch (err) {
      reject(err)
    }
  })
}

// Example function to load languages (assuming this is part of your existing code)
function loadLanguages() {
  const languageFiles = fs.readdirSync(path.join(__dirname, '../i18n/'));
  languageFiles.forEach((file) => {
    const content = JSON.parse(fs.readFileSync(path.join(__dirname, '../i18n/', file), 'utf8'));
    const key = path.basename(file, '.json');
    const icons: string[] = []; // Add logic to populate icons
    const shortKey = key.substring(0, 2);
    const percentage = 0; // Add logic to calculate percentage
    const gauge = ''; // Add logic to set gauge

    languages.push({ key, lang: content, icons, shortKey, percentage, gauge });
  });
}

// Example usage of calcPercentage (assuming this is part of your existing code)
async function updateLanguagePercentages() {
  enContent = JSON.parse(fs.readFileSync(path.join(__dirname, '../i18n/en.json'), 'utf8'));
  for (const language of languages) {
    language.percentage = await calcPercentage(language.lang, enContent);
  }
}

// Call the functions to load languages and update percentages
loadLanguages();
updateLanguagePercentages();

export { languages, enContent, lang, calcPercentage };

module.exports = function getLanguageList () { // TODO Refactor and extend to also load backend translations from /i18n/*json and calculate joint percentage/gauge
  return (req: Request, res: Response, next: NextFunction) => {
    const languages: Array<{ key: string, lang: any, icons: string[], shortKey: string, percentage: unknown, gauge: string }> = []
    let count = 0
    let enContent: any

    fs.readFile('frontend/dist/frontend/assets/i18n/en.json', 'utf-8', (err, content) => {
      if (err != null) {
        next(new Error(`Unable to retrieve en.json language file: ${err.message}`))
      }
      enContent = JSON.parse(content)
      fs.readdir('frontend/dist/frontend/assets/i18n/', (err, languageFiles) => {
        if (err != null) {
          next(new Error(`Unable to read i18n directory: ${err.message}`))
        }
        languageFiles.forEach((fileName) => {
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          fs.readFile('frontend/dist/frontend/assets/i18n/' + fileName, 'utf-8', async (err, content) => {
            if (err != null) {
              next(new Error(`Unable to retrieve ${fileName} language file: ${err.message}`))
            }
            const fileContent = JSON.parse(content)
            const percentage = await calcPercentage(fileContent, enContent)
            const key = fileName.substring(0, fileName.indexOf('.'))
            const locale = locales.find((l) => l.key === key)
            const lang: any = {
              key,
              lang: fileContent.LANGUAGE,
              icons: locale?.icons,
              shortKey: locale?.shortKey,
              percentage,
              gauge: (percentage > 90 ? 'full' : (percentage > 70 ? 'three-quarters' : (percentage > 50 ? 'half' : (percentage > 30 ? 'quarter' : 'empty'))))
            }
            if (!(fileName === 'en.json' || fileName === 'tlh_AA.json')) {
              languages.push(lang)
            }
            count++
            if (count === languageFiles.length) {
              languages.push({ key: 'en', icons: ['gb', 'us'], shortKey: 'EN', lang: 'English', percentage: 100, gauge: 'full' })
              languages.sort((a, b) => a.lang.localeCompare(b.lang))
              res.status(200).json(languages)
            }
          })
        })
      })
    })
  }
}

export default module.exports
