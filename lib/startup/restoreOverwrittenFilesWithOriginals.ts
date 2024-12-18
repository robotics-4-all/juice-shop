/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import path from 'path'
import * as utils from '../utils'
import logger from '../logger'
import { copyFile, access } from 'fs/promises'
import { glob } from 'glob'

import { existsSync } from 'fs';


// Helper function to safely copy files with error handling
const safeCopyFile = async (source: string, destination: string): Promise<void> => {
  try {
    // Validate paths to prevent path traversal
    if (!source.startsWith(path.resolve('./data/static'))) {
      throw new Error(`Invalid source path: ${source}`);
    }

    await copyFile(source, destination);
    logger.info(`File copied: ${source} -> ${destination}`);
  } catch (err) {
    logger.error(`Failed to copy file from ${source} to ${destination}: ${utils.getErrorMessage(err)}`);
  }
};

const restoreOverwrittenFilesWithOriginals = async (): Promise<void> => {
  const baseDir = path.resolve('./'); // Define base directory for safety
  const staticDir = path.resolve(baseDir, 'data/static'); // Static data directory

  // Safely copy legal.md
  await safeCopyFile(
    path.resolve(staticDir, 'legal.md'),
    path.resolve(baseDir, 'ftp/legal.md')
  );

  // Check if 'frontend/dist' exists
  if (existsSync(path.resolve(baseDir, 'frontend/dist'))) {
    await safeCopyFile(
      path.resolve(staticDir, 'owasp_promo.vtt'),
      path.resolve(baseDir, 'frontend/dist/frontend/assets/public/videos/owasp_promo.vtt')
    );
  }

  // Copy all JSON files from static/i18n to i18n
  try {
    const jsonFiles = await glob(path.resolve(staticDir, 'i18n/*.json'));
    await Promise.all(
      jsonFiles.map(async (filename) => {
        const destination = path.resolve(baseDir, 'i18n', path.basename(filename));
        await safeCopyFile(filename, destination);
      })
    );
  } catch (err) {
    logger.warn(`Error listing JSON files in /data/static/i18n folder: ${utils.getErrorMessage(err)}`);
  }
};

export default restoreOverwrittenFilesWithOriginals
