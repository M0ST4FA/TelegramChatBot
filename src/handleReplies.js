const { bot, forwardedMessagesA2U, adminRepliesMessagesA2U, getResponderMessage, userMessagesU2A, setUserMessagesU2A, getFullNameFromUser, getUserNameFromUser, getSenderMessage } = require('./common.js');
const { ADMIN_CHAT_ID } = require('./constants.js');
const { handleAdminChatReplyCommands } = require('./handleCommands.js');
const { repliedToMessagesAreShown, forwardMode, isUserPrivate, doesUserSign } = require('./settings.js');

/* const sendMessageToChat = function (msg, { receiverIsAdmin, replyToMessageIdOption, captionOption, senderMessageOption, responderMessageOption }) {

  // Common constants
  const msgChatId = msg.chat.id;
  const messageId = msg.message_id;
  const replyToMessage = msg.reply_to_message;

  // This will be the text of text messages and the caption of other types of messages
  let text = msg.text || '';
  let responderMessage = '';
  let userSigns = true;

  let senderMessage = '';
  let username = '';
  let userIsPrivate = false;

  if (receiverIsAdmin) {
    userIsPrivate = isUserPrivate(msg.from);
    if (!userIsPrivate) {
      senderMessage = getSenderMessage(msg);
      text += '\n' + senderMessage;
      username = getUserNameFromUser(msg.from);
    }
  } else {

    responderMessage = getResponderMessage(msg);
    userSigns = doesUserSign(msg.from);

    if (userSigns)
      text += `\n${responderMessage}`;

  }

  // Forward the admin's reply back to the original user
  let userSentMsgInAdminChat;

  if (msg.text) {
    const options = {
      ...replyToMessageIdOption,
    }

    if (receiverIsAdmin)
      Object.assign(options, senderMessageOption);
    else
      Object.assign(options, responderMessageOption);

    userSentMsgInAdminChat = bot.sendMessage(receiverIsAdmin ? ADMIN_CHAT_ID : msgChatId, text, options);

  } else if (msg.photo?.length > 0) {

    const options = {
      ...replyToMessageIdOption,
      ...captionOption
    }

    // Send the photo
    userSentMsgInAdminChat = bot.sendPhoto(ADMIN_CHAT_ID, msg.photo.at(0).file_id, options);

  } else if (msg.video) {

    const options = {
      ...replyToMessageIdOption,
      ...captionOption
    }

    // Send the video
    userSentMsgInAdminChat = bot.sendVideo(ADMIN_CHAT_ID, msg.video.file_id, options);

  } else if (msg.sticker) {

    const options = replyToMessageIdOption;

    // Send the sticker
    const stickerMsg = await bot.sendSticker(ADMIN_CHAT_ID, msg.sticker.file_id, options);

    userSentMsgInAdminChat = stickerMsg;
  } else if (msg.document) {

    const options = {
      reply_to_message_id: repliedToMessagesAreShown() ? messageId : undefined,
      caption: userSigns ? responderMsg : undefined,
      caption_entities: userSigns ? [{ type: "blockquote", offset: text.indexOf(`${responderMsg}`), length: responderMsg.length }] : []
    }

    console.log(options);

    // Send the document
    const documentMsg = await bot.sendDocument(ADMIN_CHAT_ID, msg.document.file_id, options);

    userSentMsgInAdminChat = documentMsg;
  } else if (msg.audio) {
    const options = {
      ...replyToMessageIdOption,
      ...captionOption
    }

    // Send the audio
    const audioMsg = await bot.sendAudio(ADMIN_CHAT_ID, msg.audio.file_id, options);

    userSentMsgInAdminChat = audioMsg;
  } else if (msg.location) {
    const options = replyToMessageIdOption;

    // Send the location
    const locationMsg = await bot.sendLocation(ADMIN_CHAT_ID, msg.location.latitude, msg.location.longitude, options);

    userSentMsgInAdminChat = locationMsg;
  } else if (msg.contact) {

    const contact = msg.contact;

    const options = {
      ...replyToMessageIdOption,
      last_name: contact.last_name,
      vcard: contact.vcard
    }


    // Send the contact
    const audioMsg = await bot.sendContact(ADMIN_CHAT_ID,
      contact.phone_number,
      contact.first_name,
      options
    );

    userSentMsgInAdminChat = audioMsg;
  } else {
    bot.sendMessage(ADMIN_CHAT_ID, "🔴 Unknown message type.");
  }

  userSentMsgInAdminChat.then(adminMsg => {

    if (receiverIsAdmin) { // From user to admin
      forwardedMessagesA2U.set(adminMsg.message_id, { chatId: msgChatId, messageId: messageId });
      setUserMessagesU2A(msgChatId, userSentMsgInAdminChat.message_id, msg.message_id)
    }
    else { // From admin to user
      adminRepliesMessagesA2U.set(msg.message_id, { chatId: msgChatId, messageId: userSentMsgInAdminChat.message_id });
      setUserMessagesU2A(msgChatId, messageId, adminMsg.message_id);
    }

  })


}
*/

