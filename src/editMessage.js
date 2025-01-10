const { ADMIN_CHAT_ID } = require('./constants.js')
const { getResponderMessage, adminRepliesMessagesA2U: userMessageMap, bot } = require('./common.js')
const { showResponderName } = require('./settings.js')

exports.editMessageText = function (msg) {

  // Get basic message info
  const msgId = msg.message_id;

  // Create final message text
  let text = msg.text || '';
  const responderMsg = getResponderMessage(msg);

  if (showResponderName())
    text += `\n${responderMsg}`;

  // The message ID in the user's chat
  const { messageId: userChatMsgId, chatId: forwardChatId } = userMessageMap.get(msgId);

  const options = {
    chat_id: forwardChatId,
    message_id: userChatMsgId,
    entities: showResponderName() ? [{ type: "blockquote", offset: text.indexOf(`${responderMsg}`), length: responderMsg.length }] : []
  };

  bot.editMessageText(text, options);
  bot.sendMessage(ADMIN_CHAT_ID, 'Edited message text.', { reply_to_message_id: msgId })

}

exports.editMessageCaption = function (msg) {

  // Get basic message info
  const msgId = msg.message_id;

  // Create final message text
  let text = msg.caption || '';
  const responderMsg = getResponderMessage(msg);

  if (showResponderName())
    text += `\n${responderMsg}`;

  // The message ID in the user's chat
  const { messageId: userChatMsgId, chatId: forwardChatId } = userMessageMap.get(msgId);

  const options = {
    chat_id: forwardChatId,
    message_id: userChatMsgId,
    caption_entities: showResponderName() ? [{ type: "blockquote", offset: text.indexOf(`${responderMsg}`), length: responderMsg.length }] : []
  }

  bot.editMessageCaption(text, options)
  bot.sendMessage(ADMIN_CHAT_ID, 'Edited message caption.', { reply_to_message_id: msgId })

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
  const { messageId: userChatMsgId, chatId: forwardChatId } = userMessageMap.get(msgId);

  const options = {
    chat_id: forwardChatId,
    message_id: userChatMsgId,
    caption_entities: showResponderName() ? [{ type: "blockquote", offset: text.indexOf(`${responderMsg}`), length: responderMsg.length }] : []
  }

  bot.editMessageCaption(text, options)
  bot.sendMessage(ADMIN_CHAT_ID, 'Edited message caption.', { reply_to_message_id: msgId })

}