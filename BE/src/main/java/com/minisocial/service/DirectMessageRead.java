package com.minisocial.service;

import java.time.LocalDateTime;

public record DirectMessageRead(Long conversationId, Long readerUserId, Long recipientUserId,
                                LocalDateTime readAt) { }
