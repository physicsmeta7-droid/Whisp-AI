// ------------------------------------------------------------
// Whisp backend – funny crypto replies every 15s (clean version)
// ------------------------------------------------------------
import "dotenv/config";
import express from "express";
import cors from "cors";
import {
  Connection,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import fs from "fs";
import bs58 from "bs58";

// ---- Express setup ----
const app = express();
app.use(cors());
app.use(express.json());

// ---- Solana setup ----
const RPC = process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";
const connection = new Connection(RPC, "confirmed");
const MEMO_PROGRAM = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

// ---- Load Whisp wallet ----
function loadKeypair(path = "./keys/whisp.json") {
  const raw = fs.readFileSync(path, "utf8").trim();
  const parsed = JSON.parse(raw);
  let secret;
  if (Array.isArray(parsed)) secret = Uint8Array.from(parsed);
  else if (typeof parsed === "string") secret = bs58.decode(parsed);
  else throw new Error("❌ Invalid key format in whisp.json.");
  return Keypair.fromSecretKey(secret);
}

const whisp = loadKeypair("./keys/whisp.json");
console.log("🪶 Whisp wallet loaded!");
console.log("Public key:", whisp.publicKey.toBase58());

// ---- Token CA ----
const TOKEN_CA = process.env.TOKEN_CA || "";
if (!TOKEN_CA) console.warn("⚠️  No TOKEN_CA set in .env");
else console.log(`🔍 Watching token: ${TOKEN_CA}`);

// ---- Message generator ----
const baseMessages = [
  "You absolute maniac buying the green candle again.",
  "Market dumps and you ape in? Respect.",
  "Just another day, another rug survived.",
  "Bro really said full send on red candles.",
  "Trading is pain, but memes are forever.",
  "Bagholders unite, therapy starts now.",
  "Chart looks like my GPA, still buying though.",
  "You call that a dip? I call it an invitation.",
  "Rug or rocket, no in-between today.",
  "Stop refreshing Solscan, it won’t moon faster.",
  "My bags are heavier than your regrets.",
  "Whales moving, apes sweating.",
  "You buy tops like it’s a hobby.",
  "Degens don’t cry, they double down.",
  "Pump harder, I can still hear the bears.",
  "Who needs TA when you have vibes?",
  "You’re not early, you’re just stubborn.",
  "If hope was collateral, you’d be rich.",
  "WAGMI, eventually, maybe, copium engaged.",
  "The block confirmed before your regret kicked in.",
  "You can’t rug what’s already carpet.",
  "Brave move, or desperate coping—hard to tell.",
  "Momentum died but you keep buying the corpse.",
  "Wallet empty, heart full.",
  "It’s not gambling if it’s decentralised, right?",
  "Another hero joins the bagholder hall of fame.",
  "Buying dips so deep you found Atlantis.",
  "Keep coping, that’s free alpha.",
  "TA said sell, your heart said marry the bag.",
  "Dollar-cost averaging your emotions again?",
  "Still not financial advice—but hilarious nonetheless.",
];
const slang = [
  "degen",
  "bagholder",
  "whale",
  "ape",
  "bull",
  "bear",
  "newbie",
  "sniper",
  "scalper",
  "hodler",
  "copium addict",
  "rug survivor",
];
const adjectives = [
  "reckless",
  "heroic",
  "tragic",
  "chaotic",
  "unhinged",
  "sleep-deprived",
  "bullish",
  "hopeless",
  "over-leveraged",
  "delusional",
  "legendary",
  "mysterious",
];

let lastMessage = "";

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeMessage() {
  let base = randomFrom(baseMessages);
  const adj = randomFrom(adjectives);
  const slangWord = randomFrom(slang);
  let msg = `Whisp : ${base.replace(/\.$/, "")}, you ${adj} ${slangWord}.`;
  if (msg === lastMessage) return makeMessage();
  lastMessage = msg;
  return msg;
}

// ---- Memo sender ----
async function sendMemoOnchain(text) {
  try {
    const ix = new TransactionInstruction({
      keys: [],
      programId: MEMO_PROGRAM,
      data: Buffer.from(text.slice(0, 200), "utf8"),
    });
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    const tx = new Transaction({
      blockhash,
      lastValidBlockHeight,
      feePayer: whisp.publicKey,
    }).add(ix);
    const sig = await sendAndConfirmTransaction(connection, tx, [whisp]);
    console.log("📝 Sent memo:", sig);
  } catch (err) {
    console.error("❌ Memo send error:", err.message);
  }
}

// ---- Watcher (every 15 seconds) ----
let lastSeen = null;
async function watchTransactions() {
  if (!TOKEN_CA) return;
  try {
    const sigs = await connection.getSignaturesForAddress(new PublicKey(TOKEN_CA), { limit: 5 });
    const latest = sigs[0]?.signature;
    if (!latest || latest === lastSeen) return;
    lastSeen = latest;

    const msg = makeMessage();
    console.log("💬", msg);
    await sendMemoOnchain(msg);
  } catch (err) {
    console.error("Watcher error:", err.message);
  }
}

// Run every 15 seconds
setInterval(watchTransactions, 15_000);

// ---- Manual trigger ----
app.post("/reply", async (req, res) => {
  const msg = makeMessage();
  await sendMemoOnchain(msg);
  res.json({ reply: msg });
});

// ---- Start server ----
const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`🚀 Whisp watcher running every 15s on port ${PORT}`));
