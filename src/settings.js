const adminsWhoDoNotSign = new Set();
let showRepliedToMessage = true;
let forwardMode = false;
const privateModeUsers = new Set();
const bannedChats = new Set();

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