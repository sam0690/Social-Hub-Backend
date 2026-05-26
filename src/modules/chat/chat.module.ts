import { Module } from '@nestjs/common';
import { ChatService } from './services/chat/chat.service';

@Module({
  providers: [ChatService]
})
export class ChatModule {}
