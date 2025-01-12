const { ADMIN_CHAT_ID, COMMANDS_MESSAGE, USER_COMMANDS_MESSAGE } = require('./constants.js');
const { bot, forwardedMessagesA2U, adminRepliesMessagesA2U, userMessagesU2A, getFullNameFromUser } = require('./common.js');
const { toggleResponderName, toggleRepliedToMessage, showResponderName, showRepliedToMessage, toggleForwardMode, forwardMode, togglePrivateMode, privateMode, banChat } = require('./settings.js');

exports.handleCommands = function handleCommands(msg) {
  const msgText = msg.text || '';

  if (!msgText)
    return false;

  if (msgText[0] != '/')
    return false;

  if (msgText == '/print') {
    const forwardedMessages = JSON.stringify(Object.fromEntries(forwardedMessagesA2U));
    const adminReplies = JSON.stringify(Object.fromEntries(adminRepliesMessagesA2U));
    const userMessages = JSON.stringify(Object.fromEntries(userMessagesU2A));
    console.log(forwardedMessagesA2U);
    console.log(adminRepliesMessagesA2U)
    console.log(userMessagesU2A)
    bot.sendMessage(ADMIN_CHAT_ID, `Forwarded messages from the bot (admin chat to user chat): \n${forwardedMessages}\nAdmin replies to users (admin chat to user chat):\n${adminReplies}\nMessages in user-bot private chat:${userMessages}`);
    return true;
  }
  else if (msgText == '/commands') {
    bot.sendMessage(ADMIN_CHAT_ID, COMMANDS_MESSAGE);
  }
  else if (msgText == '/toggleResponderName') {
    toggleResponderName();
    bot.sendMessage(ADMIN_CHAT_ID, showResponderName() ? "The name of the responder will be quoted in messages." : "The name of the responder will NOT be quoted in messages.");
  } else if (msgText == '/toggleReplies') {
    toggleRepliedToMessage();
    bot.sendMessage(ADMIN_CHAT_ID, showRepliedToMessage() ? "The message that was replied to will be quoted in the response." : "The message that was replied to will NOT be quoted in the response.");
  } else if (msgText == '/toggleForwardMode') {
    toggleForwardMode();
    bot.sendMessage(ADMIN_CHAT_ID, forwardMode() ? "User messages sent to the bot will be simply forwarded." : "User messages sent to the bot will NOT be forwarded. Instead, they will be sent.");
  }
  else {
    bot.sendMessage(ADMIN_CHAT_ID, "Unknown command.");
    bot.sendMessage(ADMIN_CHAT_ID, COMMANDS_MESSAGE);
  }

  return true;
}

exports.handleUserCommands = async function (msg) { // msg must be a reply to another message

  const userCommands = ["delete", "عومر", "ban", "عومر2", "info"];

  if (!msg.text)
    return false;

  if (!userCommands.includes(msg.text))
    return false;

  const replyToMessage = msg.reply_to_message;
  const replyToMessageId = replyToMessage.message_id;

  if (msg.text == "delete" || msg.text == "عومر") {

    if (adminRepliesMessagesA2U.size == 0)
      return false;

    const replyDetails = adminRepliesMessagesA2U.get(replyToMessageId);

    if (!replyDetails) {
      bot.sendMessage(ADMIN_CHAT_ID, 'Message not present in bot data structures.', { reply_to_message_id: replyToMessageId });
      return false;
    }

    const { chatId, messageId } = replyDetails;

    bot.deleteMessage(chatId, messageId);
    bot.sendMessage(ADMIN_CHAT_ID, 'Deleted message.', { reply_to_message_id: replyToMessageId });

  }
  else if (msg.text == "ban" || msg.text == "عومر2") {
    console.log(msg);

    const replyDetails = forwardedMessagesA2U.get(replyToMessageId);

    if (!replyDetails) {
      bot.sendMessage(ADMIN_CHAT_ID, 'Message not present in bot data structures.', { reply_to_message_id: replyToMessageId });
      return false;
    }

    const { chatId } = replyDetails;

    const chatMember = await bot.getChatMember(chatId, chatId);
    const user = chatMember.user;
    const userFullName = getFullNameFromUser(user);

    banChat(chatId);
    bot.sendMessage(chatId, "You've been banned from the bot.");
    bot.sendMessage(ADMIN_CHAT_ID, `${userFullName} has been banned from the bot.`);

  }
  else if (msg.text == "info") {

  }

  return true;
}

exports.handleUserChatCommands = function (msg) {

  const msgText = msg.text || '';
  const userChatId = msg.chat.id;

  if (!msgText)
    return false;

  if (msgText[0] != '/')
    return false;

  if (msgText == '/commands') {
    bot.sendMessage(userChatId, USER_COMMANDS_MESSAGE);
  }
  else if (msgText == '/start')
    return true;
  else if (msgText == '/togglePrivateMode') {
    togglePrivateMode(msg.from);
    bot.sendMessage(userChatId, privateMode(msg.from) ? "You entered private mode." : "You left private mode.");
  }
  else {
    bot.sendMessage(userChatId, "Unknown command.");
    bot.sendMessage(userChatId, COMMANDS_MESSAGE);
  }

  return true;
}