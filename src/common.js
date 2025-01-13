const { doesUserSign } = require('./settings.js');

exports.forwardedMessagesA2U = new Map();
exports.adminRepliesMessagesA2U = new Map();
exports.userMessagesU2A = new Map();

exports.setUserMessagesU2A = function (chatId, userMsgId, adminMsgId) {
  let userMap = exports.userMessagesU2A.get(chatId);

  if (!userMap)
    exports.userMessagesU2A.set(chatId, new Map([[userMsgId, adminMsgId]]));
  else
    userMap.set(userMsgId, adminMsgId);

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

exports.getResponderMessage = function (msg, markdown = true) {

  let responderMsg = '';

  if (!doesUserSign(msg.from))
    return responderMsg;

  const fullName = exports.getFullNameFromUser(msg.from);

  if (markdown)
    responderMsg = `>${fullName}`;
  else
    responderMsg = `${fullName}`;

  return responderMsg;
}

exports.getSenderMessage = function (msg, markdown = true) {

  const fullName = exports.getFullNameFromUser(msg.from);
  const username = exports.getUserNameFromUser(msg.from);
  const userId = msg.from.id;
  let senderMsg = '';

  if (markdown)
    senderMsg = `>${fullName} \\([${username}](tg://user?id=${userId}):${userId}\\)`
  else
    senderMsg = `${fullName} (${username}:${userId})`;

  return senderMsg;
}