const sendAdminMessageToUserChat = function (msg) {

  // Use reply_to_message_id to get the original message ID
  const replyToMessage = msg.reply_to_message;
  const messageIdInAdminChat = replyToMessage.message_id;

  // If the message is not forwarded from any user
  if (!forwardedMessagesA2U.has(messageIdInAdminChat))
    return false;

  // Find the original chat ID using the map
  const { chatId: userChatId, messageId: messageIdInUserChat } = forwardedMessagesA2U.get(messageIdInAdminChat);

  if (!userChatId)
    return false;

  const caption = msg.caption || '';
  let text = msg.text || '';
  text += caption;
  const responderMsg = getResponderMessage(msg);
  const userSigns = doesUserSign(msg.from);

  if (userSigns)
    text += `\n${responderMsg}`;

  text = text.trim();

  // Forward the admin's reply back to the original user
  let userSentMsgInAdminChat;
  const replyToMessageIdOption = {
    reply_to_message_id: repliedToMessagesAreShown() ? messageIdInUserChat : undefined
  }
  const captionOption = {
    parse_mode: "MarkdownV2",
    caption: userSigns ? text : undefined,
  }
  const responderMessageOption = {
    parse_mode: "MarkdownV2"
  }

  if (!userChatId)
    return false;

  if (msg.text) {
    const options = {
      ...replyToMessageIdOption,
      ...responderMessageOption
    }

    userSentMsgInAdminChat = bot.sendMessage(userChatId, text, options);
  } else if (msg.photo?.length > 0) {

    const options = {
      ...replyToMessageIdOption,
      ...captionOption
    }

    // Send the photo
    userSentMsgInAdminChat = bot.sendPhoto(userChatId, msg.photo.at(0).file_id, options);
  } else if (msg.video) {

    const options = {
      ...replyToMessageIdOption,
      ...captionOption
    }

    // Send the video
    userSentMsgInAdminChat = bot.sendVideo(userChatId, msg.video.file_id, options);
  } else if (msg.sticker) {

    const options = replyToMessageIdOption;

    // Send the sticker
    userSentMsgInAdminChat = bot.sendSticker(userChatId, msg.sticker.file_id, options);
  } else if (msg.document) {

    const options = {
      ...replyToMessageIdOption,
      ...captionOption
    }

    // Send the document
    userSentMsgInAdminChat = bot.sendDocument(userChatId, msg.document.file_id, options);
  } else if (msg.audio) {
    const options = {
      ...replyToMessageIdOption,
      ...captionOption
    }

    // Send the audio
    userSentMsgInAdminChat = bot.sendAudio(userChatId, msg.audio.file_id, options);
  } else if (msg.voice) {
    const options = {
      ...replyToMessageIdOption,
      ...captionOption
    }

    // Send the audio
    userSentMsgInAdminChat = bot.sendAudio(userChatId, msg.voice.file_id, options);
  } else if (msg.location) {
    const options = replyToMessageIdOption;

    // Send the location
    userSentMsgInAdminChat = bot.sendLocation(userChatId, msg.location.latitude, msg.location.longitude, options);
  } else if (msg.contact) {

    const contact = msg.contact;

    const options = {
      ...replyToMessageIdOption,
      last_name: contact.last_name,
      vcard: contact.vcard
    }

    // Send the contact
    userSentMsgInAdminChat = bot.sendContact(userChatId,
      contact.phone_number,
      contact.first_name,
      options
    );
  } else {
    bot.sendMessage(ADMIN_CHAT_ID, "🔴 Unknown message type.");
  }

  userSentMsgInAdminChat.then(adminMsg => {
    adminRepliesMessagesA2U.set(msg.message_id, { chatId: userChatId, messageId: adminMsg.message_id });
    setUserMessagesU2A(userChatId, adminMsg.message_id, msg.message_id)
  })

  return true;
}

exports.sendAdminMessage = function (msg) {

  // Check if the admin's message is a reply to a forwarded message
  const replyToMessage = msg.reply_to_message;

  // If the message is not replying to any message, then the bot has nothing to do with it
  if (!replyToMessage || !replyToMessage.message_id)
    return false;

  // Handle potential commands first
  if (handleAdminChatReplyCommands(msg))
    return true;

  if (sendAdminMessageToUserChat(msg))
    return true;

  return false;
}

