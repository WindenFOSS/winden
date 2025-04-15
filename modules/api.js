const loadConfig = require("../handlers/config.js");
const settings = loadConfig("./config.toml");

/* Ensure platform release target is met */
const WindenModule = {
    "name": "API Interface",
    "description": "API endpoints for external integrations",
    "api_level": 3,
    "target_platform": "0.5.0",
    "version": "1.0.0"
};

if (WindenModule.target_platform !== settings.version) {
    console.log('Module ' + WindenModule.name + ' does not support this platform release of Winden. The module was built for platform ' + WindenModule.target_platform + ' but is attempting to run on version ' + settings.version + '.')
    process.exit()
}

/* Module */
module.exports.WindenModule = WindenModule;
module.exports.load = async function(app, db) {
    app.get("/api/state", async (req, res) => {
        const userId = req.session.userinfo.id;
        if (!userId) {
            return res.status(401).json({
                error: "Not authenticated"
            });
        } else {
            return res.json({
                message: "Authenticated",
                user: req.session.userinfo
            });
        }
    });

    app.get("/api/coins", async (req, res) => {
        if (!req.session.userinfo) {
            return res.status(401).json({
                error: "Not authenticated"
            });
        }
        const userId = req.session.userinfo.id;
        const coins = await db.get(`coins-${userId}`) || 0;
        res.json({
            coins
        });
    });

    // User
    app.get("/api/user", async (req, res) => {
        if (!req.session.userinfo) {
            return res.status(401).json({
                error: "Not authenticated"
            });
        }
        res.json(req.session.userinfo);
    });
}