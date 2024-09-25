import { useState } from 'react'
import './App.css'

import { BrowserProvider, Signer, type TypedDataDomain } from 'ethers';
import { MetaMaskInpageProvider } from "@metamask/providers";
import { createJWT, decodeJWT, verifyJWT, AddSigningAlgorithm, AddVerifierAlgorithm } from 'did-jwt';
import {Resolver} from 'did-resolver'
import {getResolver} from 'ethr-did-resolver'
import {
    ethTypedDataSigner,
    EthTypedDataSignerAlgorithm,
    verifyEthTypedDataSignature,
    validSignatures,
} from 'did-jwt-eth-typed-data-signature'

import { EthrDID } from 'ethr-did'
import { Issuer, JwtCredentialPayload, createVerifiableCredentialJwt, verifyCredential } from 'did-jwt-vc'
import { JwtPresentationPayload, createVerifiablePresentationJwt, verifyPresentation } from 'did-jwt-vc'

declare global {
  interface Window{
    ethereum?:MetaMaskInpageProvider
  }
}
function App() {

  const [accounts, setAccounts] = useState<string[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [jwt, setJwt] = useState('')
  const [decodedJwt, setDecodedJwt] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [signer, setSigner] = useState<Signer | null>(null)
  const [vcJwt, setVcJwt] = useState('')
  const [verificationResponse, setVerificationResponse] = useState('')
  const [decodedVcJwt, setDecodedVcJwt] = useState('')
  const [validationState, setValidationState] = useState('')
  const providerConfig = {
    networks: [
      {
        name: 'sepolia',
        type: 'testnet',
        currency: 'ETH',
        explorerUrl: 'https://sepolia.etherscan.io',
        rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
        registry: '0x03d5003bf0e79c5f5223588f347eba39afbc3818',
      },
    ],
  }
  const domain: TypedDataDomain = {
    name: 'Verifiable Credential',
    version: '1',
    chainId: 11155111, // Sepolia testnet
  };

  async function connectToMetaMask() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            setAccounts(accounts as string[]);
            const provider = new BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            setSigner(signer);
            const address = await signer.getAddress();
            setWalletAddress("Wallet: " + address);
            console.log('Connected to MetaMask');
        } catch (error) {
            console.error('Failed to connect to MetaMask:', error);
        }
    } else {
        console.log('MetaMask is not installed');
    }
  }

  async function handleAccountSelection(account: string) {
    setSelectedAccount(account);
    const provider = new BrowserProvider(window.ethereum!);
    const signer = await provider.getSigner(account);
    setSigner(signer);
  }

  async function signJWT() {
    if (!signer) {
        console.error('Not connected to MetaMask');
        return;
    }
    const jwtSigner = ethTypedDataSigner(signer, domain);

    try {
        const newJwt = await createJWT(
            { sub: `did:ethr:sepolia:${await signer.getAddress()}`, name: 'Bob Smith', domain },
            { issuer: `did:ethr:sepolia:${await signer.getAddress()}`, signer: jwtSigner },
            { alg: 'EthTypedDataSignature' }
          )
        setJwt(newJwt);
        setDecodedJwt(JSON.stringify(decodeJWT(newJwt), null, 4));
        const resultElement = document.getElementById('result');
        if (resultElement) resultElement.textContent = `JWT: ${newJwt}`;
    } catch (error) {
        console.error('Error signing JWT:', error);
    }
}

async function resolveDID() {
  if (!signer) {
      console.error('Not connected to MetaMask');
      return;
  }

  const ethrDidResolver = getResolver(providerConfig);
  const resolver = new Resolver(ethrDidResolver);
  
  const verificationResponseVar = await verifyJWT(jwt, {
      resolver,
      audience: 'did:ethr:0xf3beac30c498d9e26865f34fcaa57dbb935b0d74'
    });
  console.log(verificationResponseVar);
  setVerificationResponse(JSON.stringify(verificationResponseVar, null, 4));
}

