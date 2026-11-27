package com.minisocial.service;

public record DirectMessageTyping(Long conversationId, Long senderUserId, Long recipientUserId, boolean typing) { }
