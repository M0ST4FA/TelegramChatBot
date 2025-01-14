const { ADMIN_CHAT_ID, bot } = require('./constants.js')
const { getResponderMessage, getSenderMessage, getMessage, getMessageFromUserChat, escapeMarkdownV2 } = require('./common.js')
const { sendDiagnosticMessage, DiagnosticMessage } = require('./diagnostics.js');

exports.editAdminMessageText = async function (msg) {

  // Get basic message info
  const adminChatMsgId = msg.message_id;

  // Create final message text
  let text = msg.text || '';

  const responderInfo = await getResponderMessage(msg, false); // The function takes into account the state of the user
  const responderMsg = responderInfo.responderMsg;

  text += `\n${responderMsg}`;
  text = text.trim();

  // The message ID in the user's chat
  const { userMessageId: userChatMsgId, userChatId } = await getMessage(msg);

  const options = {
    chat_id: userChatId,
    message_id: userChatMsgId,
    entities: responderMsg ? [
      { type: 'blockquote', offset: text.indexOf(responderMsg), length: responderMsg.length }
    ] : []
  };

  bot.editMessageText(text, options);
  sendDiagnosticMessage(DiagnosticMessage.EDITED_MESSAGE_TEXT, ADMIN_CHAT_ID, { reply_to_message_id: adminChatMsgId });

}

exports.editUserMessageText = async function (msg) {

  // Get basic message info
  const userMsgId = msg.message_id;
  const userChatId = msg.chat.id;

  // Create final message text
  let text = msg.text || '';

  const senderInfo = await getSenderMessage(msg, false); // The function takes into account the state of the user
  const senderMsg = senderInfo.senderMsg;

  text += `\n${senderMsg}`;
  text = text.trim();

  // The message ID in the admin chat
  const message = await getMessageFromUserChat(userChatId, userMsgId);
  const adminMsgId = message.adminMessageId;

  const options = {
    chat_id: ADMIN_CHAT_ID,
    message_id: adminMsgId,
    entities: senderInfo ? [
      { type: 'blockquote', offset: text.indexOf(senderMsg), length: senderMsg.length }
    ] : []
  };

  bot.editMessageText(text, options);
  sendDiagnosticMessage(DiagnosticMessage.EDITED_MESSAGE_TEXT, userChatId, { reply_to_message_id: userMsgId });

}

exports.editAdminMessageCaption = async function (msg) {

  // Get basic message info
  const adminChatMsgId = msg.message_id;

  // Create final message text
  let text = msg.caption || '';

  const responderInfo = await getResponderMessage(msg, false); // The function takes into account the state of the user
  const responderMsg = responderInfo.responderMsg;

  text += `\n${responderMsg}`;
  text = text.trim();

  // The message ID in the user's chat
  const { userMessageId: userChatMsgId, userChatId } = await getMessage(msg);

  const options = {
    chat_id: userChatId,
    message_id: userChatMsgId,
    caption_entities: responderMsg ? [
      { type: 'blockquote', offset: text.indexOf(responderMsg), length: responderMsg.length }
    ] : []
  }

  bot.editMessageCaption(text, options)
  sendDiagnosticMessage(DiagnosticMessage.EDITED_MESSAGE_CAPTION, ADMIN_CHAT_ID, { reply_to_message_id: adminChatMsgId });

}

exports.editUserMessageCaption = async function (msg) {

  // Get basic message info
  const userChatMsgId = msg.message_id;
  const userChatId = msg.chat.id;

  // Create final message text
  let text = msg.caption || '';

  const senderInfo = await getSenderMessage(msg, false);  // The function takes into account the state of the user
  const senderMsg = senderInfo.senderMsg;

  text += `\n${senderMsg}`;
  text = text.trim();

  // The message ID in the admin chat
  const message = await getMessageFromUserChat(userChatId, userChatMsgId);
  const adminMsgId = message.adminMessageId;

  const options = {
    chat_id: ADMIN_CHAT_ID,
    message_id: adminMsgId,
    caption_entities: senderInfo ? [
      { type: 'blockquote', offset: text.indexOf(senderMsg), length: senderMsg.length }
    ] : []
  }

  bot.editMessageCaption(text, options);
  sendDiagnosticMessage(DiagnosticMessage.EDITED_MESSAGE_CAPTION, userChatId, { reply_to_message_id: userChatMsgId });

}