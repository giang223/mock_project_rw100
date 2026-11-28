const genderLabels = { MALE: "Nam", FEMALE: "Nữ", OTHER: "Khác" };

export function toUserView(user) {
  if (!user) return null;
  return {
    ...user,
    id: user.id,
    name: user.fullName || user.username || "Người dùng",
    fullName: user.fullName || user.username || "Người dùng",
    avatar: user.avatarUrl || user.avatar || "",
    cover: user.coverUrl || user.cover || "",
    gender: genderLabels[user.gender] || user.gender || "",
    isPrivate: Boolean(user.isPrivate),
  };
}

export function toPostView(post, currentUserId) {
  if (!post) return null;
  const author = toUserView(post.author);
  const media = Array.isArray(post.media) ? post.media : [];
  const images = media
    .filter((item) => item.mediaType === "IMAGE")
    .map((item) => item.mediaUrl)
    .filter(Boolean);
  const videos = media
    .filter((item) => item.mediaType === "VIDEO")
    .map((item) => item.mediaUrl)
    .filter(Boolean);
  const originalPost = post.sharedFromPost
    ? toPostView(post.sharedFromPost, currentUserId)
    : null;
  const privacy = { PUBLIC: "public", FRIENDS: "friends", PRIVATE: "private" }[post.visibility] || "public";

  return {
    ...post,
    authorId: author?.id,
    author: author?.fullName || "Người dùng",
    authorProfile: author,
    avatar: author?.avatar || "",
    images,
    videos,
    image: images[0] || "",
    isMine: String(author?.id) === String(currentUserId),
    isShared: Boolean(post.isShared),
    originalPost,
    privacy,
    liked: Boolean(post.liked),
    saved: Boolean(post.saved),
    likeCount: Number(post.likeCount || 0),
    comments: [],
  };
}

export function toCommentView(comment) {
  if (!comment) return null;
  const author = toUserView(comment.author);
  return {
    ...comment,
    authorId: author?.id,
    author: author?.fullName || "Người dùng",
    authorProfile: author,
    avatar: author?.avatar || "",
    username: author?.username || "",
    replyCount: Number(comment.replyCount || 0),
  };
}

export function toStoryView(story, currentUserId) {
  if (!story) return null;
  const author = toUserView(story.author);
  const viewedByCurrentUser = Boolean(story.viewedByCurrentUser || story.viewed);
  return {
    ...story,
    authorId: author?.id,
    authorProfile: author,
    author: author?.fullName || "Người dùng",
    name: String(author?.id) === String(currentUserId) ? "Bạn" : author?.fullName,
    avatar: author?.avatar || "",
    text: story.content || "",
    media: story.mediaUrl || "",
    mediaType: story.mediaType === "VIDEO" ? "video/*" : story.mediaType === "IMAGE" ? "image/*" : "",
    privacy: { PUBLIC: "public", FRIENDS: "friends", PRIVATE: "private" }[story.visibility] || "public",
    viewedBy: viewedByCurrentUser ? [currentUserId] : [],
  };
}

const notificationTypes = {
  LIKE: "like",
  COMMENT: "comment",
  SHARE: "share",
  FOLLOW: "follow",
  FOLLOW_REQUEST: "friend_request",
  FOLLOW_REQUEST_ACCEPTED: "friend_accepted",
  FRIEND_REQUEST: "friend_request",
  FRIEND_ACCEPTED: "friend_accepted",
  POST_LIKE: "like",
  POST_COMMENT: "comment",
  POST_SHARE: "share",
  MESSAGE: "message",
  ADMIN_WARNING: "system",
  MENTION: "mention",
};

export function toNotificationView(item) {
  const sender = toUserView(item?.sender);
  return {
    ...item,
    senderId: sender?.id,
    name: sender?.fullName || "MiniSocial",
    username: sender?.username || "",
    avatar: sender?.avatar || "",
    type: notificationTypes[item?.type] || String(item?.type || "other").toLowerCase(),
    read: Boolean(item?.isRead),
    time: item?.createdAt,
  };
}

export function toFriendView(item, direction) {
  const user = toUserView(item?.user || item?.requester || item);
  if (!user) return null;
  return {
    ...user,
    userId: user.id,
    friendshipId: item.id,
    name: user.fullName,
    avatar: user.avatar,
    status: direction || String(item.status || "").toLowerCase(),
    mutualFriends: Number(item.mutualFriendCount || user.mutualFriendCount || 0),
    createdAt: item.createdAt || item.requestedAt,
  };
}

export function toMessageView(message, currentUserId, otherUserId) {
  const sender = toUserView(message?.sender);
  const date = message?.createdAt ? new Date(message.createdAt) : null;
  const time = date && !Number.isNaN(date.getTime())
    ? date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : message?.createdAt;
  return {
    ...message,
    senderId: sender?.id,
    receiverId: String(sender?.id) === String(currentUserId) ? otherUserId : currentUserId,
    text: message?.content || "",
    image: message?.mediaType === "IMAGE" ? message.mediaUrl : "",
    video: message?.mediaType === "VIDEO" ? message.mediaUrl : "",
    createdAt: message?.createdAt,
    time,
    isRead: Boolean(message?.readAt),
  };
}
