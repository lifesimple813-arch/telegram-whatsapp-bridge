import whatsappWeb from "whatsapp-web.js";
import http from "http";

const { Client, LocalAuth } = whatsappWeb;
import { config } from "../config.js";
import { sendAlert } from "../telegram/alert.js";
import log from "../logger.js";

let ready = false;
let reauthAlerted = false;

http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot is running!");
}).listen(process.env.PORT || 3000);

const puppeteerConfig = {
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  ...(config.puppeteerExecutablePath && {
    executablePath: config.puppeteerExecutablePath,
  }),
};

const authPath = config.dataDir ? `${config.dataDir}/wwebjs_auth` : "./wwebjs_auth";

export const client = new Client({
  authStrategy: new LocalAuth({ dataPath: authPath }),
  puppeteer: puppeteerConfig,
  ...(process.env.WA_PHONE_NUMBER && {
    pairWithPhoneNumber: {
      phoneNumber: process.env.WA_PHONE_NUMBER,
      showNotification: true,
    },
  }),
});

client.on("code", (code) => {
  log.info("========================================");
  log.info(`YOUR WHATSAPP PAIRING CODE: ${code}`);
  log.info("========================================");
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
export function isReady() {
  return ready;
}
