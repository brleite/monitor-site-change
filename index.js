const puppeteer = require("puppeteer");
const config = require("./config.json");
const utils = require("./utils/utils");
const fs = require('fs');
const diff_match_patch = require('diff-match-patch');
const jsdiff = require('./utils/jsdiff');
const diff = require('node-htmldiff');

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
      utils.log(consoleObj.text());
    }
  });

  const urls = config.urls;

  utils.log("Iniciando chamadas");

  try {
    for (let p of urls) {
    // urls.forEach(async p => {
      utils.log(`URL: ${p.url}`);
      utils.log(`SELETOR: ${p.seletor}`);
      utils.log(`ARQUIVO SITE ATUALIZADO: ${p.arquivoSiteAtualizado}`);
      utils.log(`ARQUIVO SITE ANTES DA ATUALIZAÇÃO: ${p.arquivoSiteAntesAtualizacao}`);
      utils.log(`ARQUIVO SITE ALTERAÇÕES: ${p.arquivoSiteAlteracoes}`);
      utils.log(`ARQUIVO SITE ALTERAÇÔES SCREENSHOT: ${p.arquivoSiteAlteracoesScreenshot}`);
      utils.log(`DELAY: ${p.delay}`);

      // await page.exposeFunction("getConfig", () => p);

      await Promise.all([
        page.goto(p.url),
        page.waitForNavigation({ waitUntil: "networkidle0" }),
      ]);

      if (p.delay) {
        await utils.sleep(p.delay);
      }

      utils.log("goto url");

      const elementoSeletor = await page.waitForSelector(p.seletor);
      utils.log("Seletor localizado");

      let novoSite;
      if (p.verificarSomenteAreaSelecionada == true) {
        utils.log("Verificando somente área selecionada");

        novoSite = await elementoSeletor.evaluate(domElement => {
          const novoSiteTmp = domElement.innerHTML;

          return novoSiteTmp;
        });
      } else {
        utils.log("Verificando página inteira");

        novoSite = await page.content();
      }

      var beautify_html = require('js-beautify').html;
      novoSite = beautify_html(novoSite, { indent_size: 2 })

      utils.log("Novo Site obtido");
      // utils.log(`Novo Site: ${novoSite}`);

      if (fs.existsSync(p.arquivoSiteAtualizado)) {
        const currentSite = fs.readFileSync(p.arquivoSiteAtualizado, 'utf8');

        utils.log("Site atual obtido");
        // utils.log(`Current Site: ${currentSite}`)

        if (novoSite && currentSite && currentSite != novoSite) {
          const msg = `Houve atualização no site ${p.url}`
          utils.log(msg)

          /* const diff = new diff_match_patch.diff_match_patch();
          const diffs = diff.diff_main(currentSite, novoSite);
          diff.diff_cleanupSemantic(diffs)
          const alteracoes = diff.diff_prettyHtml(diffs); */
          // const alteracoes = jsdiff.diffString(currentSite, novoSite);
          const alteracoes = diff(currentSite, novoSite);

          // utils.log(alteracoes);

          // await page.exposeFunction("getAlteracoes", () => alteracoes);
          // utils.log(jsdiff.diffString(currentSite, novoSite));
          // utils.log(jsdiff);

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

          await page.addStyleTag({content: 'del {background-color: tomato;}'})
          await page.addStyleTag({content: 'ins {background-color: lightgreen;}'})

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
          utils.log(msg)
        }
      } else {
        utils.log(`Arquivo inexistente: ${p.arquivoSiteAtualizado}. Criando um arquivo inicial.`)
        fs.writeFileSync(p.arquivoSiteAtualizado, novoSite);
      }
    }
    //);

    setTimeout(async () => {
      await browser.close();

      utils.log("Fim");
    }, 2000);
  } catch (e) {
    utils.log(e);
    await browser.close();
  }
})();
