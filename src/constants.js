exports.TOKEN = process.env.BOT_TOKEN;
exports.ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID; // Replace with the chat ID you want to forward messages to
exports.COMMANDS_MESSAGE = `
      ✳️ Commands supported by the bot:
      🤖 /commands Shows this message.
      🤖 /log Prints debugging information for developers.
      🤖 /sign <on|off> Toggles showing the name of the responder from the admin chat to the user.
      🤖 /toggleReplies Toggles showing the message that admins have replied to to the user.
      🤖 /toggleForwardMode Toggles forwarding user messages or sending them without forwarding.
      🤖 /bannedUsers Lists all of the banned users.
      🤖 /ban <user ID> Bans the user with the ID <user ID> from the bot.
      🤖 /unban <user ID> Removes the user with the ID <user ID> from the list of banned users.
      `
exports.USER_COMMANDS_MESSAGE = `
      ✳️ Commands supported by the bot:
      🤖 /commands Shows this message.
      🤖 /togglePrivateMode Toggles private mode. In private mode, your name and information is not available to the admins of the bot.
      `