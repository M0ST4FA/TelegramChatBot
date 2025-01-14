const { prisma, ADMIN_CHAT_ID } = require('./constants.js');
const { adminSigns, isUserPrivate } = require('./settings.js');

exports.addUser = async function (user) {
  const sUserId = user.id.toString();

  console.log(user);

  return await prisma.user.create({
    data: {
      userId: sUserId
    }
  });
}

exports.addAdmin = async function (admin) {
  const sUserId = admin.id.toString();

  return await prisma.admin.create({
    data: {
      userId: sUserId,
      signs: true
    }
  });
}

exports.getUser = async function (userId) {
  const sUserId = userId.toString();

  return await prisma.user.findFirst({
    where: {
      userId: sUserId
    }
  });
}

exports.getAdmin = async function (userId) {
  const sUserId = userId.toString();

  return await prisma.admin.findFirst({
    where: {
      userId: sUserId
    }
  });
}

exports.addUserMessage = async function (userChatId, userMsgId, adminMsgId) {
  const sUserChatId = userChatId.toString();
  const sUserMessageId = userMsgId.toString();
  const sAdminMessageId = adminMsgId.toString();

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
  const sUserChatId = userChatId.toString();
  const sUserMessageId = userMsgId.toString();
  const sAdminMessageId = adminMsgId.toString();

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
  const sMessageId = msg.message_id.toString();
  const sChatId = msg.chat.id.toString();
  let message;

  if (msg.chat.id == ADMIN_CHAT_ID)
    message = await prisma.message.findFirst({
      where: {
        AND: [{
          adminMessageId: sMessageId
        }, {
          forwarded: true
        }
        ]
      }
    })
  else
    message = await prisma.message.findFirst({
      where: {
        AND: [{
          userMessageId: sMessageId
        },
        {
          AND: [
            { userChatId: sChatId },
            {
              forwarded: true
            }
          ]
        }
        ]
      }
    })

  return message ? true : false;
}

exports.isMessageSentByAdmin = async function (msg) {
  const sMessageId = msg.message_id.toString();
  const sChatId = msg.chat.id.toString();
  let message;

  if (msg.chat.id == ADMIN_CHAT_ID)
    message = await prisma.message.findFirst({
      where: {
        AND: [{
          adminMessageId: sMessageId
        }, {
          forwarded: false
        }
        ]
      }
    })
  else
    message = await prisma.message.findFirst({
      where: {
        AND: [{
          userMessageId: sMessageId
        },
        {
          AND: [
            { userChatId: sChatId },
            {
              forwarded: false
            }
          ]
        }
        ]
      }
    })

  return message ? true : false;
}

exports.getMessage = async function (msg) {
  const sMessageId = msg.message_id.toString();
  const sChatId = msg.chat.id.toString();

  if (msg.chat.id == ADMIN_CHAT_ID)
    return await prisma.message.findFirst({
      where: {
        adminMessageId: sMessageId
      }
    })
  else
    return await prisma.message.findFirst({
      where: {
        AND: [{
          userMessageId: sMessageId
        },
        { userChatId: sChatId }
        ]
      }
    })
}

exports.getUserMessage = async function (adminMsgId) {
  const sMessageId = adminMsgId.toString();

  return await prisma.message.findFirst({
    where: {
      AND: [
        { adminMessageId: sMessageId },
        { forwarded: true }
      ]
    }
  })
}

exports.getAdminMessage = async function (chatId, userMsgId) {
  const sMessageId = userMsgId.toString();
  const sChatId = chatId.toString();

  return await prisma.message.findFirst({
    where: {
      AND: [
        { userMessageId: sMessageId },
        {
          AND: [
            { userChatId: sChatId },
            { forwarded: false }
          ]
        }
      ]
    }
  })
}

exports.getMessageFromUserChat = async function (chatId, userMsgId) {
  const sMessageId = userMsgId.toString();
  const sChatId = chatId.toString();

  return await prisma.message.findFirst({
    where: {
      AND: [
        { userMessageId: sMessageId },
        { userChatId: sChatId }
      ]
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

  let responderMsg = '';

  if (!(await adminSigns(msg.from)))
    return responderMsg;

  const fullName = exports.getFullNameFromUser(msg.from);

  if (markdown)
    responderMsg = `>${fullName}`;
  else
    responderMsg = `${fullName}`;

  return responderMsg;
}

exports.getSenderMessage = async function (msg, markdown = true) {

  let senderMsg = '';

  if (await isUserPrivate(msg.from))
    return senderMsg;

  const fullName = exports.getFullNameFromUser(msg.from);
  const username = exports.getUserNameFromUser(msg.from);
  const userId = msg.from.id;

  if (markdown)
    senderMsg = `>${fullName} \\(${username}:${userId}\\)`
  else
    senderMsg = `${fullName} (${username}:${userId})`;

  return senderMsg;
}

exports.escapeMarkdownV2 = function (text) {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}