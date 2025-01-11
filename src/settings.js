
showResponderName = true;
showRepliedToMessage = true;
forwardMode = false;

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