async function prepareVCCreation() {
  if (!signer) {
    console.error('Not connected to MetaMask');
    return;
  } 
  const jwtSigner = ethTypedDataSigner(signer, domain);
  const issuer = new EthrDID({
    chainNameOrId: 'sepolia',
    identifier: await signer.getAddress(),
    alg: "EthTypedDataSignature",
    signer: jwtSigner
  }) as Issuer

  const vcPayload: JwtCredentialPayload = {
    sub: 'did:ethr:sepolia:0x435df3eda57154cf8cf7926079881f2912f54db4',
    nbf: 1562950282,
    vc: {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential'],
      credentialSubject: {
        degree: {
          type: 'BachelorDegree',
          name: 'Baccalauréat en musiques numériques'
        }
      },
    },
    domain
  }
  const vc = await createVerifiableCredentialJwt(vcPayload, issuer)
  setVcJwt(vc)
  setDecodedVcJwt(JSON.stringify(decodeJWT(vc), null, 4))
  console.log(vcJwt)

}

async function verifyVC() {
  const ethrDidResolver = getResolver(providerConfig);
  const resolver = new Resolver(ethrDidResolver);
  const verifiedVC = await verifyCredential(vcJwt, resolver)
  console.log(verifiedVC)
  setValidationState(JSON.stringify(verifiedVC, null, 4))
}

async function createVP() {
  if (!signer) {
    console.error('Not connected to MetaMask');
    return;
  }
  
  const jwtSigner = ethTypedDataSigner(signer, domain);
  const issuer = new EthrDID({
    chainNameOrId: 'sepolia',
    identifier: await signer.getAddress(),
    alg: "EthTypedDataSignature",
    signer: jwtSigner
  }) as Issuer
  const vpPayload: JwtPresentationPayload = {
    vp: {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiablePresentation'],
      verifiableCredential: [vcJwt]
    },
    domain
  }
  const vpJwt = await createVerifiablePresentationJwt(vpPayload, issuer)

  const ethrDidResolver = getResolver(providerConfig);
  const resolver = new Resolver(ethrDidResolver);

  const verifiedVP = await verifyPresentation(vpJwt, resolver)
  console.log(verifiedVP)
}

AddSigningAlgorithm('EthTypedDataSignature', EthTypedDataSignerAlgorithm())
AddVerifierAlgorithm('EthTypedDataSignature', verifyEthTypedDataSignature, validSignatures)

return (
  <>
    <button onClick={connectToMetaMask}>Connect to MetaMask</button>
    <div style={{ marginBottom: '20px' }}></div>
    {accounts.length > 0 && (
      <div>
        <h3>Select an account:</h3>
        {accounts.map((account) => (
          <div key={account}>
            <input
              type="radio"
              id={account}
              name="account"
              value={account}
              checked={selectedAccount === account}
              onChange={() => handleAccountSelection(account)}
            />
            <label htmlFor={account}>{account}</label>
          </div>
        ))}
      </div>
    )}
    <div style={{ marginBottom: '20px' }}></div>
    {selectedAccount && (
      <>
        <p>Selected Account: {selectedAccount}</p>
        <button onClick={signJWT}>Sign JWT</button>
        <div style={{ marginBottom: '20px' }}></div>
        <text id="result">{jwt + decodedJwt}</text>
        <div style={{ marginBottom: '20px' }}></div>
        <button onClick={resolveDID}>Resolve DID</button>
        <div style={{ marginBottom: '20px' }}></div>
        <text>{verificationResponse}</text>
        <div style={{ marginBottom: '20px' }}></div>
        <button onClick={prepareVCCreation}>VC Creation</button>
        <text>{vcJwt}</text>
        <div style={{ marginBottom: '20px' }}></div>
        <text>{decodedVcJwt}</text>
        <div style={{ marginBottom: '20px' }}></div>
        <button onClick={verifyVC}>Validate VC</button>
        <div style={{ marginBottom: '20px' }}></div>
        <text>{validationState}</text>
        <div style={{ marginBottom: '20px' }}></div>
        <button onClick={createVP}>VP Creation</button>
      </>
    )}
  </>
)
}

export default App