import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PostsRepository } from '../repositories/posts.repository';
import { UsersRepository } from '../../users/repositories/users.repository';
import { FeedService } from '../../feed/services/feed.service';
import { CreatePostDto } from '../dto/create-post.dto';
import { UpdatePostDto } from '../dto/update-post.dto';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { GetPostsDto } from '../dto/get-posts.dto';
import { NotificationsService } from '../../notifications/services/notifications.service';

@Injectable()
export class PostsService {
  constructor(
    private postsRepository: PostsRepository,
    private usersRepository: UsersRepository,
    private feedService: FeedService,
    private notificationsService: NotificationsService,
  ) { }

  // ── Helpers ────────────────────────────────────────────
  private extractHashtags(content: string): string[] {
    const matches = content.match(/#[a-zA-Z0-9_]+/g) ?? [];
    return [
      ...new Set(matches.map((tag: string) => tag.slice(1).toLowerCase())),
    ];
  }

  private extractMentions(content: string): string[] {
    const matches = content.match(/@[a-zA-Z0-9_]+/g) ?? [];
    return [
      ...new Set(
        matches.map((mention: string) => mention.slice(1).toLowerCase()),
      ),
    ];
  }

  private buildPaginatedResponse<T>(
    items: T[],
    limit: number,
    encodeCursor: (item: T) => string,
  ) {
    const hasMore = items.length === limit;
    const nextCursor = hasMore ? encodeCursor(items[items.length - 1]) : null;
    return { data: items, nextCursor, hasMore };
  }

  // ── Posts ──────────────────────────────────────────────
  async createPost(userId: string, dto: CreatePostDto) {
    const post = await this.postsRepository.createPost({
      authorId: userId,
      content: dto.content,
      visibility: dto.visibility ?? 'PUBLIC',
    });

    // process hashtags
    const hashtags = this.extractHashtags(dto.content);
    for (const tag of hashtags) {
      const hashtag = await this.postsRepository.upsertHashtag(tag);
      await this.postsRepository.linkHashtagToPost(post.id, hashtag.id);
    }

    // process mentions
    const mentionedUsernames = this.extractMentions(dto.content);
    for (const username of mentionedUsernames) {
      const mentionedUser = await this.usersRepository.findByUsername(username);
      if (mentionedUser) {
        await this.postsRepository.createMention(post.id, mentionedUser.id);
      }
    }

    for (const username of mentionedUsernames) {
      const mentionedUser = await this.usersRepository.findByUsername(username);
      if (mentionedUser) {
        await this.postsRepository.createMention(post.id, mentionedUser.id);
        await this.notificationsService.notifyMention(userId, mentionedUser.id, post.id);
      }
    }
    // fan-out post to followers' inboxes
    await this.feedService.fanOutPost(post.id, userId);

    return post;
  }

  async getPost(postId: string, currentUserId: string) {
    const post = await this.postsRepository.findPostById(postId);
    if (!post) throw new NotFoundException('Post not found');

    const isBlocked = await this.usersRepository.isBlocked(
      post.authorId,
      currentUserId,
    );
    if (isBlocked) throw new NotFoundException('Post not found');

    const [isLiked, isBookmarked] = await Promise.all([
      this.postsRepository.isLiked(currentUserId, postId),
      this.postsRepository.isBookmarked(currentUserId, postId),
    ]);

    return { ...post, isLiked, isBookmarked };
  }

  async getPostLikes(postId: string, dto: GetPostsDto) {
    const post = await this.postsRepository.findPostById(postId);
    if (!post) throw new NotFoundException('Post not found');

    const likes = await this.postsRepository.getPostLikes(
      postId,
      dto.limit ?? 10,
      dto.cursor,
    );

    const response = this.buildPaginatedResponse(
      likes,
      dto.limit ?? 10,
      (like) => this.postsRepository.encodeCursor(like.createdAt),
    );

    return {
      ...response,
      data: response.data.map((like) => like.user),
    };
  }

  async getUserPosts(
    username: string,
    currentUserId: string,
    dto: GetPostsDto,
  ) {
    const user = await this.usersRepository.findByUsername(username);
    if (!user) throw new NotFoundException('User not found');

    const isBlocked = await this.usersRepository.isBlocked(
      user.id,
      currentUserId,
    );
    if (isBlocked) throw new NotFoundException('User not found');

    const posts = await this.postsRepository.getUserPosts(
      user.id,
      dto.limit ?? 10,
      dto.cursor,
    );

    return this.buildPaginatedResponse(posts, dto.limit ?? 10, (post) =>
      this.postsRepository.encodeCursor(post.createdAt),
    );
  }

  async updatePost(postId: string, userId: string, dto: UpdatePostDto) {
    const post = await this.postsRepository.findPostById(postId);
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) throw new ForbiddenException('Not your post');

    return this.postsRepository.updatePost(postId, dto);
  }

  async deletePost(postId: string, userId: string) {
    const post = await this.postsRepository.findPostById(postId);
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) throw new ForbiddenException('Not your post');

    await this.postsRepository.deletePost(postId);

