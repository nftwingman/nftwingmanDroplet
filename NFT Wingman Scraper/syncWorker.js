const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

const cron = require("node-cron");

const { syncOpenseaPricesSplit } = require("./controllers/cronController");

dotenv.config({ path: path.resolve(__dirname, "./config.env") });

// // Connect database ------------------------

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    // eslint-disable-next-line no-console
    console.log("DB Connection was successful");
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.log(`DB Connection Error: ${err.message}`);
  });

// SCHEDULED OPENSEA SYNCS SPACED OUT

try {
  cron.schedule(
    "0 5 * * *",
    () => {
      syncOpenseaPricesSplit(1);
    },
    {
      scheduled: true,
      timezone: "America/Vancouver",
    }
  );
} catch (err) {
  console.log(err);
}

try {
  cron.schedule(
    "0 6 * * *",
    () => {
      syncOpenseaPricesSplit(1);
    },
    {
      scheduled: true,
      timezone: "America/Vancouver",
    }
  );
} catch (err) {
  console.log(err);
}

try {
  cron.schedule(
    "0 21 * * *",
    () => {
      syncOpenseaPricesSplit(1);
    },
    {
      scheduled: true,
      timezone: "America/Vancouver",
    }
  );
} catch (err) {
  console.log(err);
}

// try {
//   cron.schedule(
//     "7 20 * * *",
//     () => {
//       syncOpenseaPricesSplit(1);
//     },
//     {
//       scheduled: true,
//       timezone: "America/Vancouver",
//     }
//   );
// } catch (err) {
//   console.log(err);
// }
