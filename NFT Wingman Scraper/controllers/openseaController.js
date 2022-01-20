const SingleNFTs = require("../models/SingleNFTModel");
const Collections = require("../models/CollectionModel");

const loopThroughOpenseaBase = async (contractAddress, browser) => {
  try {
    const { totalSupply, priceFloorArr, totalListedArr, _id, openseaURL } =
      await Collections.findOne({
        contractAddress,
      });

    let floorPrice = 10.12121; // Set high so it can be updated
    const today = new Date().toLocaleDateString();

    const ownerAddressTrackerObj = {};

    const slug = openseaURL.split("/collection/")[1];

    const priceTrackerObj = await scrapeListingsFromOpensea(slug, browser);

    // Set the new floor price based on the lowest value
    for (const key in priceTrackerObj) {
      if (priceTrackerObj[key] < floorPrice) {
        floorPrice = priceTrackerObj[key];
      }
    }

    if (Object.keys(priceTrackerObj).length) {
      // Set total listed metric and percentage listed metrics
      const totalListed = Object.keys(priceTrackerObj).length;
      const percentageListed = totalListed / totalSupply;

      if (totalListedArr) {
        let doesTodayExist = false;
        totalListedArr.forEach((date) => {
          if (today === date.date) {
            date.totalListed = totalListed;
            doesTodayExist = true;
          }
        });

        if (!doesTodayExist) {
          totalListedArr.push({ date: today, totalListed });
        }

        Collections.findByIdAndUpdate(_id, { totalListedArr });
      }

      await Collections.findOneAndUpdate(
        { contractAddress },
        {
          totalListed,
          percentageListed,
        }
      );

      // Update the price floor of the collection. If not updated for today. Add it to the array
      if (priceFloorArr && floorPrice !== 10.12121) {
        let doesTodayExist = false;
        priceFloorArr.forEach((date) => {
          if (today === date.date) {
            date.floorPrice = floorPrice;
            doesTodayExist = true;
          }
        });

        if (!doesTodayExist) {
          priceFloorArr.push({ date: today, floorPrice });
        }
        await Collections.findByIdAndUpdate(_id, { priceFloorArr });
      }

      const NFTs = await SingleNFTs.find(
        { price: { $gt: 0 }, contractAddress },
        { price: 1, tokenID: 1, rarityScore: 1, ranking: 1 }
      );

      // If price already in DB. Update or remove based on opensea listings
      await Promise.all(
        NFTs.map(async ({ _id, price, tokenID, rarityScore, ranking }) => {
          const priceFromOpensea = priceTrackerObj[tokenID];
          const ownerAddress = ownerAddressTrackerObj[tokenID];
          if (priceFromOpensea) {
            if (price !== priceFromOpensea && priceFromOpensea > 0) {
              const wingmanScore =
                ((((rarityScore * 45) / (ranking + 5500)) * 10) /
                  (priceFromOpensea - floorPrice * 0.25)) *
                55;

              await SingleNFTs.findByIdAndUpdate(_id, {
                price: priceFromOpensea,
                wingmanScore,
                ownerAddress,
              });
            }
            // If there there was a price but now there is none on opensea. Listing is gone
          } else if (price && (!priceFromOpensea || priceFromOpensea === 0)) {
            await SingleNFTs.findByIdAndUpdate(_id, {
              price: 0,
              wingmanScore: 0,
              ownerAddress: "",
            });
          }
          delete priceTrackerObj[tokenID];
        })
      );

      // Any k/v pairs left in the price tracker means there are NFTs in the Db with no price so update them.
      let airbrakeCount = 0;
      await Promise.all(
        Object.keys(priceTrackerObj).map(async (key) => {
          if (priceTrackerObj[key] !== 0 && Number(key)) {
            const NFT = await SingleNFTs.findOne({
              contractAddress,
              tokenID: key,
            });
            if (NFT && NFT.rarityScore) {
              const wingmanScore =
                ((((NFT.rarityScore * 45) / (NFT.ranking + totalSupply)) * 10) /
                  (priceTrackerObj[key] - floorPrice * 0.25)) *
                55;

              NFT.price = priceTrackerObj[key];
              NFT.ownerAddress = ownerAddressTrackerObj[key];
              NFT.wingmanScore = parseFloat(wingmanScore);
              await NFT.save();
            } else {
              if (airbrakeCount < 1) {
                console.log(
                  "No NFTs for that collection",
                  contractAddress,
                  "key",
                  key
                );
                airbrakeCount++;
              }
            }
          } else {
            console.log("TOKEN ID Not a number", key, contractAddress);
          }
        })
      );

      // UPDATE LAST SYNCED TIME
      await Collections.findOneAndUpdate(
        { contractAddress },
        {
          lastUpdated: new Date(),
        }
      );
    }
  } catch (err) {
    console.log(err);
  }
};

const cronLoopThroughOpenSea = async (contractAddress, browser) => {
  try {
    return await loopThroughOpenseaBase(contractAddress, browser);
  } catch (err) {
    console.log(err);
  }
};
