const { bot, forwardedMessagesA2U, adminRepliesMessagesA2U, getResponderMessage, userMessagesU2A, setUserMessagesU2A, getFullNameFromUser, getUserNameFromUser, getSenderMessage } = require('./common.js');
const { ADMIN_CHAT_ID } = require('./constants.js');
const { handleAdminChatReplyCommands } = require('./handleCommands.js');
const { showResponderName, showRepliedToMessage, forwardMode, privateMode } = require('./settings.js');

exports.handleReplies = async function (msg) {

  // Check if the admin's message is a reply to a forwarded message
  const replyToMessage = msg.reply_to_message;

  if (!replyToMessage || !replyToMessage.message_id)
    return false;

  // Handle potential commands first
  if (handleAdminChatReplyCommands(msg))
    return true;

  // Use reply_to_message_id to get the original message ID
  const originalMessageId = replyToMessage.message_id;

  if (!forwardedMessagesA2U.has(originalMessageId))
    return false;

  // Find the original chat ID using the map
  const { chatId: targetChatId, messageId: targetMessageId } = forwardedMessagesA2U.get(originalMessageId);

  if (!targetChatId)
    return false;

  let text = msg.text || '';
  const responderMsg = getResponderMessage(msg);

  if (showResponderName())
    text += `\n${responderMsg}`;

  // bot.sendMessage(ADMIN_CHAT_ID, `Replied to message "${replyToMessage.text}" with IDs { targetId: ${targetMessageId}, originalId: ${originalMessageId} }. The text of the message: ${text}.`);

  // Forward the admin's reply back to the original user
  let userSentMsg;
  if (targetChatId) {
    if (msg.text)
      userSentMsg = await bot.sendMessage(targetChatId, text, { reply_to_message_id: showRepliedToMessage() ? targetMessageId : undefined, entities: showResponderName() ? [{ type: "blockquote", offset: text.indexOf(`${responderMsg}`), length: responderMsg.length }] : [] });
    else if (msg.photo?.length > 0) {

      const options = {
        reply_to_message_id: showRepliedToMessage() ? targetMessageId : undefined,
        caption: showResponderName() ? responderMsg : undefined,
        caption_entities: showResponderName() ? [{ type: "blockquote", offset: text.indexOf(`${responderMsg}`), length: responderMsg.length }] : []
      }

      // Send the photo
      const photoMsg = await bot.sendPhoto(targetChatId, msg.photo.at(0).file_id, options);

      userSentMsg = photoMsg;

    } else if (msg.document) {
      console.log(msg);

      const options = {
        reply_to_message_id: showRepliedToMessage() ? targetMessageId : undefined,
        caption: showResponderName() ? responderMsg : undefined,
        caption_entities: showResponderName() ? [{ type: "blockquote", offset: text.indexOf(`${responderMsg}`), length: responderMsg.length }] : []
      }

      // Send the document
      const documentMsg = await bot.sendDocument(targetChatId, msg.document.file_id, options);

      userSentMsg = documentMsg;
    }

    adminRepliesMessagesA2U.set(msg.message_id, { chatId: targetChatId, messageId: userSentMsg.message_id });
    setUserMessagesU2A(targetChatId, userSentMsg.message_id, msg.message_id)

  }

  return true;
}

exports.sendUserMessage = async function (msg) {

  const chatId = msg.chat.id;
  const messageId = msg.message_id;
  const replyToMessage = msg.reply_to_message;

  if (forwardMode() && !privateMode(msg.from))
    // Forward the user's message to the admin
    bot.forwardMessage(ADMIN_CHAT_ID, chatId, messageId).then(adminMsg => {
      // Store the original user message ID and chat ID
      forwardedMessagesA2U.set(adminMsg.message_id, { chatId, messageId });
      setUserMessagesU2A(chatId, messageId, adminMsg.message_id);

      if (replyToMessage) {
        const replyToUserMessageId = replyToMessage.message_id;
        const replyToAdminMessageId = userMessagesU2A.get(chatId).get(replyToUserMessageId);

        bot.sendMessage(ADMIN_CHAT_ID, "The message responds to:", { reply_to_message_id: replyToAdminMessageId });
      }

      // If the message is already forwarded from someone else
      if (msg.forward_from) {

        bot.sendMessage(ADMIN_CHAT_ID, `The message is forwarded from ${getFullNameFromUser(msg.forward_from)}. The original sender is ${getFullNameFromUser(msg.from)}`, { reply_to_message_id: adminMsg.message_id });
      }

    });
  else {

    if (msg.text) {

      let text = msg.text || '';
      let senderMessage = '';
      let username;

      if (!privateMode(msg.from)) {
        senderMessage = getSenderMessage(msg);
        text += '\n' + senderMessage;
        username = getUserNameFromUser(msg.from);
      }

      if (replyToMessage) {
        const replyToUserMessageId = replyToMessage.message_id;
        const replyToAdminMessageId = userMessagesU2A.get(chatId).get(replyToUserMessageId);

        const options = {
          reply_to_message_id: replyToAdminMessageId,
          entities: privateMode(msg.from) ? [] : [
            { type: "blockquote", offset: text.indexOf(`${senderMessage}`), length: senderMessage.length },
            { type: "mention", offset: text.indexOf(username), length: username.length }
          ]
        }

        bot.sendMessage(ADMIN_CHAT_ID, text, options).then(adminMsg => {
          forwardedMessagesA2U.set(adminMsg.message_id, { chatId, messageId });
          setUserMessagesU2A(chatId, messageId, adminMsg.message_id);
        });
      }
      else {

        const options = {
          entities: privateMode(msg.from) ? [] : [
            { type: "blockquote", offset: text.indexOf(`${senderMessage}`), length: senderMessage.length },
            { type: "mention", offset: text.indexOf(username), length: username.length }
          ]
        }

        bot.sendMessage(ADMIN_CHAT_ID, text, options).then(adminMsg => {
          forwardedMessagesA2U.set(adminMsg.message_id, { chatId, messageId });
          setUserMessagesU2A(chatId, messageId, adminMsg.message_id);
        });
      }
    }

  }

}