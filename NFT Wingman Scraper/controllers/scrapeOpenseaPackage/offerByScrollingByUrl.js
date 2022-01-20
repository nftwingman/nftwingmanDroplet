const airbrake = require("../../../../utils/airbrake");

const offersByScrollingByUrl = async (url, optionsGiven = {}) => {
  try {
    const optionsDefault = {
      debug: false,
      logs: false,
      sort: true, // sorts the returned offers by lowest to highest price
      browserInstance: undefined,
    };
    const options = { ...optionsDefault, ...optionsGiven };
    const { debug, logs, browserInstance, sort } = options;
    const customPuppeteerProvided = Boolean(optionsGiven.browserInstance);

    // add mandatory query params
    // fixes a bug, see following link:
    // https://github.com/dcts/opensea-scraper/pull/26
    const mandatoryQueryParam = "search[toggles][0]=BUY_NOW";
    if (!url.includes(mandatoryQueryParam)) {
      const joinChar = url.includes("?") ? "&" : "?";
      url += `${joinChar}${mandatoryQueryParam}`;
    }

    logs &&
      console.log(`=== scraping started ===\nScraping Opensea URL: ${url}`);
    logs &&
      console.log(
        `\n=== options ===\ndebug          : ${debug}\nlogs           : ${logs}\nbrowserInstance: ${
          browserInstance ? "provided by user" : "default"
        }`
      );

    // init browser
    let browser = browserInstance;
    if (!customPuppeteerProvided) {
      browser = await puppeteer.launch({
        headless: !debug, // when debug is true => headless should be false
        args: ["--start-maximized"],
      });
    }

    logs && console.log("\n=== actions ===");
    logs && console.log("new page created");
    const page = await browser.newPage();

    try {
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        if (
          req.resourceType() === "stylesheet" ||
          req.resourceType() === "image" ||
          req.resourceType() === "font"
        ) {
          req.abort();
        } else {
          req.continue();
        }
      });
    } catch (err) {
      console.log(err);
    }

    await page.goto(url);

    // ...🚧 waiting for cloudflare to resolve
    logs && console.log("🚧 waiting for cloudflare to resolve");
    await page.waitForSelector(".cf-browser-verification", { hidden: true });

    // expose all helper functions
    logs && console.log("expose all helper functions");
    await page.addScriptTag({
      path: require.resolve("./offersByScrollingHelperFunctions.js"),
    });

    // scrape offers until target resultsize reached or bottom of page reached
    logs &&
      console.log(
        "scrape offers until target resultsize reached or bottom of page reached"
      );

    const resultSize = await _extractTotalOffers(page);
    console.log("resultSize:", resultSize);

    if (resultSize > 5000) {
      await page.close();
      console.log("collection too large to sync", url);
      airbrake.notify("collection too large to sync", url);
      return { offers: [] };
    }

    let offers = await _scrollAndFetchOffers(page, resultSize);

    if (!customPuppeteerProvided && !debug) {
      logs && console.log("closing browser...");
      await page.close();
    }

    await page.close();

    // if (sort) {
    //   offers = offers.sort((a, b) => a.floorPrice.amount - b.floorPrice.amount);
    // }
    return {
      offers: offers.slice(0, resultSize),
      // stats: {
      //   totalOffers: totalOffers,
      // },
    };
  } catch (err) {
    console.log(err);
  }
};

async function _scrollAndFetchOffers(page, resultSize) {
  return await page.evaluate(
    (resultSize) =>
      new Promise((resolve) => {
        // keep in mind inside the browser context we have the global variable "dict" initialized
        // defined inside src/helpers/rankingsHelperFunctions.js
        let currentScrollTop = -1;
        const interval = setInterval(() => {
          console.log(
            "another scrol... dict.length = " + Object.keys(dict).length
          );
          window.scrollBy(0, 150);
          // fetchOffers is a function that is exposed through page.addScript() and
          // is defined inside src/helpers/offersHelperFunctions.js
          fetchOffers(dict);

          const endOfPageReached =
            document.documentElement.scrollTop === currentScrollTop;
          const enoughItemsFetched = Object.keys(dict).length >= resultSize;

          if (!endOfPageReached && !enoughItemsFetched) {
            currentScrollTop = document.documentElement.scrollTop;
            return;
          }
          clearInterval(interval);
          resolve(Object.values(dict));
        }, 120);
      }),
    resultSize
  );
}

async function _extractTotalOffers(page) {
  try {
    // set timeout to 1 sec, no need to extensively wait since page should be loaded already
    const element = await page.waitForSelector(
      ".AssetSearchView--results-count",
      { timeout: 1000 }
    );
    const resultsText = await element.evaluate((el) => el.textContent); // grab the textContent from the element, by evaluating this function in the browser context
    const dotsRemoved = resultsText.replace(/\./g, "");
    const commasRemoved = dotsRemoved.replace(/,/g, "");
    return Number(commasRemoved.split(" ")[0]);
  } catch (err) {
    return undefined;
  }
}

module.exports = offersByScrollingByUrl;
