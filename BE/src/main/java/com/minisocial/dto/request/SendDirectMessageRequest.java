package com.minisocial.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class SendDirectMessageRequest {

    @NotBlank(message = "Nội dung tin nhắn không được để trống")
    @Size(max = 5000, message = "Tin nhắn tối đa 5000 ký tự")
    private String content;

    @Positive(message = "Tin nhắn được trích dẫn không hợp lệ")
    private Long replyToMessageId;
}
