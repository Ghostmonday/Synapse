import { Wallet } from "ethers";

const w = Wallet.createRandom();

console.log("Address:", w.address);
console.log("Private Key (DO NOT COMMIT):", w.privateKey);

