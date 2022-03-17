const puppeteer = require("puppeteer");
const config = require("./config.json");
const utils = require("./utils/utils");
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    // executablePath: "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    slowMo: 50, // slow down by ms
    // devtools: true,
  });
  const page = await browser.newPage();

  // Mostra console para o evaluate
  page.on("console", (consoleObj) => {
    if (consoleObj.type() === "log") {
      console.log(consoleObj.text());
    }
  });

  const urls = config.urls;

  console.log("Iniciando chamadas");

  try {
    for (let p of urls) {
    // urls.forEach(async p => {
      console.log(`URL: ${p.url}`);
      console.log(`SELETOR: ${p.seletor}`);
      console.log(`ARQUIVO SITE: ${p.arquivoSite}`);

      await Promise.all([
        page.goto(p.url),
        page.waitForNavigation({ waitUntil: "networkidle0" }),
      ]);

      console.log("goto url");

      const elementoSeletor = await page.waitForSelector(p.seletor);

      console.log("Seletor localizado");

      const novoSite = await page.content();

      console.log("Novo Site obtido");
      // console.log(`Novo Site: ${novoSite}`);

      const currentSite = fs.readFileSync(p.arquivoSite, 'utf8');

      console.log("Site atual obtido");
      // console.log(`Current Site: ${currentSite}`)

      if (novoSite && currentSite && currentSite != novoSite) {
        const msg = `Houve atualização no site ${p.url}`
        console.log(msg)
        utils.sendBotMessage(msg, p.bot_chatIds);
        fs.writeFileSync(p.arquivoSite, novoSite);
      } else {
        const msg = `Não Houve atualização no site ${p.url}`
        console.log(msg)
      }
    }
    //);

    setTimeout(async () => {
      await browser.close();

      console.log("Fim");
    }, 2000);
  } catch (e) {
    console.log(e);
    await browser.close();
  }
})();
