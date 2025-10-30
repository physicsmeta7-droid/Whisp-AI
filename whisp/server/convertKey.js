import bs58 from "bs58";
import fs from "fs";

// your Phantom private key (base58 string)
const privateKeyString = "5TddKHENPtRH8TkosHYipVF7532Pw79PQkBpXFoC1gSzbFPMMQ8nAUMzvSoAHu2T3PwJYQbDFgDmkqezr1oSZLgG";

// decode it to bytes
const decoded = bs58.decode(privateKeyString);

// save as numeric array for Solana CLI
fs.writeFileSync("keys/whisp_cli.json", JSON.stringify(Array.from(decoded)));

console.log("✅ Saved Solana CLI-compatible key to keys/whisp_cli.json");
