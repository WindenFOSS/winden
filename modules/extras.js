/**
 * 
 * @file Name: extras.js
 * @description Additional features for Winden
 * @copyright Team WindenFOSS 2025
 *     Winden 0.1.0 (Aurora)
 *
 */

const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const loadConfig = require('../handlers/config.js');
const settings = loadConfig('./config.toml');
const indexjs = require("../app.js");
const Queue = require("../handlers/Queue.js");

const WindenModule = { 
  "name": "Winden Extras", 
  "api_level": 3, 
  "target_platform": "0.1.0" 
};

if (WindenModule.target_platform !== settings.version) {
  console.log('Module ' + WindenModule.name + ' does not support this platform release of Winden. The module was built for platform ' + WindenModule.target_platform + ' but is attempting to run on version ' + settings.version + '.')
  process.exit()
}

module.exports.WindenModule = WindenModule;
module.exports.load = async function(app, db) {
  app.get(`/api/password`, async (req, res) => {
    if (!req.session.userinfo.id) return res.redirect("/login");

    let checkPassword = await db.get("password-" + req.session.userinfo.id);

    if (checkPassword) {
      return res.json({ password: checkPassword });
    } else {
      let newpassword = makeid(settings.api.client.passwordgenerator["length"]);

      await fetch(
        settings.pterodactyl.domain + "/api/application/users/" + req.session.pterodactyl.id,
        {
          method: "patch",
          headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${settings.pterodactyl.key}`
          },
          body: JSON.stringify({
            username: req.session.pterodactyl.username,
            email: req.session.pterodactyl.email,
            first_name: req.session.pterodactyl.first_name,
            last_name: req.session.pterodactyl.last_name,
            password: newpassword
          })
        }
      );

      await db.set("password-" + req.session.userinfo.id, newpassword)
      return res.json({ password: newpassword });
    }
  });

  app.get("/panel", async (req, res) => {
    res.redirect(settings.pterodactyl.domain);
  });

  app.get("/notifications", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login");

    let notifications = await db.get('notifications-' + req.session.userinfo.id) || [];

    res.json(notifications)
  });

  app.get("/regen", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login");
    if (settings.api.client.allow.regen !== true) return res.send("You cannot regenerate your password currently.");

    let newpassword = makeid(settings.api.client.passwordgenerator["length"]);
    req.session.password = newpassword;

    await updatePassword(req.session.pterodactyl, newpassword, settings, db);
    res.redirect("/security");
  });

  app.post("/api/password/change", async (req, res) => {
    if (!req.session.pterodactyl) return res.status(401).json({ error: "Unauthorized" });
    if (!settings.api.client.allow.regen) return res.status(403).json({ error: "Password changes are not allowed" });

    const { password, confirmPassword } = req.body;

    // Validate password
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: "Invalid password provided" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    // Password requirements
    const minLength = 8;
    const hasNumber = /\d/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      return res.status(400).json({ error: `Password must be at least ${minLength} characters long` });
    }

    if (!(hasNumber && hasUpperCase && hasLowerCase)) {
      return res.status(400).json({ 
        error: "Password must contain at least one number, one uppercase letter, and one lowercase letter" 
      });
    }

    try {
      await updatePassword(req.session.pterodactyl, password, settings, db);
      res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      console.error("Password update error:", error);
      res.status(500).json({ error: "Failed to update password" });
    }
  });
};

function makeid(length) {
  let result = '';
  let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
     result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

// Helper function to update password
async function updatePassword(userInfo, newPassword, settings, db) {
  await fetch(
    `${settings.pterodactyl.domain}/api/application/users/${userInfo.id}`,
    {
      method: "patch",
      headers: {
        'Content-Type': 'application/json',
        "Authorization": `Bearer ${settings.pterodactyl.key}`
      },
      body: JSON.stringify({
        username: userInfo.username,
        email: userInfo.email,
        first_name: userInfo.first_name,
        last_name: userInfo.last_name,
        password: newPassword
      })
    }
  );

  await db.set("password-" + userInfo.id, newPassword);
}