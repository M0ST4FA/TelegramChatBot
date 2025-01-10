const { bot, forwardedMessagesA2U: forwardedMessageMap, adminRepliesMessagesA2U: userMessageMap, getResponderMessage, userMessagesU2A, setUserMessagesU2A } = require('./common.js');
const { ADMIN_CHAT_ID } = require('./constants.js');
const { handleUserCommands } = require('./handleCommands.js');
const { showResponderName, showRepliedToMessage } = require('./settings.js');

exports.handleReplies = async function (msg) {

  // Check if the admin's message is a reply to a forwarded message
  const replyToMessage = msg.reply_to_message;

  if (!replyToMessage || !replyToMessage.message_id)
    return false;

  // Handle potential commands first
  if (handleUserCommands(msg))
    return true;

  // Use reply_to_message_id to get the original message ID
  const originalMessageId = replyToMessage.message_id;

  if (!forwardedMessageMap.has(originalMessageId))
    return false;

  // Find the original chat ID using the map
  const { chatId: targetChatId, messageId: targetMessageId } = forwardedMessageMap.get(originalMessageId);

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

    userMessageMap.set(msg.message_id, { chatId: targetChatId, messageId: userSentMsg.message_id });
    setUserMessagesU2A(targetChatId, userSentMsg.message_id, msg.message_id)

  }

  return true;
}