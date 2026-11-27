package com.minisocial.dto.response;

public record DirectMessageTypingResponse(Long conversationId, Long userId, boolean typing) { }
