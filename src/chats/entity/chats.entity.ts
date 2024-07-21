import { Entity, ManyToMany, OneToMany } from 'typeorm';
import { BaseModel } from '../../common/entity/base.entity';
import { UsersModel } from '../../users/entity/users.entity';
import { MessagesModel } from '../messages/entity/messages.entity';

@Entity()
export class ChatsModel extends BaseModel {
  @ManyToMany(() => UsersModel, (user) => user.chats)
  users: UsersModel[];

  @OneToMany(() => MessagesModel, (message) => message.chat)
  messages: MessagesModel[];
}
