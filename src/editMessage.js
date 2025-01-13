const { ADMIN_CHAT_ID } = require('./constants.js')
const { getResponderMessage, adminRepliesMessagesA2U, bot, getSenderMessage, userMessagesU2A } = require('./common.js')
const { showResponderName, doesUserSign, isUserPrivate } = require('./settings.js')

exports.editAdminMessageText = function (msg) {

  // Get basic message info
  const adminChatMsgId = msg.message_id;

  // Create final message text
  let text = msg.text || '';
  const responderMsg = getResponderMessage(msg);

  if (doesUserSign(msg.from))
    text += `\n${responderMsg}`;

  // The message ID in the user's chat
  const { messageId: userChatMsgId, chatId: userChatId } = adminRepliesMessagesA2U.get(adminChatMsgId);

  const options = {
    parse_mode: "MarkdownV2",
    chat_id: userChatId,
    message_id: userChatMsgId,
  };

  bot.editMessageText(text, options);
  bot.sendMessage(ADMIN_CHAT_ID, 'Edited message text.', { reply_to_message_id: adminChatMsgId })

}

exports.editUserMessageText = function (msg) {

  // Get basic message info
  const userMsgId = msg.message_id;
  const userChatId = msg.chat.id;

  // Create final message text
  let text = msg.text || '';
  const senderMsg = getSenderMessage(msg);

  if (!isUserPrivate(msg.from))
    text += `\n${senderMsg}`;

  // The message ID in the admin chat
  const adminMsgId = userMessagesU2A.get(userChatId).get(userMsgId);

  const options = {
    parse_mode: "MarkdownV2",
    chat_id: ADMIN_CHAT_ID,
    message_id: adminMsgId,
  };

  bot.editMessageText(text, options);
  bot.sendMessage(userChatId, 'Edited message text.', { reply_to_message_id: userMsgId })

}

exports.editAdminMessageCaption = function (msg) {

  // Get basic message info
  const adminChatMsgId = msg.message_id;

  // Create final message text
  let text = msg.caption || '';
  const responderMsg = getResponderMessage(msg);

  if (doesUserSign(msg.from))
    text += `\n${responderMsg}`;

  // The message ID in the user's chat
  const { messageId: userChatMsgId, chatId: userChatId } = adminRepliesMessagesA2U.get(adminChatMsgId);

  const options = {
    parse_mode: "MarkdownV2",
    chat_id: userChatId,
    message_id: userChatMsgId,
  }

  bot.editMessageCaption(text, options)
  bot.sendMessage(ADMIN_CHAT_ID, 'Edited message caption.', { reply_to_message_id: adminChatMsgId })

}

exports.editUserMessageCaption = function (msg) {

  // Get basic message info
  const userChatMsgId = msg.message_id;
  const userChatId = msg.chat.id;

  // Create final message text
  let text = msg.caption || '';
  const senderMsg = getSenderMessage(msg);

  if (!isUserPrivate(msg.from))
    text += `\n${senderMsg}`;

  // The message ID in the user's chat
  const adminChatMsgId = userMessagesU2A.get(userChatId).get(userChatMsgId);

  const options = {
    parse_mode: "MarkdownV2",
    chat_id: ADMIN_CHAT_ID,
    message_id: adminChatMsgId,
  }

  bot.editMessageCaption(text, options)
  bot.sendMessage(userChatId, 'Edited message caption.', { reply_to_message_id: userChatMsgId })

}

exports.editMessagePhoto = function (msg) {

  // Get basic message info
  const msgId = msg.message_id;

  // Create final message text
  let text = msg.caption || '';
  const responderMsg = getResponderMessage(msg);

  if (showResponderName())
    text += `\n${responderMsg}`;

  // The message ID in the user's chat
  const { messageId: userChatMsgId, chatId: forwardChatId } = adminRepliesMessagesA2U.get(msgId);

  const options = {
    chat_id: forwardChatId,
    message_id: userChatMsgId,
    caption_entities: showResponderName() ? [{ type: "blockquote", offset: text.indexOf(`${responderMsg}`), length: responderMsg.length }] : []
  }

  bot.editMessageCaption(text, options)
  bot.sendMessage(ADMIN_CHAT_ID, 'Edited message caption.', { reply_to_message_id: msgId })

}