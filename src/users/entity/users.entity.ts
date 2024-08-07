import { Column, Entity, JoinTable, ManyToMany, OneToMany } from 'typeorm';
import { RolesEnum } from '../const/roles.const';
import { PostsModel } from '../../posts/entity/posts.entity';
import { BaseModel } from '../../common/entity/base.entity';
import { IsEmail, IsString, Length } from 'class-validator';
import { lengthValidationMessage } from '../../common/validation-message/length-validation.message';
import { stringValidationMessage } from '../../common/validation-message/string-validation.message';
import { emailValidationMessage } from '../../common/validation-message/email-validation.message';
import { Exclude, Expose } from 'class-transformer';
import { ChatsModel } from '../../chats/entity/chats.entity';
import { MessagesModel } from '../../chats/messages/entity/messages.entity';
import { CommentsModel } from '../../posts/comments/entity/comments.entity';
import { UserFollowersModel } from './user-followers.entity';

@Entity()
export class UsersModel extends BaseModel {
  @Column({
    length: 20,
    unique: true,
  })
  @IsString({ message: stringValidationMessage })
  @Length(1, 20, {
    //message: '닉네임은 1~20자 사이로 입력해야합니다.',
    message: lengthValidationMessage,
  })
  // 1) 길이가 20을 넘지 않을 것
  // 2) unique 한 값
  nickname: string;

  /*@Expose()
  get nicknameAndEmail() {
    return this.nickname + '/' + this.email;
  }*/

  @Column({
    // 1) unique 한 값
    unique: true,
  })
  @IsString({ message: stringValidationMessage })
  @IsEmail({}, { message: emailValidationMessage })
  email: string;

  @Column()
  @IsString({ message: stringValidationMessage })
  @Length(3, 8, { message: lengthValidationMessage })
  @Exclude({ toPlainOnly: true })
  password: string;

  @Column({
    enum: Object.values(RolesEnum),
    default: RolesEnum.USER,
  })
  role: RolesEnum;

  @Column({ default: 0 })
  followerCount: number;

  @Column({ default: 0 })
  followeeCount: number;

  // 작성 post
  @OneToMany(() => PostsModel, (post) => post.author)
  posts: PostsModel[];

  // 참여 중인 chatting
  @ManyToMany(() => ChatsModel, (chats) => chats.users)
  @JoinTable()
  chats: ChatsModel[];

  // 보낸 chatting message
  @OneToMany(() => MessagesModel, (message) => message.author)
  messages: MessagesModel[];

  // 작성 댓글
  @OneToMany(() => CommentsModel, (comment) => comment.author)
  postComments: CommentsModel[];

  // 내가 팔로우 하는 사람
  @OneToMany(() => UserFollowersModel, (ufm) => ufm.follower)
  followers: UserFollowersModel[];

  // 나를 팔로우 하는 사람
  @OneToMany(() => UserFollowersModel, (ufm) => ufm.followee)
  followees: UserFollowersModel[];
}
