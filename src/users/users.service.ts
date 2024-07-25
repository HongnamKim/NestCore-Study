import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UsersModel } from './entity/users.entity';
import { Repository } from 'typeorm';
import { UserFollowersModel } from './entity/user-followers.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UsersModel)
    private readonly usersRepository: Repository<UsersModel>,
    @InjectRepository(UserFollowersModel)
    private readonly userFollowersRepository: Repository<UserFollowersModel>,
  ) {}

  async createUser(user: Pick<UsersModel, 'nickname' | 'email' | 'password'>) {
    const nicknameExists = await this.usersRepository.exists({
      where: { nickname: user.nickname },
    });

    if (nicknameExists) {
      throw new BadRequestException('이미 존재하는 닉네임 입니다.');
    }

    const emailExists = await this.usersRepository.exists({
      where: {
        email: user.email,
      },
    });

    if (emailExists) {
      throw new BadRequestException('이미 존재하는 이메일 입니다.');
    }

    const userObject = this.usersRepository.create({
      nickname: user.nickname,
      email: user.email,
      password: user.password,
    });

    const newUser = await this.usersRepository.save(userObject);

    return newUser;
  }

  async getAllUsers() {
    return this.usersRepository.find();
  }

  async getUserByEmail(email: string) {
    return this.usersRepository.findOne({
      where: {
        email,
      },
    });
  }

  // 나를 팔로우 하는 사람의 리스트
  async getFollowers(userId: number, includeNotConfirmed: boolean) {
    /*const user = await this.usersRepository.findOne({
      where: {
        id: userId,
      },
      relations: {
        followers: true,
      },
    });

    return user.followers;*/
    const where = {
      followee: {
        id: userId, // 팔로우의 대상, 나를 팔로우 하는 사람들
      },
      isConfirmed: !includeNotConfirmed ? true : null,
    };

    const result = await this.userFollowersRepository.find({
      where,
      relations: {
        followee: true,
        follower: true,
      },
    });

    // 팔로우 신청한 사람들만 return
    return result.map((x) => ({
      id: x.follower.id,
      nickname: x.follower.nickname,
      email: x.follower.email,
      isConfirmed: x.isConfirmed,
    }));
  }

  /**
   * @param followerId 팔로우 요청하는 사람 id
   * @param followeeId 팔로우 대상의 id
   */
  async followUser(followerId: number, followeeId: number) {
    /*const user = await this.usersRepository.findOne({
      where: { id: followerId },
      relations: {
        followees: true,
      },
    });

    if (!user) {
      throw new BadRequestException('존재하지 않는 팔로워입니다.');
    }

    await this.usersRepository.save({
      ...user,
      followees: [
        ...user.followees,
        {
          id: followeeId,
        },
      ],
    });*/
    const result: UserFollowersModel = await this.userFollowersRepository.save({
      follower: {
        id: followerId,
      },
      followee: {
        id: followeeId,
      },
    });

    return true;
  }

  async confirmFollow(followerId: number, followeeId: number) {
    const existing = await this.userFollowersRepository.findOne({
      where: {
        follower: { id: followerId },
        followee: { id: followeeId },
      },
      relations: {
        followee: true,
        follower: true,
      },
    });

    if (!existing) {
      throw new BadRequestException('존재하지 않는 팔로우 요청입니다.');
    }

    await this.userFollowersRepository.save({
      ...existing,
      isConfirmed: true,
    });

    return true;
  }

  async deleteFollow(followerId: number, followeeId: number) {
    await this.userFollowersRepository.delete({
      follower: {
        id: followerId,
      },
      followee: {
        id: followeeId,
      },
    });

    return true;
  }
}
