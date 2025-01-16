import { BotInfo, bot } from './constants.js';
import { messages } from './common.js';
import { users } from './settings.js';

import CommandHandler from './CommandHandler.js';
import MessageHandler from './MessageHandler.js';

// Handle incoming messages from users
bot.on('message', async (msg) => {

  try {

    const chatId = msg.chat.id;

    // messages COMING FROM USER CHATS
    if (chatId != BotInfo.ADMIN_CHAT_ID) {

      // If the user has sent a command, handle it
      if (await CommandHandler.handleUserChatCommands(msg))
        return;

      // If the user (chat, both have the same ID) is banned, do nothing
      if (await users.isUserBanned(msg.from))
        return;

      if (await MessageHandler.sendUserMessage(msg))
        return;

    } else { // messages COMING FROM THE ADMIN CHAT

      // If this returns true, that means the message was a command
      if (await CommandHandler.handleAdminChatCommands(msg))
        return;

      // If this returns true, the message was handled successfully
      if (await MessageHandler.sendAdminMessage(msg))
        return;

    }

  } catch (err) {
    console.log(err);
    bot.sendMessage(BotInfo.ADMIN_CHAT_ID, `Exception: ${err.message}`);
  };

});

bot.on('edited_message_text', async (msg) => {

  const msgChatId = msg.chat.id;

  if (msgChatId == BotInfo.ADMIN_CHAT_ID) {
    const replyToMessage = msg.reply_to_message;

    // If this is not a message that replies to another message
    if (!replyToMessage)
      return;

    // If this is not a message we've sent to some user
    if (!(await messages.isMessageSentByAdmin(msg)))
      return;

    if (msg.text)
      MessageHandler.editAdminMessageText(msg);

  } else {

    // If the bot doesn't know about this message
    if (!(await messages.getMessage(msg)))
      return;

    if (msg.text)
      MessageHandler.editUserMessageText(msg);

  }

  return;
})

bot.on('edited_message_caption', async (msg) => {

  const msgChatId = msg.chat.id;

  if (msgChatId == BotInfo.ADMIN_CHAT_ID) {
    const replyToMessage = msg.reply_to_message;

    // If this is not a message that replies to another message
    if (!replyToMessage)
      return;

    // If this is not a message we've sent to some user
    if (!(await messages.isMessageSentByAdmin(msg)))
      return;

    if (msg.caption)
      MessageHandler.editAdminMessageCaption(msg);

  } else {

    // If the bot doesn't know about this message
    if (!(await messages.getMessage(msg)))
      return;

    if (msg.caption)
      MessageHandler.editUserMessageCaption(msg);

  }

  return;
})