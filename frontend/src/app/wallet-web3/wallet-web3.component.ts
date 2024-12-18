import { Component, ChangeDetectorRef } from '@angular/core'
import { KeysService } from '../Services/keys.service'
import { SnackBarHelperService } from '../Services/snack-bar-helper.service'
import { web3WalletABI } from '../../assets/public/ContractABIs'
import { ethers } from 'ethers'
import { Web3Service } from '../Services/web3.service'

const BankAddress = '0x413744D59d31AFDC2889aeE602636177805Bd7b0'

@Component({
  selector: 'app-wallet-web3',
  templateUrl: './wallet-web3.component.html',
  styleUrls: ['./wallet-web3.component.scss']
})
export class WalletWeb3Component {
  constructor (
    private readonly keysService: KeysService,
    private readonly snackBarHelperService: SnackBarHelperService,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly web3Service: Web3Service // Εισαγωγή της υπηρεσίας
  ) {}

  userData: object
  session = false
  walletBalance = '0'
  myBEEBalance = 0
  inputAmount: number = 0
  successResponse = false
  mintButtonDisabled = true
  challengeSolved = false
  errorMessage = ''
  metamaskAddress = ''

  ngOnInit (): void {
    this.handleAuth()
    if (window.ethereum) {
      if (window.ethereum && typeof window.ethereum.on === 'function') {
        window.ethereum.on('chainChanged', this.handleChainChanged.bind(this))
      }
    }
  }

  async handleChainChanged (chainId: string) {
    await this.handleAuth()
  }

  async depositETH () {
    try {
      const transaction = await this.web3Service.depositETH(this.inputAmount, BankAddress)
      this.getUserEthBalance()
    } catch (error) {
      this.errorMessage = error.message
    }
  }

  async withdrawETH () {
    try {
      const transaction = await this.web3Service.withdrawETH(this.inputAmount, BankAddress)
      this.getUserEthBalance()
    } catch (error) {
      this.errorMessage = error.message
    }
  }

  async getUserEthBalance () {
    try {
      const userBalance = await this.web3Service.getUserEthBalance(this.metamaskAddress, BankAddress)
      this.walletBalance = ethers.utils.formatEther(userBalance)
    } catch (error) {
      this.errorMessage = error.message
    }
  }

  async handleAuth () {
    try {
      const { isConnected } = this.web3Service.getAccountStatus()

      if (isConnected) {
        // await this.web3Service.disconnectWallet()
      }
      if (!window.ethereum) {
        this.snackBarHelperService.open('PLEASE_INSTALL_WEB3_WALLET', 'errorBar')
        return
      }

      const provider = await this.web3Service.connectWallet()
      this.metamaskAddress = provider.account
      this.keysService.walletAddressSend(this.metamaskAddress).subscribe(
        (response) => {
          if (response.success) {
            this.successResponse = response.status
            this.mintButtonDisabled = true
          }
        },
        (error) => {
          console.error(error)
        }
      )
      this.userData = {
        address: provider.account,
        chain: provider.chain.id,
        network: 'evm'
      }
      // await this.web3Service.addEthereumChain()
      const targetChainId = '11155111'
      const currentChainId = String(provider.chain?.id)

      if (provider && currentChainId !== targetChainId) {
        this.session = false
        this.snackBarHelperService.open('PLEASE_CONNECT_TO_SEPOLIA_NETWORK', 'errorBar')
      } else {
        this.session = true
        this.getUserEthBalance()
      }
      this.changeDetectorRef.detectChanges()
    } catch (err) {
      console.log(err)
    }
  }
}
