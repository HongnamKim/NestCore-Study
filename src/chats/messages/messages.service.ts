import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MessagesModel } from './entity/messages.entity';
import { FindManyOptions, Repository } from 'typeorm';
import { CommonService } from '../../common/common.service';
import { BasePaginationDto } from '../../common/dto/base-pagination.dto';
import { CreateMessagesDto } from './dto/create-messages.dto';

@Injectable()
export class ChatsMessagesService {
  constructor(
    @InjectRepository(MessagesModel)
    private readonly messagesRepository: Repository<MessagesModel>,
    private readonly commonService: CommonService,
  ) {}

  async createMessage(dto: CreateMessagesDto, authorId: number) {
    const message: MessagesModel = await this.messagesRepository.save({
      chat: {
        // 1:N 관계로 묶어놨기 때문에 primary key 로 관계를 맺어줄 수 있음
        id: dto.chatId,
      },
      author: {
        id: authorId,
      },
      message: dto.message,
    });

    //return message;
    return this.messagesRepository.findOne({
      where: {
        id: message.id,
      },
      relations: {
        chat: true,
        author: true,
      },
    });
  }

  paginateMessages(
    dto: BasePaginationDto,
    overrideFindOptions: FindManyOptions<MessagesModel>,
  ) {
    return this.commonService.paginate(
      dto,
      this.messagesRepository,
      overrideFindOptions,
      'messages',
    );
  }
}
