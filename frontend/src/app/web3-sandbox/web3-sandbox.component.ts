import { Component, ChangeDetectorRef } from '@angular/core'

declare global {
  interface Window {
    ethereum: any
  }
}
import { ethers } from 'ethers'
import { KeysService } from '../Services/keys.service'
import { SnackBarHelperService } from '../Services/snack-bar-helper.service'
import { Web3Service } from '../Services/web3.service'  // Εισαγωγή του Web3Service
import { solidityCompiler, compilerReleases } from 'solidity-browser-compiler'

@Component({
  selector: 'app-web3-sandbox',
  templateUrl: './web3-sandbox.component.html',
  styleUrls: ['./web3-sandbox.component.scss']
})
export class Web3SandboxComponent {
  constructor (
    private readonly keysService: KeysService,
    private readonly snackBarHelperService: SnackBarHelperService,
    private readonly web3Service: Web3Service,  // Εισαγωγή του Web3Service
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit (): void {
    this.handleAuth()
    if (window.ethereum) {
      if (window.ethereum && window.ethereum.on) {
        window.ethereum.on('chainChanged', this.handleChainChanged.bind(this))
      }
    }
  }

  userData: object
  session = false
  metamaskAddress = ''
  selectedContractName: string
  compiledContracts: { [key: string]: any } = {}
  deployedContractAddress = ''
  contractNames: string[] = []
  commonGweiValue: number = 0
  contractFunctions: Array<{ name: string; inputValues: string; inputs: { type: string }[]; outputs: any[]; stateMutability: string; outputValue: string; inputHints: string }> = []
  invokeOutput = ''
  selectedCompilerVersion: string = '0.8.21'
  compilerVersions: string[] = Object.keys(compilerReleases)
  compilerErrors: any[] = []

  code: string = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.14;

contract HelloWorld {
    function get()public pure returns (string memory){
        return 'Hello Contracts';
    }
}`

  editorOptions = {
    mode: 'text/x-solidity',
    theme: 'dracula',
    lineNumbers: true,
    lineWrapping: true
  }

  async compileAndFetchContracts (code: string) {
    try {
      this.deployedContractAddress = ''
      const selectedVersion = compilerReleases[this.selectedCompilerVersion] as string

      if (!selectedVersion) {
        console.error('Selected compiler version not found.')
        return
      }

      const compilerInput = {
        version: `https://binaries.soliditylang.org/bin/${selectedVersion}`,
        contractBody: code
      }
      const output = await solidityCompiler(compilerInput)
      if (output.errors && output.errors.length > 0 && !output.contracts) {
        this.compiledContracts = []
        console.log(output.errors)
        this.compilerErrors.push(...output.errors)
      } else {
        this.compilerErrors = []
        console.log('output', output)
        this.compiledContracts = output.contracts.Compiled_Contracts
        this.contractNames = Object.keys(this.compiledContracts)
        this.selectedContractName = this.contractNames[0]
      }
    } catch (error) {
      console.error('Error compiling contracts:', error)
    }
  }

  async deploySelectedContract () {
    if (!this.session) {
      this.snackBarHelperService.open('PLEASE_CONNECT_WEB3_WALLET', 'errorBar')
      return
    }
    try {
      const selectedContractName = this.selectedContractName
      const selectedContract = this.compiledContracts[selectedContractName]

      if (!selectedContract) {
        console.error('Selected contract not found.')
        return
      }

      if (!window.ethereum) {
        throw new Error('Ethereum provider is not available')
      }
      const provider = new ethers.providers.Web3Provider(window.ethereum as any)
      const signer = provider.getSigner()

      const contractBytecode = selectedContract.evm.bytecode.object
      const contractAbi = selectedContract.abi

      const factory = new ethers.ContractFactory(
        contractAbi,
        contractBytecode,
        signer
      )
      const transactionOptions: ethers.PayableOverrides = {}
      if (this.commonGweiValue > 0) {
        transactionOptions.value = ethers.utils.parseUnits(
          this.commonGweiValue.toString(),
          'gwei'
        )
      }
      const contract = await factory.deploy(transactionOptions)
      await contract.deployed()
      this.deployedContractAddress = contract.address

      this.contractFunctions = contractAbi
        .filter((item) => item.type === 'function')
        .map((func) => {
          const inputHints =
            func.inputs.length > 0
              ? this.getInputHints(func.inputs)
              : 'No inputs'
          return {
            ...func,
            inputValues: '',
            outputValue: '',
            inputHints
          }
        })

      console.log(this.contractFunctions)
    } catch (error) {
      console.error('Error deploying contract:', error)
    }
  }

  getInputHints (inputs: Array<{ name: string, type: string }>): string {
    return inputs.map((input) => `${input.name}: ${input.type}`).join(', ')
  }

  parseInputValue (value: string, type: string) {
    if (type === 'bool') {
      return value.toLowerCase() === 'true'
    } else {
      return value
    }
  }

  async invokeFunction (func: { name: string, inputValues: string, inputs: Array<{ type: string }>, outputs: any[], stateMutability: string, outputValue: string, inputHints: string }) {
    if (!this.session) {
      this.snackBarHelperService.open('PLEASE_CONNECT_WEB3_WALLET', 'errorBar')
      return
    }
    try {
      const selectedContract =
        this.compiledContracts[this.selectedContractName]

      if (!window.ethereum) {
        throw new Error('Ethereum provider is not available')
      }
      const provider = new ethers.providers.Web3Provider(window.ethereum as any)
      const signer = provider.getSigner()
      const contract = new ethers.Contract(
        this.deployedContractAddress,
        selectedContract.abi,
        signer
      )

      const inputs =
        func.inputValues.trim() !== ''
          ? func.inputValues.split(',').map((value, index) => {
            const inputType = func.inputs[index].type
            return this.parseInputValue(value.trim(), inputType)
          })
          : []
      const transactionOptions: ethers.PayableOverrides = {}
      if (this.commonGweiValue > 0) {
        transactionOptions.value = ethers.utils.parseUnits(
          this.commonGweiValue.toString(),
          'gwei'
        )
      }
      const transaction = await contract.functions[func.name](
        ...inputs,
        transactionOptions
      )
      console.log(transaction)

      if (
        func.outputs.length > 0 &&
        (func.stateMutability === 'view' || func.stateMutability === 'pure')
      ) {
        const outputValue = transaction[0].toString()
        const foundFunc = this.contractFunctions.find(
          (f: { name: string }) => f.name === func.name
        )
        const updatedFunc = foundFunc ? { ...foundFunc, outputValue } : null
        if (updatedFunc) {
          updatedFunc.outputValue = outputValue
          const index = this.contractFunctions.indexOf(func)
          if (index !== -1) {
            this.contractFunctions[index] = updatedFunc
          }
        }
      }
      console.log('Invoked:', transaction)
    } catch (error) {
      console.error('Error invoking function', error)
      const updatedFunc = this.contractFunctions.find(
        (f) => f.name === func.name
      )
      if (updatedFunc) {
        updatedFunc.outputValue = error.message
        const index = this.contractFunctions.indexOf(func)
        if (index !== -1) {
          this.contractFunctions[index] = updatedFunc
        }
      }
    }
  }

  async handleChainChanged (chainId: string) {
    await this.handleAuth()
  }

  async handleAuth () {
    try {
      const isConnected = await this.web3Service.isConnected()  // Χρήση του Web3Service για σύνδεση

      if (isConnected) {
        // await this.web3Service.disconnect()
      }
      if (!window.ethereum) {
        this.snackBarHelperService.open('PLEASE_INSTALL_WEB3_WALLET', 'errorBar')
        return
      }

      const provider = await this.web3Service.connect()  // Χρήση του Web3Service για σύνδεση
      this.metamaskAddress = provider.account
      this.userData = {
        address: provider.account,
        chain: provider.chain.id,
        network: 'evm'
      }

      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: '0xaa36a7',
            chainName: 'Sepolia Test Network',
            nativeCurrency: {
              name: 'SepoliaETH',
              symbol: 'ETH',
              decimals: 18
            },
            rpcUrls: ['https://ethereum-sepolia.blockpi.network/v1/rpc/public'],
            blockExplorerUrls: ['https://sepolia.etherscan.io/']
          }
        ]
      })

      const targetChainId = '11155111'
      const currentChainId = String(provider.chain?.id)

      if (provider && currentChainId !== targetChainId) {
        this.session = false
        this.snackBarHelperService.open('PLEASE_CONNECT_TO_SEPOLIA_NETWORK', 'errorBar')
      } else {
        this.session = true
      }
      this.changeDetectorRef.detectChanges()
    } catch (err) {
      console.log('An error occured')
    }
  }
}
