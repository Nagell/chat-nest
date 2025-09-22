import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsString,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class SendMessageDto {
  @IsNumber({}, { message: 'Session ID must be a valid number' })
  @Transform(({ value }) => parseInt(value, 10))
  session_id: number;

  @IsString()
  @IsNotEmpty({ message: 'Message content cannot be empty' })
  @MinLength(1, { message: 'Message must be longer than 1 characters' })
  @Transform(({ value }) => value.trim())
  content: string;

  @IsString()
  @IsIn(['visitor', 'admin'], {
    message: 'Sender type must be either "visitor" or "admin"',
  })
  sender_type: 'visitor' | 'admin';
}
