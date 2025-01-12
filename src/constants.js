exports.TOKEN = process.env.BOT_TOKEN;
exports.ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID; // Replace with the chat ID you want to forward messages to
exports.BOT_NAME = process.env.BOT_NAME;
exports.COMMANDS_MESSAGE =
      `✳️ Commands supported by the bot:
🤖 /commands Shows this message.
🤖 /log Prints debugging information for developers.
🤖 /sign <on|off> Toggles showing the name of the responder from the admin chat to the user.
🤖 /replies <on|off> Toggles showing the message that admins have replied to to the user.
🤖 /forwarding <on|off> Toggles forwarding user messages or sending them without forwarding.
🤖 /bannedUsers Lists all of the banned users.
🤖 /ban <user ID> Bans the user with the ID <user ID> from the bot.
🤖 /unban <user ID> Removes the user with the ID <user ID> from the list of banned users.`

exports.USER_COMMANDS_MESSAGE =
      `✳️ Commands supported by the bot:
🤖 /commands Shows this message.
🤖 /private <on|off> Toggles private mode. In private mode, your name and information is not available to the admins of the bot.`

exports.USER_WELCOMING_MESSAGE =
      `✳️ Welcome to ${exports.BOT_NAME}!
✳️ You can send us any message you want and hopefully we will respond ASAP. 
✳️ Please be patient, and most importantly, be polite.
${exports.USER_COMMANDS_MESSAGE}`