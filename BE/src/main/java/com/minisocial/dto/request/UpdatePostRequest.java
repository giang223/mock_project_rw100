package com.minisocial.dto.request;

import com.minisocial.entity.Post;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdatePostRequest {

    @Size(max = 5000, message = "Nội dung tối đa 5000 ký tự")
    private String content;

    @Size(max = 80, message = "Cảm xúc tối đa 80 ký tự")
    private String feeling;

    private Post.Visibility visibility;
}
