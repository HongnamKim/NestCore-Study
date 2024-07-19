import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
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

@WebSocketGateway({
  // ws://localhost:3000/chats
  namespace: 'chats',
})
export class ChatsGateway implements OnGatewayConnection {
  constructor(
    private readonly chatsService: ChatsService,
    private readonly messagesService: ChatsMessagesService,
  ) {}

  @WebSocketServer()
  server: Server; // WebSocket 서버 객체

  // 클라이언트에서 연결됐을 때 실행됨
  handleConnection(socket: Socket): any {
    console.log(`on connect called : ${socket.id}`);
  }

  @SubscribeMessage('create_chat')
  async createChat(
    @MessageBody() data: CreateChatDto,
    @ConnectedSocket() socket: Socket,
  ) {
    const chat = await this.chatsService.createChat(data);
    return chat;
  }

  @SubscribeMessage('enter_chat')
  async enterChat(
    // room 의 chat id 를 리스트로 받는다.
    @MessageBody() data: EnterChatDto,
    @ConnectedSocket() socket: Socket, // 현재 연결된 소켓
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
    @ConnectedSocket() socket: Socket,
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

    const message = await this.messagesService.createMessage(dto);

    socket.to(message.chat.id.toString()).emit('receive_message', {
      message: message.message,
      author: message.author.nickname,
    });
  }
}
