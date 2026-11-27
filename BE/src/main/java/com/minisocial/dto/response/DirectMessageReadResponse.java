package com.minisocial.dto.response;

import java.time.LocalDateTime;

public record DirectMessageReadResponse(Long conversationId, Long readerUserId, LocalDateTime readAt) { }
