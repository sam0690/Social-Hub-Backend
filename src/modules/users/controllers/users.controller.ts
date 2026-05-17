import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
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
import { UsersService } from '../services/users.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { SearchUsersDto } from '../dto/search-users.dto';
import { ApiAuthEndpoint } from '../../../common/decorators/swagger.decorators';

type AuthRequest<TUser = { id: string }> = Request & {
  user: TUser;
};

@ApiTags('Users')
@UseGuards(JwtAuthGuard)
@Controller('api/v1/users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // ── Profile ────────────────────────────────────────────
  @Get('me')
  @ApiAuthEndpoint('Get own profile', { ok: 'Own profile with stats' })
  async getMyProfile(@Req() req: AuthRequest) {
    return this.usersService.getMyProfile(req.user.id);
  }

  @Get('search')
  @ApiAuthEndpoint('Search users', { ok: 'List of matching users' })
  async searchUsers(@Query() dto: SearchUsersDto, @Req() req: AuthRequest) {
    return this.usersService.searchUsers(dto, req.user.id);
  }

  @Get('me/blocked')
  @ApiAuthEndpoint('Get my blocked users', { ok: 'List of blocked users' })
  async getBlockedUsers(@Req() req: AuthRequest) {
    return this.usersService.getBlockedUsers(req.user.id);
  }

  @Get('me/muted')
  @ApiAuthEndpoint('Get my muted users', { ok: 'List of muted users' })
  async getMutedUsers(@Req() req: AuthRequest) {
    return this.usersService.getMutedUsers(req.user.id);
  }

  @Get(':username')
  @ApiAuthEndpoint('Get user profile by username', {
    ok: 'User profile',
    notFound: 'User not found',
  })
  async getProfile(
    @Param('username') username: string,
    @Req() req: AuthRequest,
  ) {
    return this.usersService.getProfile(username, req.user.id);
  }

  @Patch('me')
  @ApiAuthEndpoint('Update own profile', { ok: 'Updated profile' })
  async updateProfile(@Body() dto: UpdateProfileDto, @Req() req: AuthRequest) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiAuthEndpoint('Delete own account', { ok: 'Account deleted' })
  async deleteAccount(@Req() req: AuthRequest) {
    return this.usersService.deleteAccount(req.user.id);
  }

  // ── Follows ────────────────────────────────────────────
  @Post(':username/follow')
  @HttpCode(HttpStatus.OK)
  @ApiAuthEndpoint('Follow a user', {
    ok: 'Followed successfully',
    notFound: 'User not found',
    badRequest: 'Cannot follow yourself',
  })
  async followUser(
    @Param('username') username: string,
    @Req() req: AuthRequest,
  ) {
    return this.usersService.followUser(req.user.id, username);
  }

  @Delete(':username/follow')
  @HttpCode(HttpStatus.OK)
  @ApiAuthEndpoint('Unfollow a user', {
    ok: 'Unfollowed successfully',
    notFound: 'User not found',
  })
  async unfollowUser(
    @Param('username') username: string,
    @Req() req: AuthRequest,
  ) {
    return this.usersService.unfollowUser(req.user.id, username);
  }

  @Get(':username/followers')
  @ApiAuthEndpoint('Get followers of a user', { ok: 'List of followers' })
  async getFollowers(
    @Param('username') username: string,
    @Query('limit') limit = 10,
    @Query('offset') offset = 0,
  ) {
    return this.usersService.getFollowers(username, +limit, +offset);
  }

  @Get(':username/following')
  @ApiAuthEndpoint('Get following of a user', { ok: 'List of following' })
  async getFollowing(
    @Param('username') username: string,
    @Query('limit') limit = 10,
    @Query('offset') offset = 0,
  ) {
    return this.usersService.getFollowing(username, +limit, +offset);
  }

  // ── Block ──────────────────────────────────────────────
  @Post(':username/block')
  @HttpCode(HttpStatus.OK)
  @ApiAuthEndpoint('Block a user', {
    ok: 'Blocked successfully',
    notFound: 'User not found',
    badRequest: 'Cannot block yourself',
  })
  async blockUser(
    @Param('username') username: string,
    @Req() req: AuthRequest,
  ) {
    return this.usersService.blockUser(req.user.id, username);
  }

  @Delete(':username/block')
  @HttpCode(HttpStatus.OK)
  @ApiAuthEndpoint('Unblock a user', { ok: 'Unblocked successfully' })
  async unblockUser(
    @Param('username') username: string,
    @Req() req: AuthRequest,
  ) {
    return this.usersService.unblockUser(req.user.id, username);
  }

  // ── Mute ───────────────────────────────────────────────
  @Post(':username/mute')
  @HttpCode(HttpStatus.OK)
  @ApiAuthEndpoint('Mute a user', {
    ok: 'Muted successfully',
    notFound: 'User not found',
    badRequest: 'Cannot mute yourself',
  })
  async muteUser(@Param('username') username: string, @Req() req: AuthRequest) {
    return this.usersService.muteUser(req.user.id, username);
  }

  @Delete(':username/mute')
  @HttpCode(HttpStatus.OK)
  @ApiAuthEndpoint('Unmute a user', { ok: 'Unmuted successfully' })
  async unmuteUser(
    @Param('username') username: string,
    @Req() req: AuthRequest,
  ) {
    return this.usersService.unmuteUser(req.user.id, username);
  }
}
