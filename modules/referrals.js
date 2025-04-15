const loadConfig = require("../handlers/config.js");
const settings = loadConfig("./config.toml");
const fetch = require("node-fetch");
const Queue = require("../handlers/Queue.js");

/* Ensure platform release target is met */
const WindenModule = { 
  "name": "Referrals Module", 
  "description": "Handles user referrals system",
  "api_level": 1, 
  "target_platform": "0.5.0",
  "version": "1.0.0"
};

if (WindenModule.target_platform !== settings.version) {
  console.log('Module ' + WindenModule.name + ' does not support this platform release of Winden. The module was built for platform ' + WindenModule.target_platform + ' but is attempting to run on version ' + settings.version + '.')
  process.exit()
}

module.exports.WindenModule = WindenModule;
module.exports.load = async function (app, db) {
app.get('/generate', async (req, res) => {
  if (!req.session) return res.redirect("/login");
  if (!req.session.pterodactyl) return res.redirect("/login");

  if (!req.query.code) {
    return res.json({ error: "No code provided" });
  }

  let referralCode = req.query.code;
  // check if the referral code is less than 16 characters and has no spaces
  if(referralCode.length > 15 || referralCode.includes(" ")) {
    return res.json({ error: "Invalid code" });
  }
  // check if the referral code already exists
  if(await db.get(referralCode)){
    return res.json({ error: "Code already exists" });
  }
  // Save the referral code in the Keyv store along with the user's information
  await db.set(referralCode, {
    userId: req.session.userinfo.id,
    createdAt: new Date()
  });

  // Render the referral code view
  res.json({ success: "Referral code created" });
});

app.get('/claim', async (req, res) => {
  if (!req.session) return res.redirect("/login");
  if (!req.session.pterodactyl) return res.redirect("/login");

  // Get the referral code from the request body
  if (!req.query.code) {
    return res.json({ error: "No code provided" });
  }

  const referralCode = req.query.code;

  // Retrieve the referral code from the Keyv store
  const referral = await db.get(referralCode);

  if (!referral) {
    return res.json({ error: "Invalid code" });
  }

  // Check if user has already claimed a code
  if (await db.get("referral-" + req.session.userinfo.id) == "1") {
    return res.json({ error: "Already claimed a code" });
  }

  // Check if the referral code was created by the user
  if (referral.userId === req.session.userinfo.id) {
    // Return an error if the referral code was created by the user
    return res.json({ error: "Cannot claim your own code" });
  }

  // Award the referral bonus to the user who claimed the code
  const ownercoins = await db.get("coins-" + referral.userId);
  const usercoins = await db.get("coins-" + req.session.userinfo.id);

  db.set("coins-" + referral.userId, ownercoins + 80)
  db.set("coins-" + req.session.userinfo.id, usercoins + 250)
  db.set("referral-" + req.session.userinfo.id, 1)

  // Render the referral claimed view
  res.json({ success: "Referral code claimed" });
});

};