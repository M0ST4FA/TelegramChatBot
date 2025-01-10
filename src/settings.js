
showResponderName = true;
showRepliedToMessage = true;

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