const mongoose = require("mongoose");

const NFTSchema = new mongoose.Schema({
  tokenID: {
    type: Number,
    required: true,
  },
  contractAddress: {
    type: String,
  },
  image: {
    type: String,
    required: true,
  },
  attributes: {
    type: Array,
    required: true,
  },
  collectionName: {
    type: String,
    required: true,
  },
  rarityScore: {
    type: Number,
    required: true,
  },
  ranking: {
    type: Number,
  },
  price: {
    type: Number,
  },
  wingmanScore: {
    type: Number,
  },
  openseaListing: {
    type: String,
  },
  tokenMetadata: {
    type: String,
    default: "",
  },
  ownerAddress: {
    type: String,
    default: "",
  },
});

NFTSchema.index({ name: 1, image: 1, tokenID: 1 }, { unique: true });
NFTSchema.index({ collectionName: 1 });

const NFTS = mongoose.model("NFTS", NFTSchema);

module.exports = NFTS;
