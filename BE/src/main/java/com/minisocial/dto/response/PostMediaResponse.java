package com.minisocial.dto.response;

import com.minisocial.entity.PostMedia;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PostMediaResponse {
    private Long id;
    private String mediaUrl;
    private PostMedia.MediaType mediaType;
    private int position;
}
