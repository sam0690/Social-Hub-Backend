import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PostsService } from '../services/posts.service';
import { CreatePostDto } from '../dto/create-post.dto';
import { UpdatePostDto } from '../dto/update-post.dto';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { GetPostsDto } from '../dto/get-posts.dto';
import { ApiAuthEndpoint } from '../../../common/decorators/swagger.decorators';

type AuthRequest<TUser = { id: string }> = Request & {
  user: TUser;
};

@ApiTags('Posts')
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class PostsController {
  constructor(private postsService: PostsService) {}

  // ── Posts ──────────────────────────────────────────────
  @Post('posts')
  @ApiAuthEndpoint('Create a post', {
    created: 'Post created successfully',
  })
  createPost(@Body() dto: CreatePostDto, @Req() req: AuthRequest) {
    return this.postsService.createPost(req.user.id, dto);
  }

  @Get('posts/:postId')
  @ApiAuthEndpoint('Get a post by id', {
    ok: 'Post data',
    notFound: 'Post not found',
  })
  getPost(@Param('postId') postId: string, @Req() req: AuthRequest) {
    return this.postsService.getPost(postId, req.user.id);
  }

  @Get('posts/:postId/likes')
  @ApiAuthEndpoint('Get users who liked a post', {
    ok: 'Paginated list of users',
  })
  getPostLikes(@Param('postId') postId: string, @Query() dto: GetPostsDto) {
    return this.postsService.getPostLikes(postId, dto);
  }

  @Get('users/:username/posts')
  @ApiAuthEndpoint('Get posts by username', { ok: 'Paginated posts' })
  getUserPosts(
    @Param('username') username: string,
    @Query() dto: GetPostsDto,
    @Req() req: AuthRequest,
  ) {
    return this.postsService.getUserPosts(username, req.user.id, dto);
  }

  @Patch('posts/:postId')
  @ApiAuthEndpoint('Update a post', {
    ok: 'Post updated',
    notFound: 'Post not found',
    forbidden: 'Not your post',
  })
  updatePost(
    @Param('postId') postId: string,
    @Body() dto: UpdatePostDto,
    @Req() req: AuthRequest,
  ) {
    return this.postsService.updatePost(postId, req.user.id, dto);
  }

  @Delete('posts/:postId')
  @HttpCode(HttpStatus.OK)
  @ApiAuthEndpoint('Delete a post', {
    ok: 'Post deleted',
    notFound: 'Post not found',
    forbidden: 'Not your post',
  })
  deletePost(@Param('postId') postId: string, @Req() req: AuthRequest) {
    return this.postsService.deletePost(postId, req.user.id);
  }

  // ── Likes ──────────────────────────────────────────────
  @Post('posts/:postId/like')
  @HttpCode(HttpStatus.OK)
  @ApiAuthEndpoint('Like a post', {
    ok: 'Post liked',
    notFound: 'Post not found',
  })
  likePost(@Param('postId') postId: string, @Req() req: AuthRequest) {
    return this.postsService.likePost(req.user.id, postId);
  }

  @Delete('posts/:postId/like')
  @HttpCode(HttpStatus.OK)
  @ApiAuthEndpoint('Unlike a post', {
    ok: 'Post unliked',
    notFound: 'Post not found',
  })
  unlikePost(@Param('postId') postId: string, @Req() req: AuthRequest) {
    return this.postsService.unlikePost(req.user.id, postId);
  }

  @Post('comments/:commentId/like')
  @HttpCode(HttpStatus.OK)
  @ApiAuthEndpoint('Like a comment', {
    ok: 'Comment liked',
    notFound: 'Comment not found',
  })
  likeComment(@Param('commentId') commentId: string, @Req() req: AuthRequest) {
    return this.postsService.likeComment(req.user.id, commentId);
  }

  @Delete('comments/:commentId/like')
  @HttpCode(HttpStatus.OK)
  @ApiAuthEndpoint('Unlike a comment', { ok: 'Comment unliked' })
  unlikeComment(
    @Param('commentId') commentId: string,
    @Req() req: AuthRequest,
  ) {
    return this.postsService.unlikeComment(req.user.id, commentId);
  }

  // ── Comments ───────────────────────────────────────────
  @Post('posts/:postId/comments')
  @ApiAuthEndpoint('Create a comment', {
    created: 'Comment created',
    notFound: 'Post not found',
  })
  createComment(
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
    @Req() req: AuthRequest,
  ) {
    return this.postsService.createComment(req.user.id, postId, dto);
  }

  @Get('posts/:postId/comments')
  @ApiAuthEndpoint('Get comments on a post', { ok: 'Paginated comments' })
  getPostComments(@Param('postId') postId: string, @Query() dto: GetPostsDto) {
    return this.postsService.getPostComments(postId, dto);
  }

  @Get('comments/:commentId/replies')
  @ApiAuthEndpoint('Get replies to a comment', { ok: 'Paginated replies' })
  getCommentReplies(
    @Param('commentId') commentId: string,
    @Query() dto: GetPostsDto,
  ) {
    return this.postsService.getCommentReplies(commentId, dto);
  }

  @Delete('comments/:commentId')
  @HttpCode(HttpStatus.OK)
  @ApiAuthEndpoint('Delete a comment', {
    ok: 'Comment deleted',
    notFound: 'Comment not found',
    forbidden: 'Not your comment',
  })
  deleteComment(
    @Param('commentId') commentId: string,
    @Req() req: AuthRequest,
  ) {
    return this.postsService.deleteComment(commentId, req.user.id);
  }

  // ── Bookmarks ──────────────────────────────────────────
  @Post('posts/:postId/bookmark')
  @HttpCode(HttpStatus.OK)
  @ApiAuthEndpoint('Bookmark a post', {
    ok: 'Post bookmarked',
    notFound: 'Post not found',
  })
  bookmarkPost(@Param('postId') postId: string, @Req() req: AuthRequest) {
    return this.postsService.bookmarkPost(req.user.id, postId);
  }

  @Delete('posts/:postId/bookmark')
  @HttpCode(HttpStatus.OK)
  @ApiAuthEndpoint('Remove bookmark', { ok: 'Bookmark removed' })
  unbookmarkPost(@Param('postId') postId: string, @Req() req: AuthRequest) {
    return this.postsService.unbookmarkPost(req.user.id, postId);
  }

  @Get('me/bookmarks')
  @ApiAuthEndpoint('Get my bookmarks', { ok: 'Paginated bookmarks' })
  getUserBookmarks(@Query() dto: GetPostsDto, @Req() req: AuthRequest) {
    return this.postsService.getUserBookmarks(req.user.id, dto);
  }

  @Get('hashtags/:hashtagName/posts')
  @ApiAuthEndpoint('Get posts by hashtag', { ok: 'Paginated posts' })
  getPostsByHashtag(
    @Param('hashtagName') hashtagName: string,
    @Query() dto: GetPostsDto,
  ) {
    return this.postsService.getPostsByHashtag(hashtagName, dto);
  }
}
