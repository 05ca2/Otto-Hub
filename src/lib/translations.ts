export type Locale = 'en' | 'zh';

type TranslationKeys = {
  // Header
  'nav.dashboard': string;
  'nav.documents': string;
  'nav.explore': string;
  'nav.community': string;
  'nav.feedback': string;
  'nav.settings': string;
  'nav.signIn': string;
  'nav.signUp': string;
  'nav.signOut': string;
  'nav.profile': string;
  'nav.editProfile': string;
  'nav.friends': string;
  'nav.admin': string;
  'nav.shop': string;
  // Common
  'common.save': string;
  'common.cancel': string;
  'common.delete': string;
  'common.edit': string;
  'common.loading': string;
  'common.submit': string;
  'common.back': string;
  'common.confirm': string;
  'common.search': string;
  'common.noResults': string;
  // Profile
  'profile.editProfile': string;
  'profile.displayName': string;
  'profile.bio': string;
  'profile.avatar': string;
  'profile.avatarUpload': string;
  'profile.avatarHint': string;
  'profile.joined': string;
  'profile.posts': string;
  'profile.documents': string;
  'profile.publicCheats': string;
  // Personalization
  'personal.title': string;
  'personal.avatarFrame': string;
  'personal.wallpaper': string;
  'personal.tasks': string;
  'personal.unlocked': string;
  'personal.locked': string;
  'personal.progress': string;
  'personal.claimReward': string;
  'personal.ohbitBalance': string;
  'personal.buy': string;
  'personal.buyOhbit': string;
  'personal.ohbitPrice': string;
  'personal.taskReward': string;
  'personal.purchased': string;
  'personal.insufficientOhbit': string;
  'personal.taskUnlock': string;
  // Tasks
  'task.dailyLogin': string;
  'task.uploadDocument': string;
  'task.postQuestion': string;
  'task.receiveUpvote': string;
  'task.answerQuestion': string;
  // Settings
  'settings.language': string;
  'settings.theme': string;
  'settings.aiProviders': string;
  // Q&A
  'qa.askQuestion': string;
  'qa.writeAnswer': string;
  'qa.posting': string;
  'qa.report': string;
  'qa.reportPost': string;
  'qa.reportReason': string;
  'qa.answers': string;
  'qa.answer': string;
  'qa.markBest': string;
  'qa.backToForum': string;
  // Shop
  'shop.title': string;
  'shop.subtitle': string;
  'shop.frames': string;
  'shop.wallpapers': string;
  'shop.equipped': string;
  'shop.equip': string;
  'shop.viewRequirements': string;
  'shop.yourStats': string;
  'shop.progressToUnlock': string;
  // Sidebar
  'sidebar.collapse': string;
  'sidebar.expand': string;
  // Profile page
  'profile.publicCheatsTab': string;
  'profile.questionsTab': string;
  'profile.noCheats': string;
  'profile.noQuestions': string;
  'profile.docs': string;
  'profile.public': string;
  'profile.questionsCount': string;
  'profile.answers': string;
  'profile.score': string;
  'profile.loading': string;
  // Settings page
  'settings.title': string;
  'settings.description': string;
  'settings.defaultProvider': string;
  'settings.configured': string;
  'settings.noKey': string;
  'settings.baseUrl': string;
  'settings.model': string;
  'settings.apiKey': string;
  'settings.alreadySet': string;
  'settings.pasteKey': string;
  'settings.quickRecipes': string;
  'settings.saveAll': string;
  'settings.saved': string;
  // Dashboard
  'dashboard.title': string;
  'dashboard.description': string;
  'dashboard.recentDocs': string;
  'dashboard.communityFeed': string;
  'dashboard.myRooms': string;
  'dashboard.announcements': string;
  'dashboard.viewAll': string;
  'dashboard.noDocs': string;
  'dashboard.noPosts': string;
  'dashboard.noRooms': string;
  'dashboard.noAnnouncements': string;
  'dashboard.justNow': string;
  'dashboard.minutesAgo': string;
  'dashboard.hoursAgo': string;
  'dashboard.daysAgo': string;
  // Home / Documents
  'home.welcome': string;
  'home.description': string;
  'home.aiGeneration': string;
  'home.aiGenDesc': string;
  'home.smartReader': string;
  'home.smartReaderDesc': string;
  'home.collaborate': string;
  'home.collaborateDesc': string;
  'home.filesSelected': string;
  'home.clearAll': string;
  'home.uploading': string;
  'home.uploadFiles': string;
  'home.files': string;
  'home.fileSupport': string;
  'home.yourDocs': string;
  'home.noDocs': string;
  'home.browseCommunity': string;
  'home.deleteConfirm': string;
  'home.deleteTitle': string;
  // Explore
  'explore.title': string;
  'explore.description': string;
  'explore.newPost': string;
  'explore.search': string;
  'explore.noResults': string;
  'explore.noContent': string;
  'explore.post': string;
  'explore.comment': string;
  'explore.comments': string;
  'explore.createPost': string;
  'explore.titleLabel': string;
  'explore.body': string;
  'explore.tags': string;
  'explore.tagsPlaceholder': string;
  'explore.insertImage': string;
  'explore.imageHint': string;
  'explore.posting': string;
  'explore.postBtn': string;
  'explore.editPost': string;
  'explore.saving': string;
  'explore.deletePost': string;
  'explore.deleteConfirm': string;
  'explore.deleteAndAll': string;
  // Community
  'community.title': string;
  'community.description': string;
  'community.qaForum': string;
  'community.createRoom': string;
  'community.searchRooms': string;
  'community.yourRooms': string;
  'community.noRoomsJoined': string;
  'community.noMatchingRooms': string;
  'community.publicRooms': string;
  'community.noPublicRooms': string;
  'community.noMatchingPublic': string;
  'community.members': string;
  'community.role': string;
  'community.public': string;
  'community.private': string;
  'community.createStudyRoom': string;
  'community.roomName': string;
  'community.roomDesc': string;
  'community.roomPublic': string;
  'community.creating': string;
  'community.createBtn': string;
  'community.expiresIn': string;
  'community.hoursRemaining': string;
  'community.expired': string;
  // Groups
  'group.title': string;
  'group.description': string;
  'group.createGroup': string;
  'group.createBtn': string;
  'group.joinByCode': string;
  'group.inviteCode': string;
  'group.yourGroups': string;
  'group.publicGroups': string;
  'group.noGroups': string;
  'group.noPublicGroups': string;
  'group.members': string;
  'group.privacy': string;
  'group.public': string;
  'group.private': string;
  'group.chat': string;
  'group.announcements': string;
  'group members': string;
  'group.settings': string;
  'group.leave': string;
  'group.leaveConfirm': string;
  'group.join': string;
  'group.joined': string;
  'group.createAnnouncement': string;
  'group.editAnnouncement': string;
  'group.deleteAnnouncement': string;
  'group.announcementTitle': string;
  'group.announcementBody': string;
  'group.noAnnouncements': string;
  'group.noMessages': string;
  'group.sendMessage': string;
  'group.typeMessage': string;
  'group.uploadFile': string;
  'group.emoji': string;
  'group.pinned': string;
  'group.owner': string;
  'group.admin': string;
  'group.member': string;
  'group.removeMember': string;
  'group.transferOwnership': string;
  'group.groupName': string;
  'group.groupDesc': string;
  'group.groupPrivacy': string;
  'group.creating': string;
  'group.searchGroups': string;
  'group.joinGroup': string;
  'group.enterInviteCode': string;
  'group.expiresIn': string;
  'group.hoursRemaining': string;
  // Feedback
  'feedback.title': string;
  'feedback.description': string;
  'feedback.experience': string;
  'feedback.bugReport': string;
  'feedback.featureRequest': string;
  'feedback.other': string;
  'feedback.category': string;
  'feedback.titleLabel': string;
  'feedback.titlePlaceholder': string;
  'feedback.content': string;
  'feedback.contentPlaceholder': string;
  'feedback.submitting': string;
  'feedback.submitBtn': string;
  'feedback.success': string;
  'feedback.error': string;
  'feedback.networkError': string;
  // Countdown
  'countdown.title': string;
  'countdown.add': string;
  'countdown.noEvents': string;
  'countdown.eventTitle': string;
  'countdown.date': string;
  'countdown.color': string;
  'countdown.delete': string;
  'countdown.days': string;
};

