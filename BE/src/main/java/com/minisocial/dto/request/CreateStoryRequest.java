package com.minisocial.dto.request;

import com.minisocial.entity.Post;
import com.minisocial.entity.Story;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateStoryRequest {

    @Size(max = 2000, message = "Nội dung Story tối đa 2000 ký tự")
    private String content;

    @Size(max = 500, message = "Đường dẫn media tối đa 500 ký tự")
    private String mediaUrl;

    private Story.MediaType mediaType;

    @NotNull(message = "Quyền riêng tư không hợp lệ")
    private Post.Visibility visibility = Post.Visibility.PUBLIC;
}