const forwardUserMessageToAdminChat = function (msg) {

  const userChatId = msg.chat.id;
  const messageIdInUserChat = msg.message_id;
  const replyToMessage = msg.reply_to_message;

  // Forward the user's message to the admin
  bot.forwardMessage(ADMIN_CHAT_ID, userChatId, messageIdInUserChat).then(adminMsg => {
    // Store the original user message ID and chat ID
    forwardedMessagesA2U.set(adminMsg.message_id, { chatId: userChatId, messageId: messageIdInUserChat });
    setUserMessagesU2A(userChatId, messageIdInUserChat, adminMsg.message_id);

    // If this message replies to another one
    if (replyToMessage) {
      const replyToUserMessageId = replyToMessage.message_id;
      const replyToAdminMessageId = userMessagesU2A.get(userChatId).get(replyToUserMessageId);

      bot.sendMessage(ADMIN_CHAT_ID, "The message responds to:", { reply_to_message_id: replyToAdminMessageId });
    }

    // If the message is already forwarded from someone else
    if (msg.forward_from) {
      bot.sendMessage(ADMIN_CHAT_ID, `The message is forwarded from ${getFullNameFromUser(msg.forward_from)}.\nThe original sender is ${getFullNameFromUser(msg.from)}`, { reply_to_message_id: adminMsg.message_id });
    }
  })

}

const sendUserMessageToAdminChat = function (msg) {

  // Common constants
  const userChatId = msg.chat.id;
  const messageIdInUserChat = msg.message_id;
  const replyToMessage = msg.reply_to_message;

  // This will be the text of text messages and the caption of other types of messages
  const caption = msg.caption || '';
  let text = msg.text || '';
  text += caption;
  let senderMessage = '';
  const userIsPrivate = isUserPrivate(msg.from);
  if (!userIsPrivate) {
    senderMessage = getSenderMessage(msg);
    text += '\n' + senderMessage;
  }

  text = text.trim();

  // Common options
  const replyToMessageIdOption = {
    reply_to_message_id: undefined
  }

  if (replyToMessage) {
    const replyToUserMessageId = replyToMessage.message_id;
    const replyToAdminMessageId = userMessagesU2A.get(userChatId).get(replyToUserMessageId);

    replyToMessageIdOption.reply_to_message_id = replyToAdminMessageId;
  }

  const captionOption = {
    parse_mode: "MarkdownV2",
    caption: userIsPrivate ? undefined : text,
  }

  const senderMessageOption = {
    parse_mode: "MarkdownV2"
  }

  let userSentMsgInAdminChat;

  if (msg.text) {

    const options = {
      ...replyToMessageIdOption,
      ...senderMessageOption
    }

    userSentMsgInAdminChat = bot.sendMessage(ADMIN_CHAT_ID, text, options);

  } else if (msg.photo?.length > 0) {

    const options = {
      ...replyToMessageIdOption,
      ...captionOption
    }

    // Send the photo
    userSentMsgInAdminChat = bot.sendPhoto(ADMIN_CHAT_ID, msg.photo.at(0).file_id, options);

  } else if (msg.video) {

    const options = {
      ...replyToMessageIdOption,
      ...captionOption
    }

    // Send the video
    userSentMsgInAdminChat = bot.sendVideo(ADMIN_CHAT_ID, msg.video.file_id, options);

  } else if (msg.sticker) {

    const options = replyToMessageIdOption;

    // Send the sticker
    userSentMsgInAdminChat = bot.sendSticker(ADMIN_CHAT_ID, msg.sticker.file_id, options);
  } else if (msg.document) {

    const options = {
      ...replyToMessageIdOption,
      ...captionOption
    }

    // Send the document
    userSentMsgInAdminChat = bot.sendDocument(ADMIN_CHAT_ID, msg.document.file_id, options);
  } else if (msg.audio) {

    const options = {
      ...replyToMessageIdOption,
      ...captionOption
    }

    // Send the audio
    userSentMsgInAdminChat = bot.sendAudio(ADMIN_CHAT_ID, msg.audio.file_id, options);
  } else if (msg.voice) {

    const options = {
      ...replyToMessageIdOption,
      ...captionOption
    }

    // Send the audio
    userSentMsgInAdminChat = bot.sendAudio(ADMIN_CHAT_ID, msg.voice.file_id, options);
  } else if (msg.location) {

    const options = replyToMessageIdOption;

    // Send the location
    userSentMsgInAdminChat = bot.sendLocation(ADMIN_CHAT_ID, msg.location.latitude, msg.location.longitude, options);
  } else if (msg.contact) {

    const contact = msg.contact;

    const options = {
      ...replyToMessageIdOption,
      last_name: contact.last_name,
      vcard: contact.vcard
    }

    // Send the contact
    userSentMsgInAdminChat = bot.sendContact(ADMIN_CHAT_ID,
      contact.phone_number,
      contact.first_name,
      options
    );
  } else {
    bot.sendMessage(userChatId, "🔴 Unknown message type.");
  }

  userSentMsgInAdminChat.then(adminMsg => {
    forwardedMessagesA2U.set(adminMsg.message_id, { chatId: userChatId, messageId: messageIdInUserChat });
    setUserMessagesU2A(userChatId, messageIdInUserChat, adminMsg.message_id);
  })

}

exports.sendUserMessage = function (msg) {

  // If forwarding mode is enabled AND also the user must not be in private mode
  if (forwardMode() && !isUserPrivate(msg.from))
    forwardUserMessageToAdminChat(msg);
  else // If forwarding mode is disabled or the user is in private mode
    sendUserMessageToAdminChat(msg);

  return true;
}