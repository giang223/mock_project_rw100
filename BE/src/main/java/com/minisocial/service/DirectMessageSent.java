package com.minisocial.service;

import com.minisocial.dto.response.DirectMessageResponse;

public record DirectMessageSent(Long conversationId, Long recipientUserId, DirectMessageResponse message) { }
