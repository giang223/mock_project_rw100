package com.minisocial.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateConversationNicknameRequest {

    @Size(max = 100, message = "Biệt danh tối đa 100 ký tự")
    private String nickname;
}
