package com.minisocial.dto.request;

import com.minisocial.entity.Post;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreatePostRequest {

    @Size(max = 5000, message = "Nội dung tối đa 5000 ký tự")
    private String content;

    @Size(max = 80, message = "Cảm xúc tối đa 80 ký tự")
    private String feeling;

    // imageUrl will be set by service after Cloudinary upload
    @Size(max = 500, message = "Đường dẫn ảnh tối đa 500 ký tự")
    private String imageUrl;

    @NotNull(message = "Quyền riêng tư không hợp lệ")
    private Post.Visibility visibility = Post.Visibility.PUBLIC;

    private Long sharedFromPostId;
}
