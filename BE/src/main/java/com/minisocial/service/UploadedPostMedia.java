package com.minisocial.service;

import com.minisocial.entity.PostMedia;

public record UploadedPostMedia(String mediaUrl, PostMedia.MediaType mediaType) { }
