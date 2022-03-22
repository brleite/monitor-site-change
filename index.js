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
      console.log(`ARQUIVO SITE ATUALIZADO: ${p.arquivoSiteAtualizado}`);
      console.log(`ARQUIVO SITE ANTES DA ATUALIZAÇÃO: ${p.arquivoSiteAntesAtualizacao}`);

      await Promise.all([
        page.goto(p.url),
        page.waitForNavigation({ waitUntil: "networkidle0" }),
      ]);

      console.log("goto url");

      const elementoSeletor = await page.waitForSelector(p.seletor);
      console.log("Seletor localizado");

      let novoSite;
      if (p.verificarSomenteAreaSelecionada == true) {
        console.log("Verificando somente área selecionada");

        novoSite = await elementoSeletor.evaluate(domElement => {
          const novoSiteTmp = domElement.innerHTML;

          return novoSiteTmp;
        });
      } else {
        console.log("Verificando página inteira");

        novoSite = await page.content();
      }

      console.log("Novo Site obtido");
      // console.log(`Novo Site: ${novoSite}`);

      if (fs.existsSync(p.arquivoSiteAtualizado)) {
        const currentSite = fs.readFileSync(p.arquivoSiteAtualizado, 'utf8');

        console.log("Site atual obtido");
        // console.log(`Current Site: ${currentSite}`)

        if (novoSite && currentSite && currentSite != novoSite) {
          const msg = `Houve atualização no site ${p.url}`
          console.log(msg)
          utils.sendBotMessage(msg, p.bot_chatIds);
          fs.writeFileSync(p.arquivoSiteAtualizado, novoSite);
          fs.writeFileSync(p.arquivoSiteAntesAtualizacao, currentSite);
        } else {
          const msg = `Não Houve atualização no site ${p.url}`
          console.log(msg)
        }
      } else {
        console.log(`Arquivo inexistente: ${p.arquivoSiteAtualizado}. Criando um arquivo inicial.`)
        fs.writeFileSync(p.arquivoSiteAtualizado, novoSite);
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