const translations: Record<Locale, TranslationKeys> = {
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.documents': 'Documents',
    'nav.explore': 'Explore',
    'nav.community': 'Community',
    'nav.feedback': 'Feedback',
    'nav.settings': 'Settings',
    'nav.signIn': 'Sign in',
    'nav.signUp': 'Sign up',
    'nav.signOut': 'Sign out',
    'nav.profile': 'Profile',
    'nav.editProfile': 'Edit Profile',
    'nav.friends': 'Friends',
    'nav.admin': 'Admin Panel',
    'nav.shop': 'Shop',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.loading': 'Loading…',
    'common.submit': 'Submit',
    'common.back': 'Back',
    'common.confirm': 'Confirm',
    'common.search': 'Search',
    'common.noResults': 'No results found',
    'profile.editProfile': 'Edit Profile',
    'profile.displayName': 'Display Name',
    'profile.bio': 'Bio',
    'profile.avatar': 'Avatar',
    'profile.avatarUpload': 'Upload Avatar',
    'profile.avatarHint': 'Click to upload an image (JPEG, PNG, GIF, WebP)',
    'profile.joined': 'Joined',
    'profile.posts': 'posts',
    'profile.documents': 'documents',
    'profile.publicCheats': 'Public Cheatsheets',
    'personal.title': 'Personalization',
    'personal.avatarFrame': 'Avatar Frame',
    'personal.wallpaper': 'Profile Wallpaper',
    'personal.tasks': 'Tasks & Rewards',
    'personal.unlocked': 'Unlocked',
    'personal.locked': 'Locked',
    'personal.progress': 'Progress',
    'personal.claimReward': 'Claim Reward',
  'personal.ohbitBalance': 'Ohbit Balance',
  'personal.buy': 'Buy',
  'personal.buyOhbit': 'Buy with Ohbit',
  'personal.ohbitPrice': '{price} Ohbit',
  'personal.taskReward': 'Task Reward',
  'personal.purchased': 'Purchased',
  'personal.insufficientOhbit': 'Insufficient Ohbit',
  'personal.taskUnlock': 'Task Unlock',
    'task.dailyLogin': 'Daily Login',
    'task.uploadDocument': 'Upload Document',
    'task.postQuestion': 'Post a Question',
    'task.receiveUpvote': 'Receive Upvotes',
    'task.answerQuestion': 'Answer a Question',
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    'settings.aiProviders': 'AI Providers',
    'qa.askQuestion': 'Ask a question',
    'qa.writeAnswer': 'Write your answer (Markdown OK)…',
    'qa.posting': 'Posting…',
    'qa.report': 'Report',
    'qa.reportPost': 'Report this post',
    'qa.reportReason': 'Why is this post inappropriate?',
    'qa.answers': 'answers',
    'qa.answer': 'answer',
    'qa.markBest': 'Mark as best answer',
    'qa.backToForum': 'Back to forum',
    'shop.title': 'Shop',
    'shop.subtitle': 'Unlock avatar frames and profile wallpapers by completing tasks',
    'shop.frames': 'Avatar Frames',
    'shop.wallpapers': 'Profile Wallpapers',
    'shop.equipped': 'Equipped',
    'shop.equip': 'Equip',
    'shop.viewRequirements': 'Requirements',
    'shop.yourStats': 'Your Stats',
    'shop.progressToUnlock': 'Progress to unlock',
    'sidebar.collapse': 'Collapse',
    'sidebar.expand': 'Expand',
    'profile.publicCheatsTab': 'Public cheats',
    'profile.questionsTab': 'Questions',
    'profile.noCheats': 'No public cheatsheets yet.',
    'profile.noQuestions': 'No questions yet.',
    'profile.docs': 'docs',
    'profile.public': 'public',
    'profile.questionsCount': 'questions',
    'profile.answers': 'answers',
    'profile.score': 'score',
    'profile.loading': 'Loading…',
    'settings.title': 'AI Settings',
    'settings.description': 'Three providers are wired in. Pick a default and add an API key for each one you want to use. Keys are stored locally and never leave this machine.',
    'settings.defaultProvider': 'Default provider',
    'settings.configured': 'configured',
    'settings.noKey': 'no key yet',
    'settings.baseUrl': 'Base URL',
    'settings.model': 'Model',
    'settings.apiKey': 'API Key',
    'settings.alreadySet': 'already set, leave blank to keep',
    'settings.pasteKey': 'paste key here',
    'settings.quickRecipes': 'Quick recipes',
    'settings.saveAll': 'Save all settings',
    'settings.saved': 'Saved.',
    'dashboard.title': 'Dashboard',
    'dashboard.description': 'Your learning hub at a glance — documents, community, and upcoming events.',
    'dashboard.recentDocs': 'Recent Documents',
    'dashboard.communityFeed': 'Community Feed',
    'dashboard.myRooms': 'My Rooms',
    'dashboard.announcements': 'Announcements',
    'dashboard.viewAll': 'View all',
    'dashboard.noDocs': 'No documents yet.',
    'dashboard.noPosts': 'No posts yet.',
    'dashboard.noRooms': 'No rooms yet.',
    'dashboard.noAnnouncements': 'No announcements yet.',
    'dashboard.justNow': 'just now',
    'dashboard.minutesAgo': 'm ago',
    'dashboard.hoursAgo': 'h ago',
    'dashboard.daysAgo': 'd ago',
    // Home / Documents
    'home.welcome': 'Welcome to Otto-Hub',
    'home.description': 'Your AI-powered study assistant. Upload any document and turn it into cheatsheets, summaries, and practice questions.',
    'home.aiGeneration': 'AI Generation',
    'home.aiGenDesc': 'Cheatsheets, summaries, and practice questions',
    'home.smartReader': 'Smart Reader',
    'home.smartReaderDesc': 'Select text and ask Otter AI to explain',
    'home.collaborate': 'Collaborate',
    'home.collaborateDesc': 'Join study rooms and share knowledge',
    'home.filesSelected': 'file(s) selected',
    'home.clearAll': 'Clear all',
    'home.uploading': 'Uploading…',
    'home.uploadFiles': 'Upload',
    'home.files': 'file(s)',
    'home.fileSupport': 'Supports PDF, DOCX, PPTX, TXT, and Markdown files. You can select multiple files at once.',
    'home.yourDocs': 'Your documents',
    'home.noDocs': 'No documents yet. Upload one above to get started.',
    'home.browseCommunity': 'Browse community cheatsheets →',
    'home.deleteConfirm': 'Delete this document and all its generated content?',
    'home.deleteTitle': 'Delete',
    // Explore
    'explore.title': 'Explore',
    'explore.description': 'Public cheatsheets, summaries, and posts shared by the community.',
    'explore.newPost': 'New Post',
    'explore.search': 'Search by content, title, or author...',
    'explore.noResults': 'No results for',
    'explore.noContent': 'No public content yet.',
    'explore.post': 'post',
    'explore.comment': 'comment',
    'explore.comments': 'comments',
    'explore.createPost': 'Create a new post',
    'explore.titleLabel': 'Title',
    'explore.body': 'Body (Markdown OK)',
    'explore.tags': 'Tags (comma separated)',
    'explore.tagsPlaceholder': 'biology, photosynthesis',
    'explore.insertImage': 'Insert image',
    'explore.imageHint': 'Max 5MB, JPEG/PNG/GIF/WebP/SVG',
    'explore.posting': 'Posting…',
    'explore.postBtn': 'Post',
    'explore.editPost': 'Edit post',
    'explore.saving': 'Saving…',
    'explore.deletePost': 'Delete post?',
    'explore.deleteConfirm': 'This will permanently delete',
    'explore.deleteAndAll': 'and all its comments.',
    // Community
    'community.title': 'Community',
    'community.description': 'Study rooms for collaboration, plus the Q&A forum.',
    'community.qaForum': 'Q&A Forum',
    'community.createRoom': 'Create room',
    'community.searchRooms': 'Search rooms by name...',
    'community.yourRooms': 'Your rooms',
    'community.noRoomsJoined': "You haven't joined any rooms yet. Create one or join via an invite code.",
    'community.noMatchingRooms': 'No matching rooms',
    'community.publicRooms': 'Public rooms you can join',
    'community.noPublicRooms': 'No public rooms right now.',
    'community.noMatchingPublic': 'No matching public rooms',
    'community.members': 'members',
    'community.role': 'role',
    'community.public': 'public',
    'community.private': 'private',
    'community.createStudyRoom': 'Create a study room',
    'community.roomName': 'Name',
    'community.roomDesc': 'Description (optional)',
    'community.roomPublic': 'Public — anyone can see and request to join',
    'community.creating': 'Creating…',
    'community.createBtn': 'Create',
    'community.expiresIn': 'Expires in',
    'community.hoursRemaining': 'hours',
    'community.expired': 'This room has expired',
    // Groups
    'group.title': 'Groups',
    'group.description': 'Persistent chat rooms for ongoing discussions',
    'group.createGroup': 'Create Group',
    'group.createBtn': 'Create',
    'group.joinByCode': 'Join by Code',
    'group.inviteCode': 'Invite Code',
    'group.yourGroups': 'Your Groups',
    'group.publicGroups': 'Public Groups',
    'group.noGroups': "You haven't joined any groups yet",
    'group.noPublicGroups': 'No public groups available',
    'group.members': 'members',
    'group.privacy': 'Privacy',
    'group.public': 'Public',
    'group.private': 'Private',
    'group.chat': 'Chat',
    'group.announcements': 'Announcements',
    'group members': 'Members',
    'group.settings': 'Settings',
    'group.leave': 'Leave Group',
    'group.leaveConfirm': 'Are you sure you want to leave this group?',
    'group.join': 'Join',
    'group.joined': 'Joined',
    'group.createAnnouncement': 'New Announcement',
    'group.editAnnouncement': 'Edit Announcement',
    'group.deleteAnnouncement': 'Delete Announcement',
    'group.announcementTitle': 'Title',
    'group.announcementBody': 'Content',
    'group.noAnnouncements': 'No announcements yet',
    'group.noMessages': 'No messages yet. Start the conversation!',
    'group.sendMessage': 'Send',
    'group.typeMessage': 'Type a message...',
    'group.uploadFile': 'Upload File',
    'group.emoji': 'Emoji',
    'group.pinned': 'Pinned',
    'group.owner': 'Owner',
    'group.admin': 'Admin',
    'group.member': 'Member',
    'group.removeMember': 'Remove',
    'group.transferOwnership': 'Transfer Ownership',
    'group.groupName': 'Group Name',
    'group.groupDesc': 'Description',
    'group.groupPrivacy': 'Privacy',
    'group.creating': 'Creating...',
    'group.searchGroups': 'Search groups...',
    'group.joinGroup': 'Join Group',
    'group.enterInviteCode': 'Enter invite code',
    'group.expiresIn': 'Expires in',
    'group.hoursRemaining': 'hours',
    // Feedback
    'feedback.title': 'Feedback & Suggestions',
    'feedback.description': 'Help us improve Otto-Hub',
    'feedback.experience': 'Experience',
    'feedback.bugReport': 'Bug Report',
    'feedback.featureRequest': 'Feature Request',
    'feedback.other': 'Other',
    'feedback.category': 'Category',
    'feedback.titleLabel': 'Title',
    'feedback.titlePlaceholder': 'Briefly describe your feedback',
    'feedback.content': 'Content',
    'feedback.contentPlaceholder': 'Tell us what happened, what you would like to see, or how we can improve...',
    'feedback.submitting': 'Submitting…',
    'feedback.submitBtn': 'Submit',
    'feedback.success': 'Thanks! Your feedback has been submitted.',
    'feedback.error': 'Something went wrong. Please try again.',
    'feedback.networkError': 'Network error. Please try again.',
    // Countdown
    'countdown.title': 'Days Countdown',
    'countdown.add': 'Add',
    'countdown.noEvents': 'No events yet. Add an exam or deadline to see the countdown.',
    'countdown.eventTitle': 'Event title',
    'countdown.date': 'Date',
    'countdown.color': 'Color',
    'countdown.delete': 'Delete',
    'countdown.days': 'days',
  },
  zh: {
    'nav.dashboard': '仪表盘',
    'nav.documents': '文档',
    'nav.explore': '探索',
    'nav.community': '社区',
    'nav.feedback': '反馈',
    'nav.settings': '设置',
    'nav.signIn': '登录',
    'nav.signUp': '注册',
    'nav.signOut': '退出',
    'nav.profile': '个人资料',
    'nav.editProfile': '编辑资料',
    'nav.friends': '好友',
    'nav.admin': '管理面板',
    'nav.shop': '商店',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.loading': '加载中…',
    'common.submit': '提交',
    'common.back': '返回',
    'common.confirm': '确认',
    'common.search': '搜索',
    'common.noResults': '未找到结果',
    'profile.editProfile': '编辑个人资料',
    'profile.displayName': '显示名称',
    'profile.bio': '个人简介',
    'profile.avatar': '头像',
    'profile.avatarUpload': '上传头像',
    'profile.avatarHint': '点击上传图片（支持 JPEG、PNG、GIF、WebP）',
    'profile.joined': '加入于',
    'profile.posts': '帖子',
    'profile.documents': '文档',
    'profile.publicCheats': '公开笔记',
    'personal.title': '个性化',
    'personal.avatarFrame': '头像边框',
    'personal.wallpaper': '个人主页背景',
    'personal.tasks': '任务与奖励',
    'personal.unlocked': '已解锁',
    'personal.locked': '未解锁',
    'personal.progress': '进度',
    'personal.claimReward': '领取奖励',
  'personal.ohbitBalance': 'Ohbit 余额',
  'personal.buy': '购买',
  'personal.buyOhbit': '用 Ohbit 购买',
  'personal.ohbitPrice': '{price} Ohbit',
  'personal.taskReward': '任务奖励',
  'personal.purchased': '已购买',
  'personal.insufficientOhbit': 'Ohbit 余额不足',
  'personal.taskUnlock': '任务解锁',
    'task.dailyLogin': '每日登录',
    'task.uploadDocument': '上传文档',
    'task.postQuestion': '发布问题',
    'task.receiveUpvote': '获得点赞',
    'task.answerQuestion': '回答问题',
    'settings.language': '语言',
    'settings.theme': '主题',
    'settings.aiProviders': 'AI 服务商',
    'qa.askQuestion': '提问',
    'qa.writeAnswer': '写下你的回答（支持 Markdown）…',
    'qa.posting': '发布中…',
    'qa.report': '举报',
    'qa.reportPost': '举报此帖子',
    'qa.reportReason': '为什么此帖子不合适？',
    'qa.answers': '个回答',
    'qa.answer': '个回答',
    'qa.markBest': '标记为最佳回答',
    'qa.backToForum': '返回论坛',
    'shop.title': '商店',
    'shop.subtitle': '完成任务解锁头像边框和个人主页背景',
    'shop.frames': '头像边框',
    'shop.wallpapers': '个人主页背景',
    'shop.equipped': '已装备',
    'shop.equip': '装备',
    'shop.viewRequirements': '解锁条件',
    'shop.yourStats': '你的统计',
    'shop.progressToUnlock': '解锁进度',
    'sidebar.collapse': '收起',
    'sidebar.expand': '展开',
    'profile.publicCheatsTab': '公开笔记',
    'profile.questionsTab': '问题',
    'profile.noCheats': '暂无公开笔记。',
    'profile.noQuestions': '暂无问题。',
    'profile.docs': '文档',
    'profile.public': '公开',
    'profile.questionsCount': '问题',
    'profile.answers': '回答',
    'profile.score': '评分',
    'profile.loading': '加载中…',
    'settings.title': 'AI 设置',
    'settings.description': '已接入三个服务商。选择默认服务商并添加 API 密钥。密钥仅存储在本地，不会外传。',
    'settings.defaultProvider': '默认服务商',
    'settings.configured': '已配置',
    'settings.noKey': '未配置密钥',
    'settings.baseUrl': 'Base URL',
    'settings.model': '模型',
    'settings.apiKey': 'API 密钥',
    'settings.alreadySet': '已设置，留空保持不变',
    'settings.pasteKey': '粘贴密钥',
    'settings.quickRecipes': '快速配置',
    'settings.saveAll': '保存所有设置',
    'settings.saved': '已保存。',
    'dashboard.title': '仪表盘',
    'dashboard.description': '你的学习中心概览 — 文档、社区和近期活动。',
    'dashboard.recentDocs': '最近文档',
    'dashboard.communityFeed': '社区动态',
    'dashboard.myRooms': '我的房间',
    'dashboard.announcements': '公告',
    'dashboard.viewAll': '查看全部',
    'dashboard.noDocs': '暂无文档。',
    'dashboard.noPosts': '暂无帖子。',
    'dashboard.noRooms': '暂无房间。',
    'dashboard.noAnnouncements': '暂无公告。',
    'dashboard.justNow': '刚刚',
    'dashboard.minutesAgo': '分钟前',
    'dashboard.hoursAgo': '小时前',
    'dashboard.daysAgo': '天前',
    // Home / Documents
    'home.welcome': '欢迎使用 Otto-Hub',
    'home.description': '你的 AI 学习助手。上传任何文档，将其变成速查表、摘要和练习题。',
    'home.aiGeneration': 'AI 生成',
    'home.aiGenDesc': '速查表、摘要和练习题',
    'home.smartReader': '智能阅读器',
    'home.smartReaderDesc': '选中文本，让 Otter AI 解释',
    'home.collaborate': '协作',
    'home.collaborateDesc': '加入学习房间，分享知识',
    'home.filesSelected': '个文件已选择',
    'home.clearAll': '清除全部',
    'home.uploading': '上传中…',
    'home.uploadFiles': '上传',
    'home.files': '个文件',
    'home.fileSupport': '支持 PDF、DOCX、PPTX、TXT 和 Markdown 文件，可同时选择多个文件。',
    'home.yourDocs': '你的文档',
    'home.noDocs': '暂无文档。上传一个开始使用。',
    'home.browseCommunity': '浏览社区笔记 →',
    'home.deleteConfirm': '确定删除此文档及其所有生成内容？',
    'home.deleteTitle': '删除',
    // Explore
    'explore.title': '探索',
    'explore.description': '社区共享的公开笔记、摘要和帖子。',
    'explore.newPost': '新帖子',
    'explore.search': '按内容、标题或作者搜索...',
    'explore.noResults': '未找到结果',
    'explore.noContent': '暂无公开内容。',
    'explore.post': '帖子',
    'explore.comment': '评论',
    'explore.comments': '评论',
    'explore.createPost': '创建新帖子',
    'explore.titleLabel': '标题',
    'explore.body': '内容（支持 Markdown）',
    'explore.tags': '标签（逗号分隔）',
    'explore.tagsPlaceholder': '生物, 光合作用',
    'explore.insertImage': '插入图片',
    'explore.imageHint': '最大 5MB，JPEG/PNG/GIF/WebP/SVG',
    'explore.posting': '发布中…',
    'explore.postBtn': '发布',
    'explore.editPost': '编辑帖子',
    'explore.saving': '保存中…',
    'explore.deletePost': '删除帖子？',
    'explore.deleteConfirm': '将永久删除',
    'explore.deleteAndAll': '及其所有评论。',
    // Community
    'community.title': '社区',
    'community.description': '协作学习房间和问答论坛。',
    'community.qaForum': '问答论坛',
    'community.createRoom': '创建房间',
    'community.searchRooms': '按名称搜索房间...',
    'community.yourRooms': '你的房间',
    'community.noRoomsJoined': '你还没有加入任何房间。创建一个或通过邀请码加入。',
    'community.noMatchingRooms': '没有匹配的房间',
    'community.publicRooms': '可以加入的公开房间',
    'community.noPublicRooms': '暂无公开房间。',
    'community.noMatchingPublic': '没有匹配的公开房间',
    'community.members': '成员',
    'community.role': '角色',
    'community.public': '公开',
    'community.private': '私有',
    'community.createStudyRoom': '创建学习房间',
    'community.roomName': '名称',
    'community.roomDesc': '描述（可选）',
    'community.roomPublic': '公开 — 任何人可以查看并申请加入',
    'community.creating': '创建中…',
    'community.createBtn': '创建',
    'community.expiresIn': '剩余时间',
    'community.hoursRemaining': '小时',
    'community.expired': '此房间已过期',
    // Groups
    'group.title': '群组',
    'group.description': '用于持续讨论的永久聊天室',
    'group.createGroup': '创建群组',
    'group.createBtn': '创建',
    'group.joinByCode': '通过邀请码加入',
    'group.inviteCode': '邀请码',
    'group.yourGroups': '我的群组',
    'group.publicGroups': '公开群组',
    'group.noGroups': '你还没有加入任何群组',
    'group.noPublicGroups': '暂无公开群组',
    'group.members': '成员',
    'group.privacy': '隐私',
    'group.public': '公开',
    'group.private': '私密',
    'group.chat': '聊天',
    'group.announcements': '公告',
    'group members': '成员',
    'group.settings': '设置',
    'group.leave': '退出群组',
    'group.leaveConfirm': '确定要退出这个群组吗？',
    'group.join': '加入',
    'group.joined': '已加入',
    'group.createAnnouncement': '发布公告',
    'group.editAnnouncement': '编辑公告',
    'group.deleteAnnouncement': '删除公告',
    'group.announcementTitle': '标题',
    'group.announcementBody': '内容',
    'group.noAnnouncements': '暂无公告',
    'group.noMessages': '暂无消息，开始对话吧！',
    'group.sendMessage': '发送',
    'group.typeMessage': '输入消息...',
    'group.uploadFile': '上传文件',
    'group.emoji': '表情',
    'group.pinned': '置顶',
    'group.owner': '群主',
    'group.admin': '管理员',
    'group.member': '成员',
    'group.removeMember': '移除',
    'group.transferOwnership': '转让群主',
    'group.groupName': '群组名称',
    'group.groupDesc': '描述',
    'group.groupPrivacy': '隐私设置',
    'group.creating': '创建中...',
    'group.searchGroups': '搜索群组...',
    'group.joinGroup': '加入群组',
    'group.enterInviteCode': '输入邀请码',
    'group.expiresIn': '剩余时间',
    'group.hoursRemaining': '小时',
    // Feedback
    'feedback.title': '反馈与建议',
    'feedback.description': '帮助我们改进 Otto-Hub',
    'feedback.experience': '体验',
    'feedback.bugReport': '问题报告',
    'feedback.featureRequest': '功能建议',
    'feedback.other': '其他',
    'feedback.category': '分类',
    'feedback.titleLabel': '标题',
    'feedback.titlePlaceholder': '简要描述你的反馈',
    'feedback.content': '内容',
    'feedback.contentPlaceholder': '告诉我们发生了什么、你希望看到什么，或者我们可以如何改进...',
    'feedback.submitting': '提交中…',
    'feedback.submitBtn': '提交',
    'feedback.success': '谢谢！你的反馈已提交。',
    'feedback.error': '出了点问题，请重试。',
    'feedback.networkError': '网络错误，请重试。',
    // Countdown
    'countdown.title': '倒计时',
    'countdown.add': '添加',
    'countdown.noEvents': '暂无事件。添加考试或截止日期查看倒计时。',
    'countdown.eventTitle': '事件标题',
    'countdown.date': '日期',
    'countdown.color': '颜色',
    'countdown.delete': '删除',
    'countdown.days': '天',
  },
};

export function t(locale: Locale, key: keyof TranslationKeys): string {
  return translations[locale][key] || translations.en[key] || key;
}

export type { TranslationKeys };