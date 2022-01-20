const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const extraStealth = require("puppeteer-extra-plugin-anonymize-ua");
const Collections = require("../models/CollectionModel");

const syncOpenseaPricesSplit = async (section) => {
  try {
    console.log(
      "OPENSEA SPLIT PRICE SYNC 🌊🌊🌊🌊🌊🌊🌊🌊",
      `section ${section}`
    );
    const collections = await Collections.find().sort({
      lastUpdated: -1,
    });

    const chunk = collections.length / 2;
    // Split in group of 3 items
    const result = chunkArray(collections, chunk);

    const selectedCollectionSection = result[section];

    puppeteer.use(StealthPlugin());
    puppeteer.use(extraStealth());

    const browser = await puppeteer.launch({
      headless: false,
      devtools: true,
      args: [
        "--no-sandbox",
        "--headless",
        "--full-memory-crash-report",
        "--disable-dev-shm-usage",
        // '--js-flags="--max-old-space-size=1024"',
        "--disable-setuid-sandbox",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process", // <- this one doesn't works in Windows
        "--disable-gpu",
      ],
    });

    for (let i = 0; i <= selectedCollectionSection.length - 1; i++) {
      const { contractAddress } = selectedCollectionSection[i];
      try {
        await cronLoopThroughOpenSea(contractAddress, browser);
      } catch (err) {
        console.log(err);
      }
    }
  } catch (err) {
    console.log(err);
  }
};

exports.syncOpenseaPricesSplit = syncOpenseaPricesSplit;
