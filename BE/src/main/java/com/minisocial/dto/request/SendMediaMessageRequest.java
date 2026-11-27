package com.minisocial.dto.request;

import com.minisocial.entity.DirectMessage;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Positive;
import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

@Data
public class SendMediaMessageRequest {

    @Size(max = 5000, message = "Tin nhắn tối đa 5000 ký tự")
    private String content;

    @Positive(message = "Tin nhắn được trích dẫn không hợp lệ")
    private Long replyToMessageId;

    @NotNull(message = "Loại media không hợp lệ")
    private DirectMessage.MediaType mediaType;

    @NotNull(message = "File không được để trống")
    private MultipartFile file;
}