    // remove fan-out items and invalidate followers' feed caches
    await this.feedService.removeFanOutPost(postId, userId);

    return { message: 'Post deleted successfully' };
  }

  // ── Likes ──────────────────────────────────────────────
  async likePost(userId: string, postId: string) {
    const post = await this.postsRepository.findPostById(postId);
    if (!post) throw new NotFoundException('Post not found');

    await this.postsRepository.likePost(userId, postId);
    await this.notificationsService.notifyLikePost(userId, post.authorId, postId);
    return { message: 'Post liked' };
  }

  async unlikePost(userId: string, postId: string) {
    const post = await this.postsRepository.findPostById(postId);
    if (!post) throw new NotFoundException('Post not found');

    await this.postsRepository.unlikePost(userId, postId);
    await this.notificationsService.notifyUnlikePost(userId, postId);
    return { message: 'Post unliked' };
  }

  async likeComment(userId: string, commentId: string) {
    const comment = await this.postsRepository.findCommentById(commentId);
    if (!comment) throw new NotFoundException('Comment not found');

    await this.postsRepository.likeComment(userId, commentId);
    await this.notificationsService.notifyLikeComment(userId, comment.authorId, commentId);
    return { message: 'Comment liked' };
  }

  async unlikeComment(userId: string, commentId: string) {
    const comment = await this.postsRepository.findCommentById(commentId);
    if (!comment) throw new NotFoundException('Comment not found');

    await this.postsRepository.unlikeComment(userId, commentId);
    await this.notificationsService.notifyUnlikeComment(userId, commentId);
    return { message: 'Comment unliked' };
  }

  // ── Comments ───────────────────────────────────────────
  async createComment(userId: string, postId: string, dto: CreateCommentDto) {
    const post = await this.postsRepository.findPostById(postId);
    if (!post) throw new NotFoundException('Post not found');

    if (dto.parentCommentId) {
      const parent = await this.postsRepository.findCommentById(
        dto.parentCommentId,
      );
      if (!parent) throw new NotFoundException('Parent comment not found');
      await this.notificationsService.notifyReply(userId, parent.authorId, dto.parentCommentId);
    } else {
      await this.notificationsService.notifyComment(userId, post.authorId, postId);
    }

    return this.postsRepository.createComment({
      postId,
      authorId: userId,
      content: dto.content,
      parentCommentId: dto.parentCommentId ?? null,
    });
  }

  async getPostComments(postId: string, dto: GetPostsDto) {
    const post = await this.postsRepository.findPostById(postId);
    if (!post) throw new NotFoundException('Post not found');

    const comments = await this.postsRepository.getPostComments(
      postId,
      dto.limit ?? 10,
      dto.cursor,
    );

    return this.buildPaginatedResponse(comments, dto.limit ?? 10, (c) =>
      this.postsRepository.encodeCursor(c.createdAt),
    );
  }

  async getCommentReplies(commentId: string, dto: GetPostsDto) {
    const comment = await this.postsRepository.findCommentById(commentId);
    if (!comment) throw new NotFoundException('Comment not found');

    const replies = await this.postsRepository.getCommentReplies(
      commentId,
      dto.limit ?? 10,
      dto.cursor,
    );

    return this.buildPaginatedResponse(replies, dto.limit ?? 10, (r) =>
      this.postsRepository.encodeCursor(r.createdAt),
    );
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.postsRepository.findCommentById(commentId);
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId)
      throw new ForbiddenException('Not your comment');

    await this.postsRepository.deleteComment(commentId, comment.postId);
    return { message: 'Comment deleted' };
  }

  // ── Bookmarks ──────────────────────────────────────────
  async bookmarkPost(userId: string, postId: string) {
    const post = await this.postsRepository.findPostById(postId);
    if (!post) throw new NotFoundException('Post not found');

    await this.postsRepository.bookmarkPost(userId, postId);
    return { message: 'Post bookmarked' };
  }

  async unbookmarkPost(userId: string, postId: string) {
    const post = await this.postsRepository.findPostById(postId);
    if (!post) throw new NotFoundException('Post not found');

    await this.postsRepository.unbookmarkPost(userId, postId);
    return { message: 'Post removed from bookmarks' };
  }

  async getUserBookmarks(userId: string, dto: GetPostsDto) {
    const bookmarks = await this.postsRepository.getUserBookmarks(
      userId,
      dto.limit ?? 10,
      dto.cursor,
    );

    return this.buildPaginatedResponse(
      bookmarks.map((b) => b.post),
      dto.limit ?? 10,
      (post) => this.postsRepository.encodeCursor(post.createdAt),
    );
  }

  async getPostsByHashtag(hashtagName: string, dto: GetPostsDto) {
    const postHashtags = await this.postsRepository.getPostsByHashtag(
      hashtagName,
      dto.limit ?? 10,
      dto.cursor,
    );

    const response = this.buildPaginatedResponse(
      postHashtags,
      dto.limit ?? 10,
      (entry) => this.postsRepository.encodeCursor(entry.createdAt),
    );

    return {
      ...response,
      data: response.data.map((entry) => entry.post),
    };
  }
}
