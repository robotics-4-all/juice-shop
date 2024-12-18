/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */
import jwtDecode from 'jwt-decode'

let config: { [key: string]: any } | undefined
const playbackDelays = {
  faster: 0.5,
  fast: 0.75,
  normal: 1.0,
  slow: 1.25,
  slower: 1.5
}

interface WaitForInputOptions {
  ignoreCase: boolean;
  replacement?: [string, string];
}

export async function sleep(timeInMs: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, timeInMs)
  })
}

export function waitForInputToHaveValue(inputSelector: string, value: string, options: WaitForInputOptions = { ignoreCase: true, replacement: ["", ""] }) {
  return async (): Promise<void> => {
    const inputElement: HTMLInputElement | null = document.querySelector(inputSelector)

    if (options.replacement?.length === 2) {
      if (!config) {
        const res = await fetch('/rest/admin/application-configuration')
        const json = await res.json()
        config = json.config
      }
      const propertyChain = options.replacement[1].split('.')
      let replacementValue: any = config

      for (const property of propertyChain) {
        // Έλεγχος για το undefined πριν την πρόσβαση στην ιδιότητα
        if (replacementValue !== undefined && replacementValue !== null) {
          replacementValue = replacementValue[property]
        } else {
          console.warn(`Replacement value for ${options.replacement[1]} is undefined at property "${property}".`)
          break
        }
      }

      // Αν το replacementValue δεν είναι undefined, προχωράμε στην αντικατάσταση
      if (replacementValue !== undefined) {
        value = value.replace(options.replacement[0], replacementValue)
      } else {
        console.warn(`Replacement value for ${options.replacement[0]} is undefined.`)
      }
    }

    while (true) {
      if (inputElement && options.ignoreCase && inputElement.value.toLowerCase() === value.toLowerCase()) {
        break
      } else if (inputElement && !options.ignoreCase && inputElement.value === value) {
        break
      }
      await sleep(100)
    }
  }
}

// Κλήσεις της συνάρτησης με την παράμετρο ignoreCase
resolved: waitForInputToHaveValue('#email', 'bender@juice-sh.op', { 
  replacement: ['juice-sh.op', 'application.domain'], 
  ignoreCase: true // Προσθέτουμε το ignoreCase
})

resolved: waitForInputToHaveValue('#email', "bender@juice-sh.op'--", { 
  replacement: ['juice-sh.op', 'application.domain'], 
  ignoreCase: true // Προσθέτουμε το ignoreCase
})

resolved: waitForInputToHaveValue('#email', 'jim@juice-sh.op', { 
  replacement: ['juice-sh.op', 'application.domain'], 
  ignoreCase: true // Προσθέτουμε το ignoreCase
})

resolved: waitForInputToHaveValue('#email', "jim@juice-sh.op'--", { 
  replacement: ['juice-sh.op', 'application.domain'], 
  ignoreCase: true // Προσθέτουμε το ignoreCase
})



export function waitForInputToNotHaveValue(inputSelector: string, value: string, options: { ignoreCase: boolean } = { ignoreCase: true }) {
  return async (): Promise<void> => {
    const inputElement: HTMLInputElement | null = document.querySelector(inputSelector)

    while (true) {
      if (inputElement && options.ignoreCase && inputElement.value.toLowerCase() !== value.toLowerCase()) {
        break
      } else if (inputElement && !options.ignoreCase && inputElement.value !== value) {
        break
      }
      await sleep(100)
    }
  }
}

export function waitForInputToNotHaveValueAndNotBeEmpty(inputSelector: string, value: string, options: { ignoreCase: boolean } = { ignoreCase: true }) {
  return async (): Promise<void> => {
    const inputElement: HTMLInputElement | null = document.querySelector(inputSelector)

    while (true) {
      if (inputElement && inputElement.value !== '') {
        if (options.ignoreCase && inputElement.value.toLowerCase() !== value.toLowerCase()) {
          break
        } else if (!options.ignoreCase && inputElement.value !== value) {
          break
        }
      }
      await sleep(100)
    }
  }
}

