const { readFileSync } = require('node:fs')

exports.TOKEN = process.env.BOT_TOKEN;
exports.ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID; // Replace with the chat ID you want to forward messages to
exports.COMMANDS_MESSAGE = `
      ✳️ Commands supported by the bot:
      🤖 /commands Shows this message.
      🤖 /print Prints debugging information for developers.
      🤖 /toggleResponderName Toggles showing the name of the responder from the admin chat to the user.
      🤖 /toggleReplies Toggles showing the message that admins have replied to to the user.
      `