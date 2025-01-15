const { prisma, ADMIN_CHAT_ID } = require('./constants.js');
const { users, admins } = require('./settings.js');

exports.addUserMessage = async function (userChatId, userMsgId, adminMsgId) {
  const sUserChatId = BigInt(userChatId)
  const sUserMessageId = BigInt(userMsgId)
  const sAdminMessageId = BigInt(adminMsgId)

  await prisma.message.create({
    data: {
      userChatId: sUserChatId,
      userMessageId: sUserMessageId,
      adminMessageId: sAdminMessageId,
      forwarded: true
    }
  })
}

exports.addAdminMessage = async function (userChatId, userMsgId, adminMsgId) {
  const sUserChatId = BigInt(userChatId)
  const sUserMessageId = BigInt(userMsgId)
  const sAdminMessageId = BigInt(adminMsgId)

  await prisma.message.create({
    data: {
      userChatId: sUserChatId,
      userMessageId: sUserMessageId,
      adminMessageId: sAdminMessageId,
      forwarded: false
    }
  })
}

exports.isMessageSentByUser = async function (msg) {
  const sMessageId = BigInt(msg.message_id);
  const sChatId = BigInt(msg.chat.id);
  let message;

  if (msg.chat.id == ADMIN_CHAT_ID)
    message = await prisma.message.findUnique({
      where: {
        adminMessageId: sMessageId,
        forwarded: true
      }
    })
  else
    message = await prisma.message.findUnique({
      where: {
        userMessageId: sMessageId,
        userChatId: sChatId,
        forwarded: true
      }
    })

  return message ? true : false;
}

exports.isMessageSentByAdmin = async function (msg) {
  const sMessageId = BigInt(msg.message_id);
  const sChatId = BigInt(msg.chat.id);
  let message;

  if (msg.chat.id == ADMIN_CHAT_ID)
    message = await prisma.message.findUnique({
      where: {
        adminMessageId: sMessageId,
        forwarded: false
      }
    })
  else
    message = await prisma.message.findUnique({
      where: {
        userMessageId: sMessageId,
        userChatId: sChatId,
        forwarded: false
      }
    })

  return message ? true : false;
}

exports.getMessage = async function (msg) {
  const sMessageId = BigInt(msg.message_id);
  const sChatId = BigInt(msg.chat.id);

  if (msg.chat.id == ADMIN_CHAT_ID)
    return await prisma.message.findUnique({
      where: {
        adminMessageId: sMessageId
      }
    })
  else
    return await prisma.message.findUnique({
      where: {
        userMessageId: sMessageId,
        userChatId: sChatId
      }
    })
}

exports.getUserMessage = async function (adminMsgId) {
  const sMessageId = BigInt(adminMsgId)

  return await prisma.message.findUnique({
    where: {
      adminMessageId: sMessageId,
      forwarded: true
    }
  })
}

exports.getAdminMessage = async function (chatId, userMsgId) {
  const sMessageId = BigInt(userMsgId)
  const sChatId = BigInt(chatId)

  return await prisma.message.findUnique({
    where: {
      userMessageId: sMessageId,
      userChatId: sChatId,
      forwarded: false
    }
  })
}

exports.getMessageFromUserChat = async function (chatId, userMsgId) {
  const sMessageId = BigInt(userMsgId)
  const sChatId = BigInt(chatId)

  return await prisma.message.findUnique({
    where: {
      userMessageId: sMessageId,
      userChatId: sChatId
    }
  })
}

exports.getUserNameFromUser = function (user) {
  return user.username ? `@${user.username}` : '@';
}

exports.getFullNameFromUser = function (user) {
  const firstName = user.first_name || '';
  const lastName = user.last_name || '';

  let fullName = `${firstName} ${lastName}`.trim();

  if (fullName == 'عمر عبدالعليم') {
    fullName = 'عومر عبعليم آل دحيح'
  }

  return fullName;
}

exports.getResponderMessage = async function (msg, markdown = true) {

  if (!(await admins.adminSigns(msg.from)))
    return {
      responderMsg: ''
    };

  const fullName = exports.getFullNameFromUser(msg.from);

  if (markdown)
    return `>${fullName}`;
  else
    return {
      responderMsg: `${fullName}`,
      fullName,
    }
}

exports.getSenderMessage = async function (msg, markdown = true) {

  if (await users.isUserPrivate(msg.from))
    return {
      senderMsg: ''
    };

  const fullName = exports.getFullNameFromUser(msg.from);
  const username = exports.getUserNameFromUser(msg.from);
  const userId = msg.from.id;

  if (markdown)
    return `>${fullName} \\(${username}:${userId}\\)`
  else
    return {
      senderMsg: `${fullName} (${username}:${userId})`,
      fullName,
      username,
      userId
    }
}

exports.escapeMarkdownV2 = function (text) {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}