const { ADMIN_CHAT_ID, bot } = require('./constants.js');
const { isMessageSentByAdmin, getMessage } = require('./common.js');
const { handleUserChatCommands, handleAdminChatCommands } = require('./handleCommands.js');
const { sendAdminMessage, sendUserMessage } = require('./handleReplies.js');
const { editAdminMessageText, editUserMessageText, editUserMessageCaption, editAdminMessageCaption } = require('./editMessage.js');
const { isChatBanned } = require('./settings.js');

// Handle incoming messages from users
bot.on('message', async (msg) => {

  try {

    const chatId = msg.chat.id;

    // MESSAGES COMING FROM USER CHATS
    if (chatId != ADMIN_CHAT_ID) {

      // If the user has sent a command, handle it
      if (await handleUserChatCommands(msg))
        return;

      // If the user (chat, both have the same ID) is banned, do nothing
      if (await isChatBanned(msg.from.id))
        return;

      if (await sendUserMessage(msg))
        return;

    } else { // MESSAGES COMING FROM THE ADMIN CHAT

      // If this returns true, that means the message was a command
      if (await handleAdminChatCommands(msg))
        return;

      // If this returns true, the message was handled successfully
      if (await sendAdminMessage(msg))
        return;

    }

  } catch (err) {
    console.log(err);
    bot.sendMessage(ADMIN_CHAT_ID, `Exception: ${err.message}`);
  };

});

bot.on('edited_message_text', async (msg) => {

  const msgId = msg.message_id;
  const msgChatId = msg.chat.id;

  if (msgChatId == ADMIN_CHAT_ID) {
    const replyToMessage = msg.reply_to_message;

    // If this is not a message that replies to another message
    if (!replyToMessage)
      return;

    // If this is not a message we've sent to some user
    if (!(await isMessageSentByAdmin(msg)))
      return;

    if (msg.text)
      editAdminMessageText(msg);

  } else {

    // If the bot doesn't know about this message
    if (!(await getMessage(msg)))
      return;

    if (msg.text)
      editUserMessageText(msg);

  }

  return;
})

bot.on('edited_message_caption', async (msg) => {

  const msgId = msg.message_id;
  const msgChatId = msg.chat.id;

  if (msgChatId == ADMIN_CHAT_ID) {
    const replyToMessage = msg.reply_to_message;

    // If this is not a message that replies to another message
    if (!replyToMessage)
      return;

    // If this is not a message we've sent to some user
    if (!(await isMessageSentByAdmin(msg)))
      return;

    if (msg.caption)
      editAdminMessageCaption(msg);

  } else {

    // If the bot doesn't know about this message
    if (!(await getMessage(msg)))
      return;

    if (msg.caption)
      editUserMessageCaption(msg);

  }

  return;
})