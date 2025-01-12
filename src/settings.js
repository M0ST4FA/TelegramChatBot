
let showResponderName = true;
let showRepliedToMessage = true;
let forwardMode = false;
const privateModeUsers = new Set();

exports.showResponderName = function () {
  return showResponderName;
}

exports.showRepliedToMessage = function () {
  return showRepliedToMessage;
}

exports.toggleResponderName = function () {
  showResponderName = !showResponderName;
}

exports.toggleRepliedToMessage = function () {
  showRepliedToMessage = !showRepliedToMessage;
}

exports.forwardMode = function () {
  return forwardMode;
}

exports.toggleForwardMode = function () {
  forwardMode = !forwardMode;
}

exports.togglePrivateMode = function (user) {
  if (privateModeUsers.has(user.id))
    privateModeUsers.delete(user.id);
  else
    privateModeUsers.add(user.id);
}

exports.privateMode = function (user) {
  return privateModeUsers.has(user.id);
}