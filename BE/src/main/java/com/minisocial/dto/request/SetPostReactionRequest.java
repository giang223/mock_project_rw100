package com.minisocial.dto.request;

import com.minisocial.entity.PostLike;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SetPostReactionRequest {

    @NotNull(message = "Cảm xúc không hợp lệ")
    private PostLike.ReactionType reactionType;
}
