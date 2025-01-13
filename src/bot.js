const { ADMIN_CHAT_ID } = require('./constants.js');
const { bot, adminRepliesMessagesA2U } = require('./common.js');
const { handleUserChatCommands, handleAdminChatCommands } = require('./handleCommands.js');
const { sendAdminMessage, sendUserMessage } = require('./handleReplies.js');
const { editMessageText, editMessageCaption } = require('./editMessage.js');
const { isChatBanned } = require('./settings.js');

// Handle incoming messages from users
bot.on('message', async (msg) => {

  try {

    const chatId = msg.chat.id;

    // MESSAGES COMING FROM USER CHATS
    if (chatId != ADMIN_CHAT_ID) {

      // If the user (chat, both have the same ID) is banned, do nothing
      if (isChatBanned(chatId))
        return;

      // If the user has sent a command, handle it
      if (handleUserChatCommands(msg))
        return;

      if (sendUserMessage(msg))
        return;

    } else { // MESSAGES COMING FROM THE ADMIN CHAT

      // If this returns true, that means the message was a command
      if (handleAdminChatCommands(msg))
        return;

      // If this returns true, the message was handled successfully
      if (sendAdminMessage(msg))
        return;

    }
  } catch (err) {
    console.log(err);
    bot.sendMessage(ADMIN_CHAT_ID, `Exception: ${err.message}`);
  };

});

bot.on('edited_message', async (msg) => {

  const msgId = msg.message_id;
  const replyToMessage = msg.reply_to_message;

  // If this is not a message that replies to another message
  if (!replyToMessage)
    return;

  // If this is not a message we've sent to some user
  if (!adminRepliesMessagesA2U.has(msgId))
    return;

  if (msg.text)
    editMessageText(msg);

  return;
})

bot.on('edited_message_caption', async (msg) => {

  const msgId = msg.message_id;
  const replyToMessage = msg.reply_to_message;

  // If this is not a message that replies to another message
  if (!replyToMessage)
    return;

  // If this is not a message we've sent to some user
  if (!adminRepliesMessagesA2U.has(msgId))
    return;

  if (msg.caption)
    editMessageCaption(msg);

  return;
})