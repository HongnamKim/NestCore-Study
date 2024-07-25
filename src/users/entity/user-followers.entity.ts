import { BaseModel } from '../../common/entity/base.entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { UsersModel } from './users.entity';

@Entity()
export class UserFollowersModel extends BaseModel {
  // 팔로우 신청한 사람
  @ManyToOne(() => UsersModel, (user) => user.followers)
  follower: UsersModel;

  // 팔로우의 대상
  @ManyToOne(() => UsersModel, (user) => user.followees)
  followee: UsersModel;

  @Column({ default: false })
  isConfirmed: boolean;
}
