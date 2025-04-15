const loadConfig = require("../handlers/config");
const settings = loadConfig("./config.toml");
const fetch = require('node-fetch')

/**
 * Log an action to a Discord webhook.
 * @param {string} action 
 * @param {string} message 
 */
module.exports = (action, message) => {
    if (!settings.logging.status) return
    if (!settings.logging.actions.user[action] && !settings.logging.actions.admin[action]) return

    console.log(action, message);

    fetch(settings.logging.webhook, {
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            username: "Dashboard Logger",
            avatarURL: settings.logging?.icon || "https://i.postimg.cc/bwfSP5pR/nopb-logo.png", // Default Winden logo
            embeds: [
                {
                    title: action,
                    description: message,
                    thumbnail: {
                        url: settings.logging?.icon || "https://i.postimg.cc/bwfSP5pR/nopb-logo.png" // Default Winden logo
                    },
                    color: hexToDecimal('#FFFFFF'),
                    footer: {
                        text: settings.logging?.footer ||  "Winden Logging"
                    }
                }
            ]
        })
    })
    .catch(() => {})
}

function hexToDecimal(hex) {
    return parseInt(hex.replace("#", ""), 16)
}