export function waitForInputToNotBeEmpty(inputSelector: string) {
  return async (): Promise<void> => {
    const inputElement: HTMLInputElement | null = document.querySelector(inputSelector)

    while (true) {
      if (inputElement && inputElement.value && inputElement.value !== '') {
        break
      }
      await sleep(100)
    }
  }
}

export function waitForElementToGetClicked(elementSelector: string) {
  return async (): Promise<void> => {
    const element: HTMLElement | null = document.querySelector(elementSelector)
    if (!element) {
      console.warn(`Could not find Element with selector "${elementSelector}"`)
    }

    await new Promise<void>((resolve) => {
      if (element) {
        element.addEventListener('click', () => { resolve() })
      }
    })
  }
}

export function waitForElementsInnerHtmlToBe(elementSelector: string, value: string) {
  return async (): Promise<void> => {
    while (true) {
      const element: HTMLElement | null = document.querySelector(elementSelector)

      if (element && element.innerHTML === value) {
        break
      }
      await sleep(100)
    }
  }
}

export function waitInMs(timeInMs: number) {
  return async (): Promise<void> => {
    if (!config) {
      const res = await fetch('/rest/admin/application-configuration')
      const json = await res.json()
      config = json.config
    }
    let delay = playbackDelays[config?.hackingInstructor?.hintPlaybackSpeed as keyof typeof playbackDelays] ?? 1.0
    await sleep(timeInMs * delay)
  }
}

export function waitForAngularRouteToBeVisited(route: string) {
  return async (): Promise<void> => {
    while (true) {
      if (window.location.hash.startsWith(`#/${route}`)) {
        break
      }
      await sleep(100)
    }
  }
}

export function waitForLogIn() {
  return async (): Promise<void> => {
    while (true) {
      if (localStorage.getItem('token') !== null) {
        break
      }
      await sleep(100)
    }
  }
}

export function waitForAdminLogIn() {
  return async (): Promise<void> => {
    while (true) {
      let role: string = ''
      try {
        const token: string = localStorage.getItem('token') || ''
        const decodedToken = jwtDecode(token)
        const payload = decodedToken as { data: { role: string } }
        role = payload.data.role
      } catch {
        console.log('Role from token could not be accessed.')
      }
      if (role === 'admin') {
        break
      }
      await sleep(100)
    }
  }
}

export function waitForLogOut() {
  return async (): Promise<void> => {
    while (true) {
      if (localStorage.getItem('token') === null) {
        break
      }
      await sleep(100)
    }
  }
}

export function waitForDevTools() {
  const initialInnerHeight = window.innerHeight
  const initialInnerWidth = window.innerWidth
  return async (): Promise<void> => {
    while (true) {
      if (window.innerHeight !== initialInnerHeight || window.innerWidth !== initialInnerWidth) {
        break
      }
      await sleep(100)
    }
  }
}

export function waitForSelectToHaveValue(selectSelector: string, value: string) {
  return async (): Promise<void> => {
    const selectElement: HTMLSelectElement | null = document.querySelector(selectSelector)

    while (true) {
      if (selectElement && selectElement.options[selectElement.selectedIndex].value === value) {
        break
      }
      await sleep(100)
    }
  }
}

export function waitForSelectToNotHaveValue(selectSelector: string, value: string) {
  return async (): Promise<void> => {
    const selectElement: HTMLSelectElement | null = document.querySelector(selectSelector)

    while (true) {
      if (selectElement && selectElement.options[selectElement.selectedIndex].value !== value) {
        break
      }
      await sleep(100)
    }
  }
}

export function waitForRightUriQueryParamPair(key: string, value: string) {
  return async (): Promise<void> => {
    while (true) {
      const encodedValue: string = encodeURIComponent(value).replace(/%3A/g, ':')
      const encodedKey: string = encodeURIComponent(key).replace(/%3A/g, ':')
      const expectedHash: string = `#/track-result/new?${encodedKey}=${encodedValue}`

      if (window.location.hash === expectedHash) {
        break
      }
      await sleep(100)
    }
  }
}
