import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CreateChatDto } from './dto/create-chat.dto';
import { ChatsService } from './chats.service';
import { EnterChatDto } from './dto/enter-chat.dto';
import { CreateMessagesDto } from './messages/dto/create-messages.dto';
import { ChatsMessagesService } from './messages/messages.service';
import {
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SocketCatchHttpExceptionFilter } from '../common/exception-filter/socket-catch-http.exception-filter';
import { SocketBearerTokenGuard } from '../auth/guard/socket/socket-bearer-token.guard';
import { UsersModel } from '../users/entity/users.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from '../auth/auth.service';
import * as console from 'node:console';

@WebSocketGateway({
  // ws://localhost:3000/chats
  namespace: 'chats',
})
@UsePipes(
  new ValidationPipe({
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
@UseFilters(SocketCatchHttpExceptionFilter)
export class ChatsGateway
  implements OnGatewayConnection, OnGatewayInit, OnGatewayDisconnect
{
  constructor(
    private readonly chatsService: ChatsService,
    private readonly messagesService: ChatsMessagesService,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @WebSocketServer()
  server: Server; // WebSocket 서버 객체

  afterInit(server: any): any {
    // gateway 가 초기화 되고 실행되는 메소드
    console.log(`after gateway init`);
  }

  handleDisconnect(client: any): any {}

  // 클라이언트에서 연결됐을 때 실행됨
  async handleConnection(socket: Socket & { user: UsersModel }) {
    console.log(`on connect called : ${socket.id}`);
    const headers = socket.handshake.headers;

    // Bearer xxxxx
    const rawToken = headers['authorization'];

    if (!rawToken) {
      socket.disconnect();
      //throw new WsException('토큰이 없습니다.');
    }

    try {
      const token = this.authService.extractTokenFromHeader(rawToken, true);

      const payload = this.authService.verifyToken(token);

      const user = await this.usersService.getUserByEmail(payload.email);

      socket.user = user;

      return true;
    } catch (e) {
      socket.disconnect();
    }
  }

  @SubscribeMessage('create_chat')
  async createChat(
    @MessageBody() data: CreateChatDto,
    @ConnectedSocket() socket: Socket & { user: UsersModel },
  ) {
    const chat = await this.chatsService.createChat(data);
    return chat;
  }

  @SubscribeMessage('enter_chat')
  async enterChat(
    // room 의 chat id 를 리스트로 받는다.
    @MessageBody() data: EnterChatDto,
    @ConnectedSocket() socket: Socket & { user: UsersModel }, // 현재 연결된 소켓
  ) {
    /*for (const chatId of data) {
      //socket.join 으로 room 에 들어갈 수 있다.
      socket.join(chatId.toString()); // room 의 id 는 string 타입

      this.server
        .in(chatId.toString())
        .emit('enter_alert', `${socket.id} enter chatId ${chatId}`);
    }*/
    // chat 존재여부 확인
    for (const chatId of data.chatIds) {
      const exists = await this.chatsService.checkIfChatExists(chatId);

      if (!exists) {
        throw new WsException({
          code: 100,
          message: `존재하지 않는 chat 입니다. chatId: ${chatId}`,
        });
      }
    }

    // chat 에 join
    socket.join(data.chatIds.map((x) => x.toString()));
  }

  /*@SubscribeMessage('send_message_room')
  sendMessageToRoom(
    @MessageBody() message: { message: string; chatId: number },
  ) {
    this.server
      .in(message.chatId.toString())
      .emit('receive_message_room', message.message);
  }*/

  // socket.on('send_message', (message) => console.log(message)
  @SubscribeMessage('send_message')
  async sendMessage(
    @MessageBody() dto: CreateMessagesDto,
    @ConnectedSocket() socket: Socket & { user: UsersModel },
  ) {
    /*
    this.server
      .in(message.chatId.toString())
      .emit('receive_message', message.message);
    */
    const chatExists = await this.chatsService.checkIfChatExists(dto.chatId);

    if (!chatExists) {
      throw new WsException({
        code: 100,
        message: `존재하지 않는 chat 입니다. chatId: ${dto.chatId}`,
      });
    }

    const message = await this.messagesService.createMessage(
      dto,
      socket.user.id,
    );

    socket.to(message.chat.id.toString()).emit('receive_message', {
      message: message.message,
      author: message.author.nickname,
    });
  }
}
