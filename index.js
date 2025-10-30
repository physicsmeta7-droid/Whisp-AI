import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { OpenAI } from 'openai';
import {
  Connection,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(express.json());

const RPC = process.env.SOLANA_RPC || 'https://api.devnet.solana.com';
const connection = new Connection(RPC, 'confirmed');
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

// Load Whisp’s keypair
const secret = JSON.parse(fs.readFileSync('./keys/whisp.json', 'utf-8'));
const whisp = Keypair.fromSecretKey(new Uint8Array(secret));
console.log('🪶 Whisp wallet:', whisp.publicKey.toBase58());

// OpenAI setup
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// helper to send memo tx
async function sendMemo(fromKeypair, text) {
  const ix = new TransactionInstruction({
    keys: [],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(text, 'utf8'),
  });
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  const tx = new Transaction({ blockhash, lastValidBlockHeight, feePayer: fromKeypair.publicKey }).add(ix);
  const sig = await sendAndConfirmTransaction(connection, tx, [fromKeypair]);
  return sig;
}

// POST /reply -> AI generates + posts reply memo
app.post('/reply', async (req, res) => {
  try {
    const { userMessage, userPubkey } = req.body;
    if (!userMessage || !userPubkey) return res.status(400).json({ error: 'Missing fields' });

    const prompt = `You are Whisp, an empathetic AI that whispers through the Solana blockchain.
User (${userPubkey}) said: "${userMessage}"
Reply in under 150 characters, warm and thoughtful.`;

    const chat = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
    });

    const reply = chat.choices[0].message.content.trim();
    const memoText = `WHISP|to:${userPubkey}|${reply}`;
    const sig = await sendMemo(whisp, memoText);

    return res.json({ reply, signature: sig });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`🚀 Whisp backend running on port ${PORT}`));
