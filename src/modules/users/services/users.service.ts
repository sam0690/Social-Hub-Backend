import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UsersRepository } from '../repositories/users.repository';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { SearchUsersDto } from '../dto/search-users.dto';

@Injectable()
export class UsersService {
  constructor(private usersRepository: UsersRepository) {}

  // ── Profile ────────────────────────────────────────────
  async getMyProfile(userId: string) {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const [followerCount, followingCount] = await Promise.all([
      this.usersRepository.getFollowerCount(user.id),
      this.usersRepository.getFollowingCount(user.id),
    ]);

    const { passwordHash, ...userWithoutPassword } = user;
    void passwordHash;

    return {
      ...userWithoutPassword,
      followerCount,
      followingCount,
    };
  }

  async getProfile(username: string, currentUserId: string) {
    const user = await this.usersRepository.findByUsername(username);
    if (!user) throw new NotFoundException('User not found');

    const isBlocked = await this.usersRepository.isBlocked(
      user.id,
      currentUserId,
    );
    if (isBlocked) throw new NotFoundException('User not found');

    const [isFollowing, followerCount, followingCount] = await Promise.all([
      this.usersRepository.isFollowing(currentUserId, user.id),
      this.usersRepository.getFollowerCount(user.id),
      this.usersRepository.getFollowingCount(user.id),
    ]);

    const { passwordHash, ...userWithoutPassword } = user;
    void passwordHash;

    return {
      ...userWithoutPassword,
      isFollowing,
      followerCount,
      followingCount,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.usersRepository.updateUser(userId, dto);
    const { passwordHash, ...userWithoutPassword } = user;
    void passwordHash;
    return userWithoutPassword;
  }

  async deleteAccount(userId: string) {
    await this.usersRepository.deleteUser(userId);
    return { message: 'Account deleted successfully' };
  }

  async searchUsers(dto: SearchUsersDto, currentUserId: string) {
    if (!dto.q || dto.q.trim().length < 1) {
      return [];
    }
    return this.usersRepository.searchUsers(
      dto.q.trim(),
      dto.limit ?? 10,
      dto.offset ?? 0,
      currentUserId,
    );
  }

  // ── Follows ────────────────────────────────────────────
  async followUser(currentUserId: string, username: string) {
    const target = await this.usersRepository.findByUsername(username);
    if (!target) throw new NotFoundException('User not found');

    if (target.id === currentUserId)
      throw new BadRequestException('You cannot follow yourself');

    const isBlocked = await this.usersRepository.isBlocked(
      target.id,
      currentUserId,
    );
    if (isBlocked) throw new NotFoundException('User not found');

    await this.usersRepository.follow(currentUserId, target.id);
    return { message: `Following ${username}` };
  }

  async unfollowUser(currentUserId: string, username: string) {
    const target = await this.usersRepository.findByUsername(username);
    if (!target) throw new NotFoundException('User not found');

    if (target.id === currentUserId)
      throw new BadRequestException('You cannot unfollow yourself');

    await this.usersRepository.unfollow(currentUserId, target.id);
    return { message: `Unfollowed ${username}` };
  }

  async getFollowers(username: string, limit = 10, offset = 0) {
    const user = await this.usersRepository.findByUsername(username);
    if (!user) throw new NotFoundException('User not found');

    const followers = await this.usersRepository.getFollowers(
      user.id,
      limit,
      offset,
    );
    return followers.map((f) => f.follower);
  }

  async getBlockedUsers(userId: string) {
    const results = await this.usersRepository.getBlockedUsers(userId);
    return results.map((r) => r.blocked);
  }

  async getMutedUsers(userId: string) {
    const results = await this.usersRepository.getMutedUsers(userId);
    return results.map((r) => r.muted);
  }

  async getFollowing(username: string, limit = 10, offset = 0) {
    const user = await this.usersRepository.findByUsername(username);
    if (!user) throw new NotFoundException('User not found');

    const following = await this.usersRepository.getFollowing(
      user.id,
      limit,
      offset,
    );
    return following.map((f) => f.following);
  }

  // ── Block ──────────────────────────────────────────────
  async blockUser(currentUserId: string, username: string) {
    const target = await this.usersRepository.findByUsername(username);
    if (!target) throw new NotFoundException('User not found');

    if (target.id === currentUserId)
      throw new BadRequestException('You cannot block yourself');

    await this.usersRepository.blockUser(currentUserId, target.id);
    return { message: `Blocked ${username}` };
  }

  async unblockUser(currentUserId: string, username: string) {
    const target = await this.usersRepository.findByUsername(username);
    if (!target) throw new NotFoundException('User not found');

    await this.usersRepository.unblockUser(currentUserId, target.id);
    return { message: `Unblocked ${username}` };
  }

  // ── Mute ───────────────────────────────────────────────
  async muteUser(currentUserId: string, username: string) {
    const target = await this.usersRepository.findByUsername(username);
    if (!target) throw new NotFoundException('User not found');

    if (target.id === currentUserId)
      throw new BadRequestException('You cannot mute yourself');

    await this.usersRepository.muteUser(currentUserId, target.id);
    return { message: `Muted ${username}` };
  }

  async unmuteUser(currentUserId: string, username: string) {
    const target = await this.usersRepository.findByUsername(username);
    if (!target) throw new NotFoundException('User not found');

    await this.usersRepository.unmuteUser(currentUserId, target.id);
    return { message: `Unmuted ${username}` };
  }
}
