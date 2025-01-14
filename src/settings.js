const { prisma } = require("./constants");

async function testConnection() { try { await prisma.$connect(); console.log('Connection to database successful!'); } catch (error) { console.error('Error connecting to the database:', error); } finally { await prisma.$disconnect(); } } testConnection();

// SIGNING
exports.adminSigns = async function (user) {
  const sUserId = user.id.toString();

  const userObj = await prisma.admin.findFirst({
    where: {
      userId: sUserId
    },
    select: {
      signs: true
    }
  })

  return !userObj ? true : userObj.signs;
}

exports.doNotSignMessagesOfAdmin = async function (user) {
  const sUserId = user.id.toString();

  await prisma.admin.upsert({
    where: {
      userId: sUserId
    },
    update: {
      signs: false
    },
    create: {
      userId: sUserId,
      signs: false
    }
  }
  )
}

exports.signMessagesOfAdmin = async function (user) {
  const sUserId = user.id.toString();

  await prisma.admin.upsert({
    where: {
      userId: sUserId
    },
    update: {
      signs: true
    },
    create: {
      userId: sUserId,
      signs: true
    }
  }
  )
}

// REPLIES
// repliedToMessagesAreShown
exports.repliesAreShown = async function () {
  const obj = await prisma.setting.findFirst({
    where: {
      key: "replies"
    }
  })

  return obj.value == "true" ? true : false;
}

exports.showReplies = async function () {
  await prisma.setting.update({
    where: {
      key: "replies"
    },
    data: {
      value: "true"
    }
  })
}

exports.hideReplies = async function () {
  await prisma.setting.update({
    where: {
      key: "replies"
    },
    data: {
      value: "false"
    }
  })
}

// FORWARDING
exports.forwardMode = async function () {
  const obj = await prisma.setting.findFirst({
    where: {
      key: "forwardMode"
    }
  })

  return obj.value == "true" ? true : false;
}

exports.enableForwardMode = async function () {
  await prisma.setting.update({
    where: {
      key: "forwardMode"
    },
    data: {
      value: "true"
    }
  })
}

exports.disableForwardMode = async function () {
  await prisma.setting.update({
    where: {
      key: "forwardMode"
    },
    data: {
      value: "false"
    }
  })
}

// PRIVATE MODE

exports.enablePrivateMode = async function (user) {
  const sUserId = user.id.toString();

  await prisma.user.update({
    where: {
      userId: sUserId
    },
    data: {
      private: true
    }
  })
}

exports.disablePrivateMode = async function (user) {
  const sUserId = user.id.toString();

  await prisma.user.update({
    where: {
      userId: sUserId
    },
    data: {
      private: false
    }
  })
}

exports.isUserPrivate = async function (user) {
  const sUserId = user.id.toString();

  const userObj = await prisma.user.findUnique({
    where: {
      userId: sUserId
    },
    select: {
      private: true
    }
  });

  return userObj ? userObj.private : false;
}

// BANNING
exports.addToBannedChats = async function (chatId) {
  const sChatId = chatId.toString();

  await prisma.user.update({
    where: {
      userId: sChatId
    },
    data: {
      banned: true
    }
  })
}

exports.removeFromBannedChats = async function (chatId) {
  const sChatId = chatId.toString();

  await prisma.user.update({
    where: {
      userId: sChatId
    },
    data: {
      banned: false
    }
  })
}

exports.isChatBanned = async function (chatId) {
  const sChatId = chatId.toString();

  const userObj = await prisma.user.findFirst({
    where: {
      userId: sChatId
    },
    select: {
      banned: true
    }
  })

  return !userObj ? false : userObj.banned;
}

exports.getBannedChatIds = async function () {
  const chats = await prisma.user.findMany({
    where: {
      banned: true
    },
    select: {
      userId: true
    }
  })

  return chats.map(chat => chat.userId);
}

// LANGUAGE
exports.setArabicLanguage = async function () {
  await prisma.setting.update({
    where: {
      key: "language"
    },
    data: {
      value: "ar"
    }
  })
}

exports.setEnglishLanguage = async function () {
  await prisma.setting.update({
    where: {
      key: "language"
    },
    data: {
      value: "en"
    }
  })
}

exports.language = async function () {
  const obj = await prisma.setting.findFirst({
    where: {
      key: "language"
    }

  })

  return obj.value;
}