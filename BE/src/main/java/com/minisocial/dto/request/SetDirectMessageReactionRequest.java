package com.minisocial.dto.request;

import com.minisocial.entity.DirectMessageReaction;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SetDirectMessageReactionRequest {

    @NotNull(message = "Cảm xúc không hợp lệ")
    private DirectMessageReaction.Type reactionType;
}
