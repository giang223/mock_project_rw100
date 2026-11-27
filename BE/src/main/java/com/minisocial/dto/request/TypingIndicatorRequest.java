package com.minisocial.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TypingIndicatorRequest {

    @NotNull(message = "Trạng thái đang nhập không hợp lệ")
    private Boolean typing;
}
