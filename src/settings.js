let showRepliedToMessage = true;
let forwardMode = false;
const adminsWhoDoNotSign = new Set();
const privateModeUsers = new Set();
const bannedChats = new Set();
let language = "ar";

// SIGNING
exports.doNotSignMessagesOfUser = function (user) {
  adminsWhoDoNotSign.add(user.id);
}

exports.signMessagesOfUser = function (user) {
  adminsWhoDoNotSign.delete(user.id);
}

exports.doesUserSign = function (user) {
  return !adminsWhoDoNotSign.has(user.id);
}

// REPLIES
exports.repliedToMessagesAreShown = function () {
  return showRepliedToMessage;

}

exports.showRepliedToMessages = function () {
  showRepliedToMessage = true;
}

exports.hideRepliedToMessages = function () {
  showRepliedToMessage = false;
}

exports.toggleRepliedToMessage = function () {
  showRepliedToMessage = !showRepliedToMessage;
}

// FORWARDING
exports.forwardMode = function () {
  return forwardMode;
}

exports.enableForwardMode = function () {
  forwardMode = true;
}

exports.disableForwardMode = function () {
  forwardMode = false;
}

exports.toggleForwardMode = function () {
  forwardMode = !forwardMode;
}

// PRIVATE MODE
exports.togglePrivateMode = function (user) {
  if (privateModeUsers.has(user.id))
    privateModeUsers.delete(user.id);
  else
    privateModeUsers.add(user.id);
}

exports.enablePrivateMode = function (user) {
  privateModeUsers.add(user.id);
}

exports.disablePrivateMode = function (user) {
  privateModeUsers.delete(user.id);
}

exports.isUserPrivate = function (user) {
  return privateModeUsers.has(user.id);
}

// BANNING
exports.addToBannedChats = function (chatId) {
  bannedChats.add(chatId);
}

exports.removeFromBannedChats = function (chatId) {
  bannedChats.delete(chatId);
}

exports.isChatBanned = function (chatId) {
  return bannedChats.has(chatId);
}

exports.bannedChats = function () {
  return bannedChats;
}

// LANGUAGE
exports.setArabicLanguage = function () {
  language = "ar";
}

exports.setEnglishLanguage = function () {
  language = "en";
}

exports.language = function () {
  return language;
}

exports.banChat = async function (chatId, banMsgId) {

  const options = {
    reply_to_message_id: banMsgId,
    user_id: chatId
  }

  if (isChatBanned(chatId)) {
    exports.bot.sendMessage(ADMIN_CHAT_ID, `User is already banned. To unban user, type /unban ${chatId}.`);
    return;
  }

  const chatMember = await exports.bot.getChatMember(chatId, chatId);
  const user = chatMember.user;
  const userIsPrivate = isUserPrivate(user);
  const username = exports.getUserNameFromUser(user);
  const userFullName = exports.getFullNameFromUser(user);

  addToBannedChats(chatId);
  sendDiagnosticMessage(DiagnosticMessage.USER_BANNING_MESSAGE, chatId);

  if (userIsPrivate)
    options.user_is_private = true
  else
    options.user_is_private = false;

  options.user_full_name = userFullName;
  options.username = username;

  sendDiagnosticMessage(DiagnosticMessage.ADMIN_BANNING_MESSAGE, ADMIN_CHAT_ID, options);

  if (isUserPrivate(user))
    exports.bot.sendMessage(ADMIN_CHAT_ID, `The user with ID ${chatId} has been banned from the bot.`);
  else
    exports.bot.sendMessage(ADMIN_CHAT_ID, `${userFullName} (${username}:${chatId}) has been banned from the bot.`);
}