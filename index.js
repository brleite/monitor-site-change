const puppeteer = require("puppeteer");
const config = require("./config.json");
const utils = require("./utils/utils");
const fs = require('fs');
const diff_match_patch = require('diff-match-patch');
const jsdiff = require('./utils/jsdiff');

(async () => {
  const browser = await puppeteer.launch({
    // executablePath: "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    slowMo: 50, // slow down by ms
    // devtools: true,
  });
  const page = await browser.newPage();

  page.setDefaultNavigationTimeout(300000);

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
      console.log(`ARQUIVO SITE ALTERAÇÕES: ${p.arquivoSiteAlteracoes}`);
      console.log(`ARQUIVO SITE ALTERAÇÔES SCREENSHOT: ${p.arquivoSiteAlteracoesScreenshot}`);

      // await page.exposeFunction("getConfig", () => p);

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

      var beautify_html = require('js-beautify').html;
      novoSite = beautify_html(novoSite, { indent_size: 2 })

      console.log("Novo Site obtido");
      // console.log(`Novo Site: ${novoSite}`);

      if (fs.existsSync(p.arquivoSiteAtualizado)) {
        const currentSite = fs.readFileSync(p.arquivoSiteAtualizado, 'utf8');

        console.log("Site atual obtido");
        // console.log(`Current Site: ${currentSite}`)

        if (novoSite && currentSite && currentSite != novoSite) {
          const msg = `Houve atualização no site ${p.url}`
          console.log(msg)

          /* const diff = new diff_match_patch.diff_match_patch();
          const diffs = diff.diff_main(currentSite, novoSite);
          diff.diff_cleanupSemantic(diffs)
          const alteracoes = diff.diff_prettyHtml(diffs); */
          const alteracoes = jsdiff.diffString(currentSite, novoSite);

          // console.log(alteracoes);

          // await page.exposeFunction("getAlteracoes", () => alteracoes);
          // console.log(jsdiff.diffString(currentSite, novoSite));
          // console.log(jsdiff);

          if (config.notify) {
            utils.sendBotMessage(msg, p.bot_chatIds);
          }

          fs.writeFileSync(p.arquivoSiteAtualizado, novoSite);
          fs.writeFileSync(p.arquivoSiteAntesAtualizacao, currentSite);

          /* if (p.verificarSomenteAreaSelecionada == true) {
            await page.evaluate(async () => {
              let dom = document.querySelector((await getConfig()).seletor);
              dom.innerHTML = await getAlteracoes();
            });
          } else {

          } */
          if (p.verificarSomenteAreaSelecionada == true) {
            await page.evaluate(async ([seletor, newInnerHTML]) => {
              let dom = document.querySelector(seletor);
              dom.innerHTML = newInnerHTML;
            }, [p.seletor, alteracoes]);
          } else {
            await page.setContent(alteracoes)
          }

          await page.screenshot({
            path: p.arquivoSiteAlteracoesScreenshot,
            fullPage: true,
            type: "jpeg",
            quality: 100
          });

          siteAlteracoes = await page.content();
          fs.writeFileSync(p.arquivoSiteAlteracoes, siteAlteracoes);

          if (config.notify && p.arquivoSiteAlteracoes) {
            utils.sendBotDocument(p.arquivoSiteAlteracoes, "HTML com as alterações", p.bot_chatIds);
          }

          if (config.notify && p.arquivoSiteAlteracoesScreenshot) {
            utils.sendBotImage(p.arquivoSiteAlteracoesScreenshot, "Alterações", p.bot_chatIds);
          }

          // fs.writeFileSync(p.arquivoSiteAlteracoes, alteracoes);
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
