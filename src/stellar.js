// stellar.js

// Stellar SDK import kar rahe hain
import * as StellarSdk from "stellar-sdk";

// Testnet ka Horizon server connect kar rahe hain
const horizonURL = "https://horizon-testnet.stellar.org";

// Server object create kiya
const server = new StellarSdk.Horizon.Server(horizonURL);

// Test network passphrase store kiya
const networkPassphrase = StellarSdk.Networks.TESTNET;

// Export kar rahe hain taaki dusri files me use kar saken
export { server, networkPassphrase };