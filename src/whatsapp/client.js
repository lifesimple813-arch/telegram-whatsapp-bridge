import whatsappWeb from "whatsapp-web.js";
import http from "http";

const { Client, LocalAuth } = whatsappWeb;
import { config } from "../config.js";
import { sendAlert } from "../telegram/alert.js";
import log from "../logger.js";

let ready = false;
let reauthAlerted = false;
let pairingRequested = false;

http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot is running!");
}).listen(process.env.PORT || 3000);

const puppeteerConfig = {
  headless: true,
  timeout: 120000,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  ...(config.puppeteerExecutablePath && {
    executablePath: config.puppeteerExecutablePath,
  }),
};

const authPath = config.dataDir ? `${config.dataDir}/wwebjs_auth` : "./wwebjs_auth";

export const client = new Client({
  authStrategy: new LocalAuth({ dataPath: authPath }),
  puppeteer: puppeteerConfig,
});

client.on("qr", async () => {
  const phone = process.env.WA_PHONE_NUMBER;
  if (phone && !pairingRequested) {
    pairingRequested = true;
    log.info("Waiting 15 seconds for WhatsApp Web to fully load...");
    setTimeout(async () => {
      try {
        const cleanPhone = phone.replace(/[^0-9]/g, "");
        const code = await client.requestPairingCode(cleanPhone);
        log.info("========================================");
        log.info(`YOUR WHATSAPP PAIRING CODE: ${code}`);
        log.info("========================================");
      } catch (err) {
        log.error(`Pairing code error: ${err.message}`);
        pairingRequested = false;
      }
    }, 15000);
  }
});

client.on("ready", () => {
  ready = true;
  log.info("WhatsApp client is ready!");
});

client.on("authenticated", () => {
  log.info("WhatsApp authenticated!");
});

client.on("auth_failure", async (msg) => {
  log.error(`Auth failure: ${msg}`);
  if (!reauthAlerted) {
    reauthAlerted = true;
    await sendAlert("WhatsApp authentication failed!");
  }
});

export async function initialize() {
  await client.initialize();
}

export async function destroy() {
  await client.destroy();
}

export function isReady() {
  return ready;
}
