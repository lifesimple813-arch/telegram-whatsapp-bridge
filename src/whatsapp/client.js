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
  webVersionCache: { type: "none" },
});

client.on("qr", async () => {
  let phone = process.env.WA_PHONE_NUMBER || "";
  phone = phone.replace(/[^0-9]/g, "");
  if (phone.startsWith("2180")) {
    phone = "218" + phone.slice(4);
  }
  if (phone && !pairingRequested) {
    pairingRequested = true;
    log.info(`Requesting pairing code for ${phone} in 8 seconds...`);
    setTimeout(async () => {
      try {
        const code = await client.requestPairingCode(phone, true);
        log.info("========================================");
        log.info(`YOUR WHATSAPP PAIRING CODE: ${code}`);
        log.info("========================================");
      } catch (err) {
        log.error(`Pairing code error: ${err.message || err}`);
        pairingRequested = false;
      }
    }, 8000);
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
