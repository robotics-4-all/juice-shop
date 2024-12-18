import path from 'path'
import { readFile } from 'fs/promises'
import { safeLoad } from 'js-yaml'
import logger from '../lib/logger'

import sanitizeFilename from 'sanitize-filename';

// Whitelist allowed filenames
function isValidFilename(file: string): boolean {
  const validFilenameRegex = /^[a-zA-Z0-9._-]+$/; // Allow alphanumeric, dots, hyphens, and underscores
  return validFilenameRegex.test(file);
}

// Load static data securely
export async function loadStaticData(file: string) {
  try {
    // Sanitize and validate the file name
    const sanitizedFile = sanitizeFilename(file);
    if (!sanitizedFile || !isValidFilename(sanitizedFile)) {
      throw new Error('Invalid file name');
    }

    // Define a base directory for security
    const baseDir = path.resolve('./data/static');
    const filePath = path.resolve(baseDir, sanitizedFile + '.yml');

    // Ensure the filePath is within the allowed directory
    if (!filePath.startsWith(baseDir)) {
      throw new Error('Path traversal attempt detected');
    }

    // Safely read the file
    const fileContent = await readFile(filePath, 'utf8');
    return safeLoad(fileContent);
  } catch (err) {
    logger.error('Could not open file: "' + file + '"', err);
    return null;
  }
}

export interface StaticUser {
  email: string
  password: string
  key: string
  role: 'admin' | 'customer' | 'deluxe' | 'accounting'

  username?: string
  profileImage?: string
  walletBalance?: number
  lastLoginIp?: string
  deletedFlag?: boolean
  totpSecret?: string
  customDomain?: boolean
  securityQuestion?: StaticUserSecurityQuestion
  feedback?: StaticUserFeedback
  address?: StaticUserAddress[]
  card?: StaticUserCard[]
}
export interface StaticUserSecurityQuestion {
  id: number
  answer: string
}
export interface StaticUserFeedback {
  comment: string
  rating: 1 | 2 | 3 | 4 | 5
}
export interface StaticUserAddress {
  fullName: string
  mobileNum: number
  zipCode: string
  streetAddress: string
  city: string
  state: string
  country: string
}
export interface StaticUserCard {
  fullName: string
  cardNum: number
  expMonth: number
  expYear: number
}
export async function loadStaticUserData (): Promise<StaticUser[]> {
  return await loadStaticData('users') as StaticUser[]
}

export interface StaticChallenge {
  name: string
  category: string
  tags?: string[]
  description: string
  difficulty: number
  hint: string
  hintUrl: string
  mitigationUrl: string
  key: string
  disabledEnv?: string[]
  tutorial?: {
    order: number
  }
}
export async function loadStaticChallengeData (): Promise<StaticChallenge[]> {
  return await loadStaticData('challenges') as StaticChallenge[]
}

export interface StaticDelivery {
  name: string
  price: number
  deluxePrice: number
  eta: number
  icon: string
}
export async function loadStaticDeliveryData (): Promise<StaticDelivery[]> {
  return await loadStaticData('deliveries') as StaticDelivery[]
}

export interface StaticSecurityQuestions {
  question: string
}
export async function loadStaticSecurityQuestionsData (): Promise<StaticSecurityQuestions[]> {
  return await loadStaticData('securityQuestions') as StaticSecurityQuestions[]
}
