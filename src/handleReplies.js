const { bot, forwardedMessagesA2U, adminRepliesMessagesA2U, getResponderMessage, userMessagesU2A, setUserMessagesU2A, getFullNameFromUser, getUserNameFromUser, getSenderMessage } = require('./common.js');
const { ADMIN_CHAT_ID } = require('./constants.js');
const { handleAdminChatReplyCommands } = require('./handleCommands.js');
const { repliedToMessagesAreShown, forwardMode, isUserPrivate, doesUserSign } = require('./settings.js');

exports.handleReplies = async function (msg) {

  // Check if the admin's message is a reply to a forwarded message
  const replyToMessage = msg.reply_to_message;

  // If the message is not replying to any message, then the bot has nothing to do with it
  if (!replyToMessage || !replyToMessage.message_id)
    return false;

  // Handle potential commands first
  if (handleAdminChatReplyCommands(msg))
    return true;

  // Use reply_to_message_id to get the original message ID
  const messageIdInAdminChat = replyToMessage.message_id;

  // If the message is not forwarded from any user
  if (!forwardedMessagesA2U.has(messageIdInAdminChat))
    return false;

  // Find the original chat ID using the map
  const { chatId: userChatId, messageId: messageIdInUserChat } = forwardedMessagesA2U.get(messageIdInAdminChat);

  if (!userChatId)
    return false;

  let text = msg.text || '';
  const responderMsg = getResponderMessage(msg);
  const userSigns = doesUserSign(msg.from);

  if (userSigns)
    text += `\n${responderMsg}`.trim();

  // Forward the admin's reply back to the original user
  let userSentMsgInAdminChat;
  const replyToMessageIdOption = {
    reply_to_message_id: repliedToMessagesAreShown() ? messageIdInUserChat : undefined
  }
  const captionOption = {
    caption: userSigns ? responderMsg : undefined,
    caption_entities: userSigns ? [{ type: "blockquote", offset: text.indexOf(`${responderMsg}`), length: responderMsg.length }] : []
  }

  if (!userChatId)
    return false;

  if (msg.text) {
    const options = {
      ...replyToMessageIdOption,
      entities: userSigns ? [{ type: "blockquote", offset: text.indexOf(`${responderMsg}`), length: responderMsg.length }] : []
    }

    userSentMsgInAdminChat = await bot.sendMessage(userChatId, text, options);
  } else if (msg.photo?.length > 0) {

    const options = {
      ...replyToMessageIdOption,
      ...captionOption
    }

    // Send the photo
    const photoMsg = await bot.sendPhoto(userChatId, msg.photo.at(0).file_id, options);

    userSentMsgInAdminChat = photoMsg;

  } else if (msg.video) {

    const options = {
      ...replyToMessageIdOption,
      ...captionOption
    }

    // Send the video
    const videoMsg = await bot.sendVideo(userChatId, msg.video.file_id, options);

    userSentMsgInAdminChat = videoMsg;
  } else if (msg.sticker) {

    const options = replyToMessageIdOption;

    // Send the sticker
    const stickerMsg = await bot.sendSticker(userChatId, msg.sticker.file_id, options);

    userSentMsgInAdminChat = stickerMsg;
  } else if (msg.document) {

    const options = {
      reply_to_message_id: repliedToMessagesAreShown() ? messageIdInUserChat : undefined,
      caption: userSigns ? responderMsg : undefined,
      caption_entities: userSigns ? [{ type: "blockquote", offset: text.indexOf(`${responderMsg}`), length: responderMsg.length }] : []
    }

    console.log(options);

    // Send the document
    const documentMsg = await bot.sendDocument(userChatId, msg.document.file_id, options);

    userSentMsgInAdminChat = documentMsg;
  } else if (msg.audio) {
    const options = {
      ...replyToMessageIdOption,
      ...captionOption
    }

    // Send the audio
    const audioMsg = await bot.sendAudio(userChatId, msg.audio.file_id, options);

    userSentMsgInAdminChat = audioMsg;
  } else if (msg.location) {
    const options = replyToMessageIdOption;

    // Send the location
    const locationMsg = await bot.sendLocation(userChatId, msg.location.latitude, msg.location.longitude, options);

    userSentMsgInAdminChat = locationMsg;
  } else if (msg.contact) {

    const contact = msg.contact;

    const options = {
      ...replyToMessageIdOption,
      last_name: contact.last_name,
      vcard: contact.vcard
    }


    // Send the contact
    const audioMsg = await bot.sendContact(userChatId,
      contact.phone_number,
      contact.first_name,
      options
    );

    userSentMsgInAdminChat = audioMsg;
  } else {
    bot.sendMessage(ADMIN_CHAT_ID, "🔴 Unknown message type.");
  }

  adminRepliesMessagesA2U.set(msg.message_id, { chatId: userChatId, messageId: userSentMsgInAdminChat.message_id });
  setUserMessagesU2A(userChatId, userSentMsgInAdminChat.message_id, msg.message_id)

  return true;
}
exports.sendUserMessage = async function (msg) {

  const chatId = msg.chat.id;
  const messageId = msg.message_id;
  const replyToMessage = msg.reply_to_message;

  if (forwardMode() && !isUserPrivate(msg.from))
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

      if (!isUserPrivate(msg.from)) {
        senderMessage = getSenderMessage(msg);
        text += '\n' + senderMessage;
        username = getUserNameFromUser(msg.from);
      }

      if (replyToMessage) {
        const replyToUserMessageId = replyToMessage.message_id;
        const replyToAdminMessageId = userMessagesU2A.get(chatId).get(replyToUserMessageId);

        const options = {
          reply_to_message_id: replyToAdminMessageId,
          entities: isUserPrivate(msg.from) ? [] : [
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
          entities: isUserPrivate(msg.from) ? [] : [
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