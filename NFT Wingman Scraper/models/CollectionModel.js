const mongoose = require("mongoose");

const CollectionsSchema = new mongoose.Schema({
  collectionName: {
    type: String,
    required: true,
  },
  totalSupply: {
    type: Number,
    required: true,
  },
  totalListed: {
    type: Number,
  },
  percentageListed: {
    type: Number,
  },
  traits: {
    type: Object,
  },
  priceFloorArr: {
    type: Array,
  },
  contractAddress: {
    type: String,
    required: true,
  },
  oneDaySalesStats: Array,
  sevenDaySalesStats: Array,
  thirtyDaySalesStats: Array,
  totalVolume: Number,
  totalSales: Number,
  ownerCount: Number,
  averagePrice: Number,
  marketCap: Number,
  openseaURL: String,
  ownerRatio: Number,
  totalListedArr: Array,
  lastUpdated: { type: Date, default: Date.now },
});

CollectionsSchema.index(
  { collectionName: 1, contractAddress: 1, totalSupply: 1 },
  { unique: true }
);

const Collections = mongoose.model("Collections", CollectionsSchema);

module.exports = Collections;
